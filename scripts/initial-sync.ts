import { KudaGoParser } from '../lib/parsers/kudago'
import { ingestItems } from '../lib/ingestion/ingest'

async function main() {
  console.log('Starting initial KudaGo sync for Moscow...')
  
  const parser = new KudaGoParser()
  const items = await parser.fetch({ city: 'msk', fetchAll: true })
  
  console.log(`Fetched ${items.length} events from KudaGo`)
  console.log('Starting ingestion with AI enrichment...')
  
  await ingestItems(items)
  
  console.log('Done!')
  process.exit(0)
}

main().catch(console.error)
