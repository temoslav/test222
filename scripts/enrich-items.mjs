import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import axios from 'axios'

// Load env manually
const envFile = readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) env[key.trim()] = vals.join('=').trim()
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function callGroq(prompt, apiKey, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 150,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )
      return response
    } catch (err) {
      console.log(`Groq attempt ${i+1} error: ${err.message}`)
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 5000 * (i + 1)))
      }
    }
  }
  return null
}

async function enrichEvent(title, description, price, availableCategories, availableTags, availableAudiences) {
  const prompt = `Classify this Russian cultural event.

Event:
Title: ${title}
Description: ${description?.slice(0, 500) ?? 'No description'}
Price: ${price ? `${price} RUB` : 'Free'}

Choose ONE category from this exact list:
${availableCategories.join(', ')}

Choose up to 5 tags from this exact list:
${availableTags.join(', ')}

Choose audiences from this exact list:
${availableAudiences.join(', ')}

Choose mood: relaxed, active, cultural, business, romantic

Choose price_tier: free (0 rub), budget (1-500), medium (501-2000), premium (2001+)

Respond ONLY with valid JSON, no explanation:
{
  "category_slug": "music",
  "tags": ["jazz", "live-music"],
  "audience_slugs": ["adults", "couples"],
  "mood": "relaxed",
  "price_tier": "medium",
  "confidence": 0.95
}`

  const response = await callGroq(prompt, env.GROQ_API_KEY)
  
  if (!response) {
    console.error('AI enrichment failed after retries')
    return null
  }
  
  try {
    const data = response.data
    const text = data.choices[0]?.message?.content ?? '{}'
    
    const result = JSON.parse(text)
    
    // Validate against allowed values
    return {
      category_slug: availableCategories.includes(result.category_slug)
        ? result.category_slug : 'other',
      tags: (result.tags ?? []).filter((t) => 
        availableTags.includes(t)),
      audience_slugs: (result.audience_slugs ?? []).filter((a) =>
        availableAudiences.includes(a)),
      mood: result.mood ?? 'cultural',
      price_tier: result.price_tier ?? 'medium',
      confidence: result.confidence ?? 0.7,
    }
  } catch (err) {
    console.error('Failed to parse AI response:', err.message)
    return null
  }
}

async function getUnenrichedItems(supabase, batchSize) {
  const { data, error } = await supabase
    .rpc('get_unenriched_items', { batch_size: batchSize })
  
  if (error) console.error('RPC error:', error.message)
  return data ?? []
}

async function enrichBatch() {
  // Get reference data
  const [
    { data: categories },
    { data: tags },
    { data: audiences }
  ] = await Promise.all([
    supabase.from('categories').select('slug').eq('is_active', true),
    supabase.from('tags').select('slug'),
    supabase.from('audiences').select('slug'),
  ])
  
  const categorySlugs = categories?.map((c) => c.slug) ?? []
  const tagSlugs = tags?.map((t) => t.slug) ?? []
  const audienceSlugs = audiences?.map((a) => a.slug) ?? []
  
  // Get unenriched items
  const items = await getUnenrichedItems(supabase, 10)
  
  if (!items.length) {
    return { processed: 0, remaining: 0 }
  }
  
  console.log(`Processing ${items.length} items...`)
  
  let processed = 0
  
  for (const item of items) {
    try {
      console.log(`Enriching: ${item.title.slice(0, 50)}...`)
      
      const enrichment = await enrichEvent(
        item.title,
        item.description ?? '',
        item.price,
        categorySlugs,
        tagSlugs,
        audienceSlugs
      )
      
      // Only save enrichment if AI succeeded — skip fallback
      if (!enrichment || (enrichment.category_slug === 'other' && !enrichment.tags?.length)) {
        console.log(`Skipping ${item.title} — AI failed, will retry later`)
        continue  // Don't save, will be picked up next run
      }
      
      await supabase.from('item_enrichments').upsert({
        item_id: item.id,
        category_slug: enrichment.category_slug,
        tags: enrichment.tags,
        audience_slugs: enrichment.audience_slugs,
        mood: enrichment.mood,
        price_tier: enrichment.price_tier,
        ai_confidence: enrichment.confidence,
        ai_model: 'llama-3.1-8b-instant',
        enriched_at: new Date().toISOString(),
        needs_reenrichment: false,
      }, { onConflict: 'item_id' })
      
      processed++
      console.log(`✅ Enriched: ${enrichment.category_slug}, ${enrichment.tags.join(', ')}`)
      
      await new Promise(r => setTimeout(r, 3000))
    } catch (err) {
      console.error(`Failed to enrich ${item.id}:`, err.message)
    }
  }
  
  // Get remaining count
  const remainingItems = await getUnenrichedItems(supabase, 1000)
  return { processed, remaining: remainingItems.length }
}

// Auto-continue until all items are enriched
async function runAll() {
  console.log('Starting full AI enrichment pipeline...')
  
  const { count: total } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'kudago')
    
  const { count: enriched } = await supabase
    .from('item_enrichments')
    .select('*', { count: 'exact', head: true })
    
  console.log(`Total: ${total}, Enriched: ${enriched}, Remaining: ${total - enriched}`)
  
  let totalEnriched = 0
  let batchNum = 1
  
  while (true) {
    const items = await getUnenrichedItems(supabase, 10)
    
    if (!items.length) {
      console.log('✅ All items enriched!')
      break
    }
    
    console.log(`\n--- Batch ${batchNum} ---`)
    let batchEnriched = 0
    
    for (const item of items) {
      const result = await enrichItem(item)
      if (result) {
        batchEnriched++
        totalEnriched++
      }
      await new Promise(r => setTimeout(r, 1000))
    }
    
    console.log(`Batch ${batchNum}: ${batchEnriched} enriched`)
    console.log(`Total enriched: ${totalEnriched}`)
    
    batchNum++
    await new Promise(r => setTimeout(r, 2000))
  }
  
  console.log(`\n✅ DONE! Total enriched: ${totalEnriched}`)
}

async function enrichItem(item) {
  // Get reference data
  const [
    { data: categories },
    { data: tags },
    { data: audiences }
  ] = await Promise.all([
    supabase.from('categories').select('slug').eq('is_active', true),
    supabase.from('tags').select('slug'),
    supabase.from('audiences').select('slug'),
  ])
  
  const categorySlugs = categories?.map((c) => c.slug) ?? []
  const tagSlugs = tags?.map((t) => t.slug) ?? []
  const audienceSlugs = audiences?.map((a) => a.slug) ?? []
  
  try {
    console.log(`Enriching: ${item.title.slice(0, 50)}...`)
    
    const enrichment = await enrichEvent(
      item.title,
      item.description ?? '',
      item.price,
      categorySlugs,
      tagSlugs,
      audienceSlugs
    )
    
    // Only save enrichment if AI succeeded — skip fallback
    if (!enrichment || (enrichment.category_slug === 'other' && !enrichment.tags?.length)) {
      console.log(`Skipping ${item.title} — AI failed, will retry later`)
      return false
    }
    
    await supabase.from('item_enrichments').upsert({
      item_id: item.id,
      category_slug: enrichment.category_slug,
      tags: enrichment.tags,
      audience_slugs: enrichment.audience_slugs,
      mood: enrichment.mood,
      price_tier: enrichment.price_tier,
      ai_confidence: enrichment.confidence,
      ai_model: 'llama-3.1-8b-instant',
      enriched_at: new Date().toISOString(),
      needs_reenrichment: false,
    }, { onConflict: 'item_id' })
    
    console.log(`✅ Enriched: ${enrichment.category_slug}, ${enrichment.tags.join(', ')}`)
    return true
  } catch (err) {
    console.error(`Failed to enrich ${item.id}:`, err.message)
    return false
  }
}

runAll().catch(console.error)
