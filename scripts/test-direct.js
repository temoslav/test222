const BASE_URL = 'https://kudago.com/public-api/v1.4'

async function testDirect() {
  console.log('Testing direct KudaGo API call...')
  
  const url = new URL(`${BASE_URL}/events/`)
  url.searchParams.set('location', 'msk')
  url.searchParams.set('page_size', '5')
  url.searchParams.set('page', '1')
  url.searchParams.set('fields', 'id,title,description,price,images,site_url,place,dates,categories')
  url.searchParams.set('expand', 'images,place')
  url.searchParams.set('actual_since', String(Math.floor(Date.now() / 1000)))
  
  try {
    const response = await fetch(url.toString())
    const data = await response.json()
    
    console.log(`Status: ${response.status}`)
    console.log(`Results: ${data.results?.length}`)
    console.log(`Next: ${data.next}`)
    
    if (data.results?.length > 0) {
      console.log('Sample event:', {
        id: data.results[0].id,
        title: data.results[0].title,
        price: data.results[0].price,
        hasImages: !!data.results[0].images?.length,
        hasPlace: !!data.results[0].place
      })
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

testDirect()
