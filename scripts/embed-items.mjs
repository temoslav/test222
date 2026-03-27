#!/usr/bin/env node

// Generate content vectors for items using Voyage AI
// Uses voyage-large-2 model for 1536-dimensional embeddings

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

// Initialize Supabase admin client
const adminClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function embedItems() {
  try {
    console.log('🧠 Starting items content vector generation...');
    
    // STEP 1: Fetch all items without content_vector using pagination
    console.log('📖 Fetching items without content vectors...');
    let allItems = [];
    let from = 0;
    const pageSize = 500;
    
    while (true) {
      const { data, error } = await adminClient
        .from('items')
        .select('id, title, description, category, subcategory, type, city')
        .is('content_vector', null)
        .eq('is_active', true)
        .range(from, from + pageSize - 1);
      
      if (error) {
        console.error('❌ Error fetching items:', error);
        throw error;
      }
      
      if (!data || data.length === 0) break;
      
      allItems = allItems.concat(data);
      console.log(`📄 Fetched ${data.length} items (total: ${allItems.length})`);
      
      if (data.length < pageSize) break;
      from += pageSize;
    }
    
    console.log(`📊 Total items to embed: ${allItems.length}`);
    
    if (allItems.length === 0) {
      console.log('✅ No items need embedding');
      return;
    }
    
    // STEP 2: Build input strings for each item
    const inputs = allItems.map(item => {
      const input = [
        item.title,
        item.description,
        item.category,
        item.subcategory,
        item.type,
        item.city
      ].filter(Boolean).join(' ');
      return input;
    });
    
    console.log('📝 Built input strings for all items');
    
    // STEP 3: Generate embeddings in batches of 100
    const batchSize = 100;
    const totalBatches = Math.ceil(inputs.length / batchSize);
    let embeddedCount = 0;
    
    for (let batchNumber = 0; batchNumber < totalBatches; batchNumber++) {
      const startIndex = batchNumber * batchSize;
      const endIndex = Math.min(startIndex + batchSize, inputs.length);
      const batchInputs = inputs.slice(startIndex, endIndex);
      const batchItems = allItems.slice(startIndex, endIndex);
      
      console.log(`🔢 Processing batch ${batchNumber + 1}/${totalBatches} (${batchInputs.length} items)`);
      
      try {
        const response = await fetch(VOYAGE_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VOYAGE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'voyage-large-2',
            input: batchInputs
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          if (response.status === 429) {
            console.log('⏳ Rate limited, waiting 5s...');
            await delay(5000);
            console.log(`🔄 Retrying batch ${batchNumber + 1}/${totalBatches}...`);
            batchNumber--; // retry this batch
            continue;
          }
          
          console.error(`❌ Voyage API error for batch ${batchNumber + 1}:`, errorData);
          throw new Error(`Voyage API error: ${response.status}`);
        }
        
        const voyageData = await response.json();
        const embeddings = voyageData.data.map(item => item.embedding);
        
        // STEP 4: Update items in DB using Promise.all in chunks of 50
        const updateChunkSize = 50;
        for (let j = 0; j < batchItems.length; j += updateChunkSize) {
          const updateBatch = batchItems.slice(j, j + updateChunkSize);
          const updateEmbeddings = embeddings.slice(j, j + updateChunkSize);
          
          // Batch update using Promise.all for faster performance
          const updatePromises = updateBatch.map((item, k) => 
            adminClient
              .from('items')
              .update({ content_vector: updateEmbeddings[k] })
              .eq('id', item.id)
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
              await delay(5000);
              j -= updateChunkSize; // retry this chunk
              continue;
            }
            
            updateResults.forEach((result, idx) => {
              if (result.error) {
                console.error(`❌ Error updating item ${updateBatch[idx].id}:`, result.error.message.substring(0, 100));
              }
            });
            throw new Error('Batch update failed');
          }
          
          embeddedCount += updateBatch.length;
          console.log(`✅ Embedded ${embeddedCount}/${allItems.length} items...`);
        }
        
        // STEP 5: Add delay between API calls
        if (batchNumber < totalBatches - 1) {
          console.log('⏳ Waiting 100ms before next batch...');
          await delay(100);
        }
        
      } catch (apiError) {
        if (apiError.message.includes('Voyage API error: 429')) {
          console.log('⏳ Rate limited, waiting 5s...');
          await delay(5000);
          console.log(`🔄 Retrying batch ${batchNumber + 1}/${totalBatches}...`);
          batchNumber--; // retry this batch
          continue;
        }
        if (apiError.code === 'ETIMEDOUT' || apiError.message.includes('fetch failed')) {
          console.log('🌐 Network timeout, waiting 5s...');
          await delay(5000);
          console.log(`🔄 Retrying batch ${batchNumber + 1}/${totalBatches}...`);
          batchNumber--; // retry this batch
          continue;
        }
        throw apiError;
      }
    }
    
    console.log(`🎉 Successfully embedded ${embeddedCount} items!`);
    
    // STEP 6: Final verification
    console.log('🔍 Running verification queries...');
    
    const { count: embeddedItems } = await adminClient
      .from('items')
      .select('*', { count: 'exact', head: true })
      .not('content_vector', 'is', null)
      .eq('is_active', true);
    
    const { count: totalActiveItems } = await adminClient
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    console.log(`📊 ITEMS EMBEDDING RESULTS:`);
    console.log(`Items with embeddings: ${embeddedItems}`);
    console.log(`Total active items: ${totalActiveItems}`);
    console.log(`Coverage: ${((embeddedItems / totalActiveItems) * 100).toFixed(1)}%`);
    console.log('🎉 Items embedding completed successfully!');
    
  } catch (error) {
    console.error('❌ Items embedding failed:', error.message);
    process.exit(1);
  }
}

// Run the embedding
embedItems();
