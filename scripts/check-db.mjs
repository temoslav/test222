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
  console.log('Checking database state...')
  
  // Check raw_events
  const { count: rawCount, data: rawData } = await supabase
    .from('raw_events')
    .select('*')
    .eq('source', 'kudago')
  
  console.log(`Raw events: ${rawCount || 0}`)
  
  // Check items
  const { count: itemCount, data: itemData } = await supabase
    .from('items')
    .select('*')
    .eq('source', 'kudago')
  
  console.log(`Items: ${itemCount || 0}`)
  
  // Check unprocessed raw events
  const { count: unprocessedCount } = await supabase
    .from('raw_events')
    .select('*', { count: 'exact', head: true })
    .eq('processed', false)
  
  console.log(`Unprocessed raw events: ${unprocessedCount || 0}`)
  
  // Show sample
  if (itemData && itemData.length > 0) {
    console.log('Sample item:', {
      id: itemData[0].id,
      title: itemData[0].title,
      external_id: itemData[0].external_id,
      source: itemData[0].source
    })
  }
}

main().catch(console.error)
