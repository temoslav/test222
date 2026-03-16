import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

async function main() {
  console.log('Detailed database check...')
  
  // Check all raw_events
  const { data: allRaw, count: rawCount } = await supabase
    .from('raw_events')
    .select('*')
  
  console.log(`All raw events: ${rawCount || 0}`)
  if (allRaw && allRaw.length > 0) {
    console.log('Raw event sources:', [...new Set(allRaw.map(r => r.source))])
    console.log('Raw event processed status:', [...new Set(allRaw.map(r => r.processed))])
  }
  
  // Check all items
  const { data: allItems, count: itemCount } = await supabase
    .from('items')
    .select('*')
  
  console.log(`All items: ${itemCount || 0}`)
  if (allItems && allItems.length > 0) {
    console.log('Item sources:', [...new Set(allItems.map(i => i.source))])
    console.log('Sample kudago items:', allItems.filter(i => i.source === 'kudago').slice(0, 3).map(i => ({
      id: i.id,
      title: i.title,
      external_id: i.external_id
    })))
  }
  
  // Check unprocessed raw events specifically
  const { data: unprocessed } = await supabase
    .from('raw_events')
    .select('source, external_id, processed')
    .eq('processed', false)
    .limit(5)
  
  console.log(`Unprocessed raw events sample:`, unprocessed)
}

main().catch(console.error)
