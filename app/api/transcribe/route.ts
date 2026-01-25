import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { createClient as createStorageClient } from '@supabase/supabase-js'

export const runtime = 'edge' // Use Edge Runtime to avoid timeout

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'Audio file required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Upload to Supabase Storage
    const storageClient = createStorageClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const timestamp = Date.now()
    const filePath = `recordings/${user.id}/${timestamp}.webm`

    const audioBuffer = await audioFile.arrayBuffer()
    const { error: uploadError } = await storageClient.storage
      .from('recordings')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/webm',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload audio file' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Convert audio to format suitable for Whisper API
    // Whisper API accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm
    // We'll use the file directly if it's webm, or convert if needed
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })
    const audioFileForWhisper = new File([audioBlob], 'recording.webm', {
      type: 'audio/webm',
    })

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForWhisper,
      model: 'whisper-1',
      language: 'en', // Optional: specify language for better accuracy
    })

    const transcript = transcription.text

    // Save to recordings table
    const { data: recording, error: dbError } = await supabase
      .from('recordings')
      .insert({
        user_id: user.id,
        file_path: filePath,
        transcript: transcript,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving recording:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save recording' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Trigger background processing for summarization and embedding
    // Use a background job pattern - call the processing endpoint
    fetch(`${req.nextUrl.origin}/api/recordings/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recording_id: recording.id }),
    }).catch((err) => console.error('Error triggering recording processing:', err))

    return new Response(
      JSON.stringify({
        success: true,
        recording_id: recording.id,
        transcript,
        file_path: filePath,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Transcription error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
