import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tagId = searchParams.get('tag_id')

    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)

    // If filtering by tag, join with notes_tags
    if (tagId) {
      query = supabase
        .from('notes')
        .select('*, notes_tags!inner(tag_id)')
        .eq('user_id', user.id)
        .eq('notes_tags.tag_id', tagId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    // If we filtered by tag, the data structure is different, so normalize it
    const notes = data?.map((note: any) => {
      if (note.notes_tags) {
        const { notes_tags, ...noteData } = note
        return noteData
      }
      return note
    }) || []

    return NextResponse.json({ notes })
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
