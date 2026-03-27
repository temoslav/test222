#!/usr/bin/env node

// Generate production-ready universal tag taxonomy using Groq AI
// Creates 1200 real, meaningful tags across 6 category groups

import { readFileSync, writeFileSync } from 'fs';
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

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const GROQ_API_KEY = env.GROQ_API_KEY;

// System prompt for all requests
const SYSTEM_PROMPT = `You are generating a production-ready universal tag taxonomy AI-research grade for an AI discovery swipe platform.

The platform includes three content types: events, products, education.
The platform serves the entire active global population: teenagers, students, professionals, entrepreneurs, families, creators, executives, retirees.

The taxonomy will be used for: AI enrichment pipelines, semantic recommendation engines, vector embeddings search, swipe behavior reinforcement learning, cold-start recommendations, cross-domain matching (event → product → education), taxonomy evolution analytics, trending signal detection.

CRITICAL RULES:
- Return ONLY a valid JSON array. Zero markdown. Zero explanation. Zero code blocks.
- Every tag must be a real human concept, activity, or interest
- NEVER generate placeholders like 'concept_123', 'item_456', 'tag_concept_N'
- Tags must be specific: NOT 'entertainment' but 'jazz concert', 'standup comedy', 'art exhibition'
- Validate your output before returning — if any tag contains a number in its slug, regenerate it

Each tag object must have exactly this structure:
{
  tag: string (lowercase, max 2 words, real human concept),
  slug: string (snake_case, NO numbers, NO 'concept'),
  category: string (level 1 super category),
  domain: string (level 2 domain),
  cluster: string (semantic cluster name),
  tag_type: 'domain'|'audience'|'intent'|'emotional'|'lifecycle'|'urgency'|'status'|'accessibility',
  intent_type: 'learn'|'buy'|'attend'|'socialize'|'improve'|'earn'|'explore'|'relax'|'build'|'invest',
  emotional_signal: 'exciting'|'practical'|'prestigious'|'fun'|'intense'|'safe'|'inspirational'|'urgent'|'exclusive'|'transformational',
  lifecycle_stage: 'emerging'|'trending'|'stable'|'evergreen'|'declining'|'seasonal',
  accessibility_level: 'mass'|'niche'|'premium'|'elite'|'invite_only',
  decay_factor: float 0.05-0.95,
  global_relevance_score: float 0-1,
  cross_domain_power: float 0-1,
  suggested_relations: [
    { relation_type: 'similar'|'complementary'|'next_step'|'opposite', related_tag: 'existing_slug', strength: float 0-1 }
  ]
}

Tags must enable cross-domain flows:
event → product upsell
education → event continuation  
product → education onboarding

Include special tag groups: emotional discovery, ambition/aspiration, consumption behavior, status signaling, community participation, time availability, digital vs physical, learning depth, monetization intent, wellbeing intent.`;

// User prompts for 6 separate API calls
const USER_PROMPTS = [
  {
    name: 'lifestyle_health_wellness',
    prompt: `Generate exactly 100 unique tags covering: fitness, nutrition, mindfulness, beauty, fashion, mental health, sleep, meditation, yoga, running, cycling, swimming, hiking, cooking, skincare, haircare, supplements, therapy, journaling, breathwork, spa, detox, biohacking, longevity. Categories: lifestyle, health.`,
    expectedCategories: ['lifestyle', 'health']
  },
  {
    name: 'entertainment_arts_culture',
    prompt: `Generate exactly 100 unique tags covering: jazz, blues, rock, electronic music, hip-hop, classical, opera, art gallery, contemporary art, photography, street art, film festival, indie cinema, theatre, standup comedy, improv, dance, ballet, sculpture, ceramics, illustration, poetry, literary fiction, vinyl records. Categories: entertainment, creativity.`,
    expectedCategories: ['entertainment', 'creativity']
  },
  {
    name: 'food_drinks_dining',
    prompt: `Generate exactly 100 unique tags covering: specialty coffee, craft beer, natural wine, vegan cuisine, plant based, sushi, ramen, fine dining, street food, food market, cocktails, mixology, tea ceremony, sourdough baking, fermentation, meal prep, food photography, farm to table, zero waste cooking, foraging. Category: food.`,
    expectedCategories: ['food']
  },
  {
    name: 'technology_business_career',
    prompt: `Generate exactly 100 unique tags covering: machine learning, AI tools, web development, product design, UX, startup, venture capital, remote work, digital nomad, public speaking, leadership, negotiation, freelancing, crypto, DeFi, investing, stock market, e-commerce, personal branding, content creation, podcasting, newsletters. Categories: technology, business, career, finance.`,
    expectedCategories: ['technology', 'business', 'career', 'finance']
  },
  {
    name: 'sports_outdoor_adventure',
    prompt: `Generate exactly 100 unique tags covering: rock climbing, bouldering, surfing, skateboarding, snowboarding, skiing, martial arts, boxing, jiu-jitsu, football, basketball, tennis, trail running, ultramarathon, mountaineering, kitesurfing, paragliding, crossfit, pilates, calisthenics, swimming, triathlon, cycling, esports. Categories: sports, mobility.`,
    expectedCategories: ['sports', 'mobility']
  },
  {
    name: 'social_relationships_community',
    prompt: `Generate exactly 100 unique tags covering: dating, relationships, parenting, family, volunteering, activism, social impact, travel, backpacking, luxury travel, language learning, book club, gaming, board games, anime, camping, music festivals, coworking, community building, interior design, home renovation, gardening, sustainable living, minimalism. Categories: relationships, social_impact, home, sustainability, luxury.`,
    expectedCategories: ['relationships', 'social_impact', 'home', 'sustainability', 'luxury']
  }
];

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGroqAPI(userPrompt, retryCount = 0) {
  try {
    console.log(`🤖 Calling Groq API for ${userPrompt.name}...`);
    
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
          { role: 'user', content: userPrompt.prompt }
        ],
        temperature: 0.7,
        max_tokens: 32000
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
    console.error(`❌ Error calling Groq API for ${userPrompt.name}:`, error.message);
    
    if (retryCount < 2) {
      const waitTime = (retryCount + 1) * 10000; // 10s, 20s delays
      console.log(`🔄 Retrying ${userPrompt.name} (attempt ${retryCount + 2}) after ${waitTime/1000}s...`);
      await delay(waitTime);
      return callGroqAPI(userPrompt, retryCount + 1);
    }
    
    throw error;
  }
}

function validateBatch(batch, batchConfig) {
  const fake = batch.filter(t => 
    /\d/.test(t.slug) || 
    t.slug.includes('concept') || 
    t.tag.includes('concept') ||
    t.slug.includes('concept') ||
    t.tag.includes('_') ||
    t.slug.includes('_')
  );
  
  if (fake.length > 0) {
    console.error('❌ FAKE TAGS FOUND:', fake.length, fake.slice(0,3).map(t => t.tag));
    return false;
  }
  console.log('✅ Validation passed:', batch.length, 'real tags');
  return true;
}

async function generateTaxonomy() {
  try {
    console.log('🚀 Starting taxonomy generation with Groq AI...');
    
    const allTags = [];
    
    // Process each prompt
    for (let i = 0; i < USER_PROMPTS.length; i++) {
      const userPrompt = USER_PROMPTS[i];
      
      console.log(`\n📝 Processing batch ${i + 1}/${USER_PROMPTS.length}: ${userPrompt.name}`);
      
      let batch;
      try {
        batch = await callGroqAPI(userPrompt);
        
        // Validate batch
        if (!validateBatch(batch, userPrompt)) {
          // Retry once
          console.log('🔄 Retrying batch due to validation issues...');
          await delay(2000);
          batch = await callGroqAPI(userPrompt);
          
          if (!validateBatch(batch, userPrompt)) {
            throw new Error(`Batch ${userPrompt.name} failed validation after retry`);
          }
        }
        
        allTags.push(...batch);
        console.log(`✅ Batch ${userPrompt.name} completed: ${batch.length} tags`);
        
      } catch (error) {
        console.error(`❌ Failed to process batch ${userPrompt.name}:`, error.message);
        throw error;
      }
      
      // Add longer delay between API calls to avoid rate limits
      if (i < USER_PROMPTS.length - 1) {
        console.log('⏳ Waiting 5 seconds before next batch to avoid rate limits...');
        await delay(5000);
      }
    }
    
    console.log(`\n📊 Total tags collected: ${allTags.length}`);
    
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
    const finalFake = uniqueTags.filter(t => 
      /\d/.test(t.slug) || 
      t.slug.includes('concept') || 
      t.tag.includes('concept') ||
      t.tag.split(' ').length > 2
    );
    
    if (finalFake.length > 0) {
      console.error(`❌ FINAL VALIDATION FAILED: ${finalFake.length} fake tags remaining`);
      finalFake.slice(0, 5).forEach(t => {
        console.error(`  - ${t.tag} (${t.slug})`);
      });
      throw new Error('Final validation failed - fake tags detected');
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
    console.log('🎉 Taxonomy generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Taxonomy generation failed:', error.message);
    process.exit(1);
  }
}

// Run the generation
generateTaxonomy();
