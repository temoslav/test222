const BASE_URL = process.env.KUDAGO_API_URL ?? 
  'https://kudago.com/public-api/v1.4'

export class KudaGoParser {
  readonly sourceSlug = 'kudago'
  
  async fetch(options: { 
    city?: string
    limit?: number 
    fetchAll?: boolean
  } = {}): Promise<any[]> {
    const { city = 'msk', fetchAll = false } = options
    const PAGE_SIZE = 100
    const allItems: any[] = []
    let page = 1
    let hasMore = true
    
    while (hasMore) {
      const url = new URL(`${BASE_URL}/events/`)
      url.searchParams.set('location', city)
      url.searchParams.set('page_size', String(PAGE_SIZE))
      url.searchParams.set('page', String(page))
      url.searchParams.set('fields', 
        'id,title,description,price,images,site_url,place,dates,categories')
      url.searchParams.set('expand', 'images,place')
      url.searchParams.set('actual_since', 
        String(Math.floor(Date.now() / 1000)))
      
      console.log(`Fetching page ${page} from KudaGo...`)
      
      try {
        const response = await fetch(url.toString(), {
          signal: AbortSignal.timeout(30000), // 30 second timeout
          headers: {
            'User-Agent': 'Swipely-Bot/1.0'
          }
        })
        
        if (!response.ok) {
          console.error(`HTTP ${response.status}: ${response.statusText}`)
          break
        }
        
        const data = await response.json()
        if (!data.results?.length) {
          console.log('No more results')
          break
        }
        
        console.log(`Fetched ${data.results.length} events from page ${page}`)
        allItems.push(...data.results.map((e: any) => 
          this.mapEvent(e, city)))
        
        // KudaGo uses 'next' field for pagination
        hasMore = fetchAll && data.next !== null
        page++
        
        if (hasMore) {
          console.log('Waiting 300ms before next request...')
          await new Promise(r => setTimeout(r, 300))
        }
      } catch (err) {
        console.error(`Error fetching page ${page}:`, err)
        break
      }
    }
    
    console.log(`Total fetched: ${allItems.length} events`)
    return allItems
  }
  
  private parsePrice(priceStr: string | null): number | null {
    if (!priceStr || priceStr.trim() === '' || 
        priceStr.toLowerCase().includes('бесплатно')) return null
    const match = priceStr.match(/\d+/)
    return match ? parseInt(match[0]) : null
  }
  
  private mapEvent(event: any, city: string): any {
    return {
      external_id: `kudago_${event.id}`,
      source: 'kudago',
      type: 'event',
      title: event.title,
      description: event.description?.replace(/<[^>]+>/g, '') ?? null,
      price: this.parsePrice(event.price),
      currency: 'RUB',
      image_urls: event.images?.map((i: any) => i.image) ?? [],
      external_url: event.site_url ?? '',
      city,
      location: event.place ? {
        lat: event.place.coords?.lat ?? 0,
        lng: event.place.coords?.lon ?? 0,
        address: event.place.address ?? '',
      } : null,
      raw_categories: event.categories?.map(
        (c: any) => c.slug ?? c
      ) ?? [],
      starts_at: event.dates?.[0]?.start
        ? new Date(event.dates[0].start * 1000) : null,
      ends_at: event.dates?.[0]?.end
        ? new Date(event.dates[0].end * 1000) : null,
      raw_data: event,
    }
  }
}
