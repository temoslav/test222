#!/usr/bin/env node

// Generate semantic embeddings for taxonomy tags using Voyage AI
// Rebuild tag_relations using pgvector similarity

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (same pattern as sync-kudago.mjs)
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const VOYAGE_API_KEY = env.VOYAGE_API_KEY;
const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-large-2'; // 1536 dimensions, matches DB column

// Create Supabase admin client
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function embedTaxonomy() {
  try {
    console.log('🧠 Starting taxonomy embedding generation...');
    
    // Step 1: Fetch all tags without embeddings
    console.log('📖 Fetching tags without semantic vectors...');
    const { data: tags, error } = await supabase
      .from('tags')
      .select('id, slug, tag, category, domain, cluster, tag_type')
      .is('semantic_vector', 'null')
      .not('domain', 'is', 'null')
      .order('id')
      .range(0, 1500);
    
    if (error) {
      console.error('❌ Error fetching tags:', error);
      throw error;
    }
    
    console.log(`📊 Found ${tags.length} tags to embed`);
    
    // Step 2: Generate embeddings in batches of 128
    const batchSize = 128;
    const totalBatches = Math.ceil(tags.length / batchSize);
    let embeddedCount = 0;
    
    for (let i = 0; i < tags.length; i += batchSize) {
      const batch = tags.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`🔢 Processing batch ${batchNumber}/${totalBatches} (${batch.length} tags)`);
      
      // Prepare input strings for Voyage API
      const inputs = batch.map(tag => {
        const parts = [tag.tag, tag.category, tag.domain, tag.cluster].filter(Boolean);
        return parts.join(' ');
      });
      
      try {
        // Call Voyage API
        const response = await fetch(VOYAGE_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VOYAGE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: MODEL,
            input: inputs
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Voyage API error for batch ${batchNumber}:`, errorData);
          throw new Error(`Voyage API error: ${response.status}`);
        }
        
        const voyageData = await response.json();
        const embeddings = voyageData.data.map(item => item.embedding);
        
        // Update tags with embeddings in chunks of 50 using Promise.all
        const updateChunkSize = 50;
        for (let j = 0; j < batch.length; j += updateChunkSize) {
          const updateBatch = batch.slice(j, j + updateChunkSize);
          const updateChunkNumber = Math.floor(j / updateChunkSize) + 1;
          
          // Batch update using Promise.all for faster performance
          const updatePromises = updateBatch.map((tag, k) => 
            supabase
              .from('tags')
              .update({ semantic_vector: embeddings[j + k] })
              .eq('id', tag.id)
          );
          
          const updateResults = await Promise.all(updatePromises);
          
          // Check for errors and retry on database issues
          const hasError = updateResults.some(result => result.error);
          if (hasError) {
            const dbErrors = updateResults.filter(r => r.error);
            const isRetryable = dbErrors.some(r => 
              r.error.message.includes('502') || 
              r.error.message.includes('timeout') ||
              r.error.message.includes('Bad gateway')
            );
            
            if (isRetryable) {
              console.log('🗄️ Database error, waiting 5s and retrying...');
              await new Promise(r => setTimeout(r, 5000));
              j -= updateChunkSize; // retry this chunk
              continue;
            }
            
            updateResults.forEach((result, idx) => {
              if (result.error) {
                console.error(`❌ Error updating tag ${updateBatch[idx].slug}:`, result.error.message.substring(0, 100));
              }
            });
            throw new Error('Batch update failed');
          }
          
          embeddedCount += updateBatch.length;
          console.log(`✅ Embedded ${embeddedCount}/${tags.length} tags...`);
        }
        
        // Add delay between API calls
        if (batchNumber < totalBatches) {
          console.log('⏳ Waiting 3s before next batch...');
          await delay(3000);
        }
        
      } catch (apiError) {
        if (apiError.message.includes('Voyage API error: 429')) {
          console.log('⏳ Rate limited, waiting 30s...');
          await new Promise(r => setTimeout(r, 30000));
          console.log(`🔄 Retrying batch ${batchNumber}/${totalBatches}...`);
          continue; // retry the same batch
        }
        if (apiError.code === 'ETIMEDOUT' || apiError.message.includes('fetch failed')) {
          console.log('🌐 Network timeout, waiting 10s...');
          await new Promise(r => setTimeout(r, 10000));
          console.log(`🔄 Retrying batch ${batchNumber}/${totalBatches}...`);
          continue; // retry the same batch
        }
        throw apiError;
      }
    }
    
    console.log(`🎉 Successfully embedded ${embeddedCount} tags!`);
    
    // Step 3: Rebuild tag_relations using semantic similarity
    console.log('🔄 Rebuilding tag relations using semantic similarity...');
    
    // Delete existing relations
    const { error: deleteError } = await supabase
      .from('tag_relations')
      .delete()
      .neq('tag_slug', 'dummy'); // Delete all
    
    if (deleteError) {
      console.error('❌ Error deleting existing relations:', deleteError);
      throw deleteError;
    }
    
    console.log('🗑️ Cleared existing tag relations');
    
    // Insert semantic relations using pgvector
    console.log('🔗 Building semantic relations based on vector similarity...');
    
    const similaritySQL = `
      INSERT INTO tag_relations (tag_slug, related_tag_slug, relation_type, strength)
      SELECT 
        a.slug,
        b.slug,
        'similar',
        ROUND((1 - (a.semantic_vector <=> b.semantic_vector))::numeric, 3)
      FROM tags a
      CROSS JOIN tags b
      WHERE a.slug != b.slug
      AND a.domain IS NOT NULL
      AND b.domain IS NOT NULL
      AND a.semantic_vector IS NOT NULL
      AND b.semantic_vector IS NOT NULL
      AND 1 - (a.semantic_vector <=> b.semantic_vector) > 0.82
      ON CONFLICT DO NOTHING;
    `;
    
    // Use raw SQL execution via Postgres client
    let insertError = null;
    try {
      const { error } = await supabase.rpc('exec', { sql: similaritySQL });
      insertError = error;
    } catch (err) {
      insertError = err;
    }
    
    if (insertError) {
      console.log('ℹ️ Could not execute relations SQL via RPC, skipping relations rebuild');
      console.log('📊 Relations can be rebuilt manually with the SQL above');
    } else {
      console.log('🔗 Built semantic relations based on vector similarity');
    }
    
    // Step 4: Final verification
    console.log('🔍 Running verification queries...');
    
    const { count: embeddedTagsCount } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true })
      .not('semantic_vector', 'is', 'null');
    
    const { count: relationsCount } = await supabase
      .from('tag_relations')
      .select('*', { count: 'exact', head: true });
    
    const { data: relationTypes } = await supabase
      .from('tag_relations')
      .select('relation_type')
      .then(({ data }) => {
        const types = {};
        if (data) {
          data.forEach(r => {
            types[r.relation_type] = (types[r.relation_type] || 0) + 1;
          });
        }
        return types;
      });
    
    const { data: topConnected } = await supabase
      .from('tag_relations')
      .select('tag_slug')
      .then(({ data }) => {
        const connections = {};
        if (data) {
          data.forEach(r => {
            connections[r.tag_slug] = (connections[r.tag_slug] || 0) + 1;
          });
          return Object.entries(connections)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        }
        return [];
      });
    
    console.log('\n📊 EMBEDDING RESULTS:');
    console.log(`Tags with embeddings: ${embeddedTagsCount}`);
    console.log(`Tag relations created: ${relationsCount}`);
    console.log('\n📈 Relation types:');
    if (relationTypes && Object.keys(relationTypes).length > 0) {
      Object.entries(relationTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    } else {
      console.log('  No relations found');
    }
    
    console.log('\n🏆 Top 5 most connected tags:');
    if (topConnected && topConnected.length > 0) {
      topConnected.forEach(([tag, connections], i) => {
        console.log(`  ${i+1}. ${tag}: ${connections} connections`);
      });
    } else {
      console.log('  No connections found');
    }
    
    console.log('\n🎉 Taxonomy embedding completed successfully!');
    
  } catch (error) {
    console.error('❌ Taxonomy embedding failed:', error);
    process.exit(1);
  }
}

// Run the embedding process
embedTaxonomy();
