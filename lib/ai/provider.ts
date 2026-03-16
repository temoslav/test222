interface EnrichmentResult {
  category_slug: string
  tags: string[]
  audience_slugs: string[]
  mood: 'relaxed' | 'active' | 'cultural' | 'business' | 'romantic'
  price_tier: 'free' | 'budget' | 'medium' | 'premium'
  confidence: number
}

export async function enrichEvent(
  title: string,
  description: string,
  price: number | null,
  availableCategories: string[],
  availableTags: string[],
  availableAudiences: string[]
): Promise<EnrichmentResult> {
  
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

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    }
  )

  const data = await response.json()
  const text = data.choices[0]?.message?.content ?? '{}'
  
  try {
    const result = JSON.parse(text)
    
    // Validate against allowed values
    return {
      category_slug: availableCategories.includes(result.category_slug)
        ? result.category_slug : 'other',
      tags: (result.tags ?? []).filter((t: string) => 
        availableTags.includes(t)),
      audience_slugs: (result.audience_slugs ?? []).filter((a: string) =>
        availableAudiences.includes(a)),
      mood: result.mood ?? 'cultural',
      price_tier: result.price_tier ?? 'medium',
      confidence: result.confidence ?? 0.7,
    }
  } catch {
    return {
      category_slug: 'other',
      tags: [],
      audience_slugs: [],
      mood: 'cultural',
      price_tier: price === 0 || !price ? 'free' : 'medium',
      confidence: 0.3,
    }
  }
}
