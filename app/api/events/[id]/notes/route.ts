import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify event belongs to user
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get associated notes
    const { data: eventNotes, error } = await supabase
      .from('event_notes')
      .select('note_id')
      .eq('event_id', params.id)

    if (error) {
      console.error('Error fetching event notes:', error)
      return NextResponse.json(
        { error: 'Failed to fetch event notes' },
        { status: 500 }
      )
    }

    const noteIds = eventNotes?.map((en) => en.note_id) || []

    if (noteIds.length === 0) {
      return NextResponse.json({ notes: [] })
    }

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .in('id', noteIds)
      .eq('user_id', user.id)

    if (notesError) {
      console.error('Error fetching notes:', notesError)
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notes: notes || [] })
  } catch (error) {
    console.error('Event notes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { note_id } = body

    if (!note_id) {
      return NextResponse.json(
        { error: 'note_id is required' },
        { status: 400 }
      )
    }

    // Verify event and note belong to user
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: note } = await supabase
      .from('notes')
      .select('id')
      .eq('id', note_id)
      .eq('user_id', user.id)
      .single()

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Associate note with event
    const { data, error } = await supabase
      .from('event_notes')
      .insert({
        event_id: params.id,
        note_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error associating note with event:', error)
      return NextResponse.json(
        { error: 'Failed to associate note with event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, association: data })
  } catch (error) {
    console.error('Event notes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const note_id = searchParams.get('note_id')

    if (!note_id) {
      return NextResponse.json(
        { error: 'note_id is required' },
        { status: 400 }
      )
    }

    // Verify event belongs to user
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('event_notes')
      .delete()
      .eq('event_id', params.id)
      .eq('note_id', note_id)

    if (error) {
      console.error('Error removing note from event:', error)
      return NextResponse.json(
        { error: 'Failed to remove note from event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Event notes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
