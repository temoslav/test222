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

async function fixDates() {
  console.log('Fixing existing bad dates...')
  
  // Fix bad dates (zero timestamps)
  const { error: fixError, count: fixCount } = await supabase
    .from('items')
    .update({ starts_at: null })
    .eq('source', 'kudago')
    .lt('starts_at', '1970-01-02')
    .select('id', { count: 'exact' })
  
  if (fixError) {
    console.error('Error fixing bad dates:', fixError)
  } else {
    console.log(`Fixed ${fixCount} items with bad dates`)
  }
  
  // Hide outdated events
  const { error: hideError, count: hideCount } = await supabase
    .from('items')
    .update({ is_active: false })
    .eq('source', 'kudago')
    .not('ends_at', 'is', null)
    .lt('ends_at', new Date().toISOString())
    .lt('ends_at', '9000-01-01')
    .select('id', { count: 'exact' })
  
  if (hideError) {
    console.error('Error hiding outdated events:', hideError)
  } else {
    console.log(`Hidden ${hideCount} outdated events`)
  }
  
  // Verify results
  const { data: verifyData, error: verifyError } = await supabase
    .from('items')
    .select('is_active, starts_at')
    .eq('source', 'kudago')
  
  if (verifyError) {
    console.error('Error verifying:', verifyError)
    return
  }
  
  const total = verifyData.length
  const active = verifyData.filter(item => item.is_active).length
  const hidden = verifyData.filter(item => !item.is_active).length
  const noDate = verifyData.filter(item => item.starts_at === null).length
  
  console.log('\nVerification Results:')
  console.log(`Total: ${total}`)
  console.log(`Active: ${active}`)
  console.log(`Hidden: ${hidden}`)
  console.log(`No date: ${noDate}`)
}

fixDates().catch(console.error)
