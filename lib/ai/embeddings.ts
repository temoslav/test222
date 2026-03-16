// Sprint 4: Claude API embeddings for content vectors
// Generates 1536-dimensional vectors for items

// TODO: implement when ANTHROPIC_API_KEY is set
export async function generateEmbedding(
  _input: string
): Promise<number[]> {
  throw new Error('generateEmbedding not implemented — Sprint 4')
}

export function buildItemEmbeddingInput(item: {
  title: string
  description: string | null
  category: string | null
  subcategory?: string | null
  brand: string | null
}): string {
  return [item.title, item.description, item.category, item.brand]
    .filter(Boolean)
    .join(' ')
}
