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
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { recording_id } = await req.json()

    if (!recording_id) {
      return new Response(JSON.stringify({ error: 'Recording ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch the recording
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recording_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !recording) {
      return new Response(JSON.stringify({ error: 'Recording not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!recording.transcript) {
      return new Response(
        JSON.stringify({ error: 'Recording has no transcript' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Summarize and categorize using GPT-4o
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analyze the following transcript and provide:
1. A concise summary (2-3 sentences)
2. Key insights and action items
3. Category classification (finance, work, health, or general)

Respond in JSON format:
{
  "summary": "summary text",
  "insights": ["insight1", "insight2"],
  "category": "finance|work|health|general"
}`,
        },
        {
          role: 'user',
          content: recording.transcript,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const analysis = JSON.parse(
      analysisResponse.choices[0]?.message?.content || '{}'
    )

    const category = (analysis.category || 'general') as MemoryCategory
    const summary = analysis.summary || recording.transcript.substring(0, 500)
    const insights = analysis.insights || []

    // Update recording with summary
    const { error: updateError } = await supabase
      .from('recordings')
      .update({ summary })
      .eq('id', recording_id)

    if (updateError) {
      console.error('Error updating recording:', updateError)
    }

    // Save to memories
    // 1. Save the summary
    await saveMemory(user.id, summary, category, 'recording')

    // 2. Save key insights
    if (insights.length > 0) {
      const insightsText = `Key insights: ${insights.join('. ')}. ${summary}`
      await saveMemory(user.id, insightsText, category, 'recording')
    }

    // 3. Save the full transcript (chunked if too long)
    const maxChunkLength = 1000
    if (recording.transcript.length > maxChunkLength) {
      // Split into chunks
      const chunks = []
      let currentChunk = ''
      const sentences = recording.transcript.split(/[.!?]\s+/)

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
        await saveMemory(user.id, chunk, category, 'recording')
      }
    } else {
      await saveMemory(user.id, recording.transcript, category, 'recording')
    }

    return new Response(
      JSON.stringify({
        success: true,
        category,
        summary,
        insights,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Recording processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
