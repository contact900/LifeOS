import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    return NextResponse.json({ notes: data || [] })
  } catch (error) {
    console.error('Notes API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, content_json } = await req.json()

    if (!title || !content_json) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title,
        content_json: typeof content_json === 'string' ? JSON.parse(content_json) : content_json,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    // Trigger background processing
    fetch(`${req.nextUrl.origin}/api/notes/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_id: data.id }),
    }).catch((err) => console.error('Error triggering note processing:', err))

    return NextResponse.json({ note: data })
  } catch (error) {
    console.error('Notes API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
