import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { saveMemory, MemoryCategory } from '@/lib/rag/vector-search'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const { note_id } = await req.json()

    if (!note_id) {
      return new Response(JSON.stringify({ error: 'Note ID required' }), {
        status: 400,
      })
    }

    // Fetch the note
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', note_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !note) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
      })
    }

    // Extract text content from Tiptap JSON
    const extractText = (node: any): string => {
      if (typeof node === 'string') return node
      if (node.type === 'text') return node.text || ''
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join(' ')
      }
      return ''
    }

    const noteText = extractText(note.content_json)
    const fullContent = `${note.title}\n\n${noteText}`

    if (!fullContent.trim()) {
      return new Response(JSON.stringify({ error: 'Note is empty' }), {
        status: 400,
      })
    }

    // Summarize and extract entities using GPT-4o
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analyze the following note and provide:
1. A concise summary (2-3 sentences)
2. Key entities (people, topics, dates, locations)
3. Category classification (finance, work, health, or general)

Respond in JSON format:
{
  "summary": "summary text",
  "entities": ["entity1", "entity2"],
  "category": "finance|work|health|general"
}`,
        },
        {
          role: 'user',
          content: fullContent,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const analysis = JSON.parse(
      analysisResponse.choices[0]?.message?.content || '{}'
    )

    const category = (analysis.category || 'general') as MemoryCategory
    const summary = analysis.summary || fullContent.substring(0, 500)
    const entities = analysis.entities || []

    // Create memory chunks
    // 1. Save the summary
    await saveMemory(user.id, summary, category, 'note')

    // 2. Save key entities as separate memories for better retrieval
    if (entities.length > 0) {
      const entityText = `Note about: ${entities.join(', ')}. ${summary}`
      await saveMemory(user.id, entityText, category, 'note')
    }

    // 3. Save the full content (chunked if too long)
    const maxChunkLength = 1000
    if (fullContent.length > maxChunkLength) {
      // Split into chunks
      const chunks = []
      let currentChunk = ''
      const sentences = fullContent.split(/[.!?]\s+/)

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkLength) {
          chunks.push(currentChunk)
          currentChunk = sentence
        } else {
          currentChunk += (currentChunk ? '. ' : '') + sentence
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk)
      }

      // Save each chunk
      for (const chunk of chunks) {
        await saveMemory(user.id, chunk, category, 'note')
      }
    } else {
      await saveMemory(user.id, fullContent, category, 'note')
    }

    return new Response(
      JSON.stringify({
        success: true,
        category,
        summary,
        entities,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Note processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
