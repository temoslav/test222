import { KudaGoParser } from '../lib/parsers/kudago'

async function testParser() {
  console.log('Testing KudaGo parser...')
  const parser = new KudaGoParser()
  
  try {
    const items = await parser.fetch({ city: 'msk', fetchAll: false })
    console.log(`Fetched ${items.length} events`)
    console.log('Sample item:', JSON.stringify(items[0], null, 2).slice(0, 500))
  } catch (err) {
    console.error('Error:', err)
  }
}

testParser()
