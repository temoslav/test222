#!/usr/bin/env node

// Enrich items using GLM-4.5-Flash API with semantic tag matching
// Writes results to content_tags table and updates items fields

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

// CONFIG
const ZHAI_API_KEY = env.ZHAI_API_KEY;
const ZHAI_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const MODEL = 'glm-4.5-flash';
const CONCURRENCY = 2;
const BATCH_LIMIT = 1000;
const MAX_TOKENS = 400;

// Initialize Supabase admin client
const adminClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// System message for GLM API
const SYSTEM_MESSAGE = `You are a content tagging expert for a discovery app.
Return ONLY raw JSON. No markdown. No code blocks. No explanation.
First character of response must be {`;

// Valid moods, categories, and price tiers
const VALID_MOODS = ['energetic','relaxed','romantic','intellectual','social','creative','adventurous','nostalgic','playful','luxurious','spiritual','rebellious','peaceful','intense','educational','family','festive','mysterious','intimate'];
const VALID_CATEGORIES = ['lifestyle','health','entertainment','creativity','food','technology','business','career','finance','sports','mobility','relationships','home','sustainability','luxury','social_impact','learning'];
const VALID_PRICE_TIERS = ['free','budget','medium','premium','luxury'];

// STEP 1: Fetch unenriched items
async function fetchUnenrichedItems() {
  console.log('📖 Fetching unenriched items...');
  
  // First, get all enriched content_ids to exclude them
  const { data: enrichedContent } = await adminClient
    .from('content_tags')
    .select('content_id')
    .eq('content_type', 'event');
  
  const enrichedIds = new Set(enrichedContent?.map(ct => ct.content_id) || []);
  
  // Get items with content_vector that aren't enriched
  const { data: items, error } = await adminClient
    .from('items')
    .select('id, title, description, category, type, price, city')
    .eq('is_active', true)
    .not('content_vector', 'is', null)
    .limit(BATCH_LIMIT);
  
  if (error) {
    console.error('❌ Error fetching items:', error);
    throw error;
  }
  
  // Filter out already enriched items
  const unenrichedItems = items.filter(item => !enrichedIds.has(item.id));
  
  console.log(`📊 Found ${unenrichedItems.length} unenriched items (limit: ${BATCH_LIMIT})`);
  return unenrichedItems.slice(0, BATCH_LIMIT);
}

// STEP 2: Get similar tags for an item
async function getSimilarTags(itemId) {
  try {
    const { data, error } = await adminClient.rpc('get_similar_tags', {
      item_id: itemId,
      tag_limit: 30
    });
    
    if (error) {
      console.error('❌ Error getting similar tags:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('❌ RPC call failed for similar tags:', e.message);
    return [];
  }
}

// STEP 3: Build prompt and call GLM API
async function callGLMAPI(title, description, type, category, city, price, similarTags) {
  const tagsList = similarTags.map(t => `${t.slug}: ${t.tag}`).join('\n');
  
  const userMessage = `Tag this content:
Title: ${title}
Description: ${description}
Type: ${type}
Category: ${category}
City: ${city}
Price: ${price} RUB

Select 5-8 most relevant tags from this list:
${tagsList}

Return ONLY this JSON:
{
  "tags": [{"tag_slug": "slug", "confidence": 0.95}],
  "mood": "one of: energetic|relaxed|romantic|intellectual|social|creative|adventurous|nostalgic|playful|luxurious|spiritual|rebellious|peaceful|intense|educational|family|festive|mysterious|intimate",
  "category_slug": "one of: lifestyle|health|entertainment|creativity|food|technology|business|career|finance|sports|mobility|relationships|home|sustainability|luxury|social_impact|learning",
  "price_tier": "one of: free|budget|medium|premium|luxury"
}`;

  const response = await fetch(ZHAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZHAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      thinking: { type: 'disabled' },
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.log('⏳ Rate limited, waiting 5s...');
      await delay(5000);
      // Retry once
      const retryResponse = await fetch(ZHAI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ZHAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          thinking: { type: 'disabled' },
          max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: SYSTEM_MESSAGE },
            { role: 'user', content: userMessage }
          ]
        })
      });
      
      if (!retryResponse.ok) {
        throw new Error(`GLM API error after retry: ${retryResponse.status}`);
      }
      
      return await retryResponse.json();
    }
    throw new Error(`GLM API error: ${response.status}`);
  }

  return await response.json();
}

// STEP 4: Parse and validate response
function parseResponse(data) {
  try {
    const text = data.choices[0].message.content
      .replace(/```json|```/g, '').trim();
    
    const result = JSON.parse(text);
    
    // Validate structure
    if (!Array.isArray(result.tags) || result.tags.length === 0) {
      throw new Error('Invalid tags array');
    }
    
    if (!VALID_MOODS.includes(result.mood)) {
      throw new Error(`Invalid mood: ${result.mood}`);
    }
    
    if (!VALID_CATEGORIES.includes(result.category_slug)) {
      throw new Error(`Invalid category_slug: ${result.category_slug}`);
    }
    
    if (!VALID_PRICE_TIERS.includes(result.price_tier)) {
      throw new Error(`Invalid price_tier: ${result.price_tier}`);
    }
    
    return result;
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}`);
  }
}

// STEP 5: Write to database
async function saveEnrichment(item, result, similarTags) {
  // Validate tag_slugs exist in our tags table
  const validSlugs = new Set(similarTags.map(t => t.slug));
  const validTags = result.tags.filter(t => validSlugs.has(t.tag_slug));
  
  if (validTags.length === 0) {
    console.log(`⚠️ No valid tags found for item ${item.id}`);
    return;
  }
  
  // a) Insert into content_tags (upsert)
  const contentTagData = validTags.map(tag => ({
    content_id: item.id,
    content_type: 'event',
    tag_slug: tag.tag_slug,
    confidence_score: tag.confidence,
    source: 'ai',
    model_version: 'glm-4.5-flash'
  }));
  
  const { error: tagError } = await adminClient
    .from('content_tags')
    .upsert(contentTagData, { onConflict: 'content_id,tag_slug,source' });
  
  if (tagError) {
    console.error('❌ Error inserting content_tags:', tagError);
    throw tagError;
  }
  
  // b) Update items
  const { error: itemError } = await adminClient
    .from('items')
    .update({
      mood: result.mood,
      category_slug: result.category_slug,
      price_tier: result.price_tier
    })
    .eq('id', item.id);
  
  if (itemError) {
    console.error('❌ Error updating item:', itemError);
    throw itemError;
  }
  
  console.log(`✅ Enriched item ${item.id} with ${validTags.length} tags`);
}

// Enrich single item
async function enrichItem(item) {
  try {
    // Get similar tags
    const similarTags = await getSimilarTags(item.id);
    
    if (similarTags.length === 0) {
      console.log(`⚠️ No similar tags found for item ${item.id}`);
      return;
    }
    
    // Call GLM API
    const apiData = await callGLMAPI(
      item.title,
      item.description,
      item.type,
      item.category,
      item.city,
      item.price,
      similarTags
    );
    
    // Parse response
    const result = parseResponse(apiData);
    
    // Save to database
    await saveEnrichment(item, result, similarTags);
    
  } catch (e) {
    console.error(`❌ Failed to enrich item ${item.id}:`, e.message);
    throw e;
  }
}

// STEP 6: Queue-based concurrency
async function processQueue(items, concurrency) {
  let index = 0;
  let completed = 0;
  let errors = 0;
  
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      try {
        await enrichItem(item);
        completed++;
      } catch(e) {
        errors++;
        console.error('Failed:', item.id, e.message);
      }
      if ((completed + errors) % 10 === 0) {
        console.log(`Progress: ${completed} enriched | ${errors} errors | ${items.length - completed - errors} remaining`);
      }
    }
  }
  
  await Promise.all(Array.from({length: concurrency}, worker));
  return { completed, errors };
}

// STEP 8: Final verification
async function verifyResults() {
  console.log('\n🔍 Running verification queries...');
  
  // Total enriched items
  const { count: totalEnriched } = await adminClient
    .from('content_tags')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', 'event')
    .eq('source', 'ai');
  
  // Mood distribution
  const { data: moodDist } = await adminClient
    .from('items')
    .select('mood')
    .not('mood', 'is', null)
    .eq('is_active', true);
  
  const moodCounts = {};
  moodDist?.forEach(item => {
    moodCounts[item.mood] = (moodCounts[item.mood] || 0) + 1;
  });
  
  // Category distribution
  const { data: categoryDist } = await adminClient
    .from('items')
    .select('category_slug')
    .not('category_slug', 'is', null)
    .eq('is_active', true);
  
  const categoryCounts = {};
  categoryDist?.forEach(item => {
    categoryCounts[item.category_slug] = (categoryCounts[item.category_slug] || 0) + 1;
  });
  
  // Price tier distribution
  const { data: priceDist } = await adminClient
    .from('items')
    .select('price_tier')
    .not('price_tier', 'is', null)
    .eq('is_active', true);
  
  const priceCounts = {};
  priceDist?.forEach(item => {
    priceCounts[item.price_tier] = (priceCounts[item.price_tier] || 0) + 1;
  });
  
  console.log(`📊 ENRICHMENT RESULTS:`);
  console.log(`Total enriched items: ${totalEnriched || 0}`);
  
  console.log('\n📈 Mood distribution:');
  Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([mood, count]) => {
      console.log(`  ${mood}: ${count}`);
    });
  
  console.log('\n📈 Category distribution:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
  
  console.log('\n📈 Price tier distribution:');
  Object.entries(priceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`);
    });
}

// Main function
async function enrichItems() {
  try {
    console.log('🚀 Starting items enrichment...');
    
    // Fetch unenriched items
    const items = await fetchUnenrichedItems();
    
    if (items.length === 0) {
      console.log('✅ No items need enrichment');
      return;
    }
    
    console.log(`📝 Processing ${items.length} items with ${CONCURRENCY} concurrent workers...`);
    
    // Process items with concurrency
    const { completed, errors } = await processQueue(items, CONCURRENCY);
    
    console.log(`\n🎉 Enrichment completed!`);
    console.log(`✅ Successfully enriched: ${completed}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Verify results
    await verifyResults();
    
  } catch (error) {
    console.error('❌ Items enrichment failed:', error.message);
    process.exit(1);
  }
}

// Run the enrichment
enrichItems();
