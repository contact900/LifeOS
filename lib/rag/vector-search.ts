import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type MemoryCategory = 'finance' | 'work' | 'health' | 'general'
export type SourceType = 'chat' | 'note' | 'recording'

export interface MemoryChunk {
  id: string
  content: string
  category: MemoryCategory
  source_type: SourceType
  created_at: string
  similarity: number
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Query memories using vector similarity search
 * Returns top 5 most similar chunks for the given category
 */
export async function searchMemories(
  userId: string,
  category: MemoryCategory,
  queryText: string,
  limit: number = 5,
  threshold: number = 0.5
): Promise<MemoryChunk[]> {
  const supabase = await createClient()

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText)

  // Query using the match_memories function
  // Convert embedding array to string format for RPC call
  const embeddingString = `[${queryEmbedding.join(',')}]`
  const { data, error } = await supabase.rpc('match_memories', {
    query_embedding: embeddingString,
    match_user_id: userId,
    match_category: category,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('Error searching memories:', error)
    throw error
  }

  return (data || []) as MemoryChunk[]
}

/**
 * Save a memory with embedding to the database
 */
export async function saveMemory(
  userId: string,
  content: string,
  category: MemoryCategory,
  sourceType: SourceType
): Promise<string> {
  const supabase = await createClient()

  // Generate embedding
  const embedding = await generateEmbedding(content)

  // Insert into database
  // Supabase pgvector expects the embedding as an array directly
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      content,
      embedding: embedding, // Pass array directly - Supabase handles conversion
      category,
      source_type: sourceType,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving memory:', error)
    throw error
  }

  return data.id
}

/**
 * Batch save memories (useful for processing multiple chunks)
 */
export async function saveMemories(
  userId: string,
  memories: Array<{
    content: string
    category: MemoryCategory
    sourceType: SourceType
  }>
): Promise<string[]> {
  const supabase = await createClient()

  // Generate embeddings for all memories
  const embeddings = await Promise.all(
    memories.map((memory) => generateEmbedding(memory.content))
  )

  // Prepare data for batch insert
  const dataToInsert = memories.map((memory, index) => ({
    user_id: userId,
    content: memory.content,
    embedding: embeddings[index], // Pass array directly
    category: memory.category,
    source_type: memory.sourceType,
  }))

  // Batch insert
  const { data, error } = await supabase
    .from('memories')
    .insert(dataToInsert)
    .select('id')

  if (error) {
    console.error('Error saving memories:', error)
    throw error
  }

  return data.map((item) => item.id)
}
