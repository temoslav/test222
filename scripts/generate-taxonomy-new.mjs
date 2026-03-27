#!/usr/bin/env node

// Generate 1200 real meaningful tags using Groq AI
// 12 batches of 100 tags each, saved to scripts/taxonomy-seed.json

import { readFileSync, writeFileSync } from 'fs';
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

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const GROQ_API_KEY = env.GROQ_API_KEY;

// System prompt for all requests
const SYSTEM_PROMPT = `You are generating tags for an AI recommendation engine. 
Return ONLY a valid JSON array. No markdown. No explanation. No code blocks.
Each tag = one real human activity, interest or concept.
NEVER use placeholders. NEVER use numbered concepts.
Tags must be specific and meaningful.`;

// Batch definitions - 12 batches of 100 tags each
const BATCHES = [
  {
    name: 'lifestyle_fitness',
    topics: 'yoga, running, cycling, swimming, hiking, crossfit, pilates, calisthenics, martial arts, boxing, triathlon, rock climbing, surfing, skateboarding, snowboarding',
    category: 'lifestyle'
  },
  {
    name: 'lifestyle_wellness',
    topics: 'meditation, mindfulness, breathwork, journaling, therapy, sleep, spa, detox, biohacking, longevity, supplements, mental health, self care, anxiety relief',
    category: 'health'
  },
  {
    name: 'lifestyle_beauty_fashion',
    topics: 'skincare, haircare, makeup, street fashion, vintage clothing, luxury fashion, sustainable fashion, streetwear, accessories, perfume, nail art, tattoo',
    category: 'lifestyle'
  },
  {
    name: 'entertainment_music',
    topics: 'jazz, blues, rock, electronic music, hip-hop, classical music, opera, indie music, folk music, punk, metal, reggae, vinyl records, live music, concert',
    category: 'entertainment'
  },
  {
    name: 'entertainment_arts',
    topics: 'art gallery, contemporary art, photography, street art, illustration, ceramics, sculpture, pottery, graffiti, digital art, film photography, darkroom',
    category: 'creativity'
  },
  {
    name: 'entertainment_culture',
    topics: 'film festival, indie cinema, theatre, standup comedy, improv, dance, ballet, poetry, literary fiction, book club, anime, manga, gaming, esports',
    category: 'entertainment'
  },
  {
    name: 'food_dining',
    topics: 'specialty coffee, craft beer, natural wine, fine dining, street food, food market, sushi, ramen, vegan cuisine, plant based, farm to table, food photography',
    category: 'food'
  },
  {
    name: 'food_drinks',
    topics: 'cocktails, mixology, tea ceremony, wine tasting, craft spirits, sourdough baking, fermentation, meal prep, foraging, zero waste cooking, home brewing',
    category: 'food'
  },
  {
    name: 'technology_business',
    topics: 'machine learning, AI tools, web development, product design, UX design, startup, venture capital, saas, no-code, blockchain, crypto, DeFi, NFT, web3',
    category: 'technology'
  },
  {
    name: 'career_finance',
    topics: 'remote work, digital nomad, freelancing, personal branding, content creation, podcasting, investing, stock market, real estate, passive income, e-commerce, dropshipping',
    category: 'business'
  },
  {
    name: 'sports_outdoor',
    topics: 'football, basketball, tennis, volleyball, skiing, mountaineering, trail running, ultramarathon, kitesurfing, paragliding, bouldering, jiu-jitsu, esports tournament',
    category: 'sports'
  },
  {
    name: 'social_community',
    topics: 'dating, parenting, volunteering, activism, travel, backpacking, luxury travel, language learning, coworking, community building, interior design, gardening, minimalism, sustainability',
    category: 'social_impact'
  }
];

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGroqAPI(batch, retryCount = 0) {
  try {
    console.log(`🤖 Calling Groq API for ${batch.name}...`);
    
    const userPrompt = `Generate exactly 100 unique tags for these topics: ${batch.topics}

Each tag object must have exactly this structure:
{
  tag: string (1-3 words, lowercase, real human concept),
  slug: string (snake_case of the tag),
  category: string (one of: lifestyle, health, entertainment, creativity, food, technology, business, career, finance, sports, mobility, relationships, social_impact, home, sustainability, luxury),
  domain: string (specific domain within category),
  cluster: string (semantic cluster name),
  tag_type: one of [domain, audience, intent, emotional, lifecycle, urgency, status, accessibility],
  intent_type: one of [learn, buy, attend, socialize, improve, earn, explore, relax, build, invest],
  emotional_signal: one of [exciting, practical, prestigious, fun, intense, safe, inspirational, urgent, exclusive, transformational],
  lifecycle_stage: one of [emerging, trending, stable, evergreen, declining, seasonal],
  accessibility_level: one of [mass, niche, premium, elite, invite_only],
  decay_factor: float between 0.05 and 0.95,
  global_relevance_score: float between 0 and 1,
  cross_domain_power: float between 0 and 1,
  suggested_relations: array of 2-3 objects: { relation_type: similar|complementary|next_step|opposite, related_tag: slug_of_related_tag, strength: float 0-1 }
}`;
    
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle rate limit specifically
      if (response.status === 429) {
        const retryAfter = errorData.error?.message?.match(/try again in ([\d.]+)s/)?.[1] || '10';
        console.log(`⏱️ Rate limit hit, waiting ${retryAfter} seconds...`);
        await delay(parseFloat(retryAfter) * 1000);
      }
      
      console.error(`❌ Groq API error:`, errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let tags;
    try {
      tags = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Raw content:', content.substring(0, 500));
      throw new Error('Failed to parse JSON response');
    }

    // Validate the response
    if (!Array.isArray(tags)) {
      throw new Error('Response is not an array');
    }

    console.log(`✅ Received ${tags.length} tags from Groq`);
    return tags;

  } catch (error) {
    console.error(`❌ Error calling Groq API for ${batch.name}:`, error.message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying ${batch.name} (attempt ${retryCount + 2})...`);
      await delay(2000);
      return callGroqAPI(batch, retryCount + 1);
    }
    
    throw error;
  }
}

function validateBatch(batch, batchName) {
  const invalid = batch.filter(t =>
    t.slug.includes('concept') ||
    t.tag.includes('concept') ||
    !t.tag || !t.slug || !t.category
  );
  
  if (invalid.length > 0) {
    console.error('❌ INVALID TAGS:', invalid.length, invalid.slice(0,3).map(t => t.tag));
    return false;
  }
  
  console.log(`✅ ${batchName} validation passed: ${batch.length} tags`);
  return true;
}

async function generateTaxonomy() {
  try {
    console.log('🚀 Starting taxonomy generation with Groq AI...');
    console.log(`📊 Processing ${BATCHES.length} batches of 100 tags each`);
    
    const allTags = [];
    let successCount = 0;
    
    // Process each batch
    for (let i = 0; i < BATCHES.length; i++) {
      const batch = BATCHES[i];
      
      console.log(`\n📝 Processing batch ${i + 1}/${BATCHES.length}: ${batch.name}`);
      
      try {
        let batchTags = await callGroqAPI(batch);
        
        // Validate batch
        if (!validateBatch(batchTags, batch.name)) {
          // Retry once
          console.log(`🔄 Retrying ${batch.name} due to validation issues...`);
          await delay(2000);
          batchTags = await callGroqAPI(batch);
          
          if (!validateBatch(batchTags, batch.name)) {
            console.error(`❌ Batch ${batch.name} failed validation after retry, skipping...`);
            continue;
          }
        }
        
        allTags.push(...batchTags);
        successCount++;
        console.log(`✅ Batch ${batch.name} completed: ${batchTags.length} tags`);
        
      } catch (error) {
        console.error(`❌ Failed to process batch ${batch.name}:`, error.message);
        console.error(`⚠️ Skipping batch ${batch.name} and continuing...`);
      }
      
      // Add delay between batches (rate limit)
      if (i < BATCHES.length - 1) {
        console.log('⏳ Waiting 1 second before next batch...');
        await delay(1000);
      }
    }
    
    console.log(`\n📊 Batches completed: ${successCount}/${BATCHES.length}`);
    console.log(`📊 Total tags collected: ${allTags.length}`);
    
    if (allTags.length === 0) {
      console.error('❌ No tags collected, aborting...');
      return;
    }
    
    // Deduplicate by slug
    const uniqueTags = [];
    const seenSlugs = new Set();
    
    for (const tag of allTags) {
      if (!seenSlugs.has(tag.slug)) {
        seenSlugs.add(tag.slug);
        uniqueTags.push(tag);
      }
    }
    
    console.log(`🔄 Deduplicated to ${uniqueTags.length} unique tags`);
    
    // Final validation
    const finalInvalid = uniqueTags.filter(t =>
      t.slug.includes('concept') ||
      t.tag.includes('concept') ||
      !t.tag || !t.slug || !t.category
    );
    
    if (finalInvalid.length > 0) {
      console.error(`❌ FINAL VALIDATION FAILED: ${finalInvalid.length} invalid tags remaining`);
      finalInvalid.slice(0, 5).forEach(t => {
        console.error(`  - ${t.tag} (${t.slug})`);
      });
      console.error('❌ Not saving taxonomy due to invalid tags');
      return;
    }
    
    // Category breakdown
    const categoryCounts = {};
    uniqueTags.forEach(tag => {
      categoryCounts[tag.category] = (categoryCounts[tag.category] || 0) + 1;
    });
    
    console.log('\n📈 Category breakdown:');
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} tags`);
    });
    
    // Show random samples
    const samples = [];
    for (let i = 0; i < Math.min(20, uniqueTags.length); i++) {
      const randomIndex = Math.floor(Math.random() * uniqueTags.length);
      samples.push(uniqueTags[randomIndex].tag);
    }
    console.log('\n🎲 Random sample tags:');
    samples.forEach((tag, i) => {
      console.log(`  ${i + 1}. ${tag}`);
    });
    
    // Save to file
    const outputPath = join(__dirname, 'taxonomy-seed.json');
    writeFileSync(outputPath, JSON.stringify(uniqueTags, null, 2));
    
    console.log(`\n✅ Taxonomy saved to ${outputPath}`);
    console.log(`📊 Final stats: ${uniqueTags.length} tags across ${Object.keys(categoryCounts).length} categories`);
    console.log(`🎉 Taxonomy generation completed successfully! (${successCount}/${BATCHES.length} batches successful)`);
    
  } catch (error) {
    console.error('❌ Taxonomy generation failed:', error.message);
    process.exit(1);
  }
}

// Run the generation
generateTaxonomy();
