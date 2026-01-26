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

    // Get associated recordings
    const { data: eventRecordings, error } = await supabase
      .from('event_recordings')
      .select('recording_id')
      .eq('event_id', params.id)

    if (error) {
      console.error('Error fetching event recordings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch event recordings' },
        { status: 500 }
      )
    }

    const recordingIds = eventRecordings?.map((er) => er.recording_id) || []

    if (recordingIds.length === 0) {
      return NextResponse.json({ recordings: [] })
    }

    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('*')
      .in('id', recordingIds)
      .eq('user_id', user.id)

    if (recordingsError) {
      console.error('Error fetching recordings:', recordingsError)
      return NextResponse.json(
        { error: 'Failed to fetch recordings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ recordings: recordings || [] })
  } catch (error) {
    console.error('Event recordings API error:', error)
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
    const { recording_id } = body

    if (!recording_id) {
      return NextResponse.json(
        { error: 'recording_id is required' },
        { status: 400 }
      )
    }

    // Verify event and recording belong to user
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: recording } = await supabase
      .from('recordings')
      .select('id')
      .eq('id', recording_id)
      .eq('user_id', user.id)
      .single()

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    // Associate recording with event
    const { data, error } = await supabase
      .from('event_recordings')
      .insert({
        event_id: params.id,
        recording_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error associating recording with event:', error)
      return NextResponse.json(
        { error: 'Failed to associate recording with event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, association: data })
  } catch (error) {
    console.error('Event recordings API error:', error)
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
    const recording_id = searchParams.get('recording_id')

    if (!recording_id) {
      return NextResponse.json(
        { error: 'recording_id is required' },
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
      .from('event_recordings')
      .delete()
      .eq('event_id', params.id)
      .eq('recording_id', recording_id)

    if (error) {
      console.error('Error removing recording from event:', error)
      return NextResponse.json(
        { error: 'Failed to remove recording from event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Event recordings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
