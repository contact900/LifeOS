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

    let query: any

    // If filtering by tag, join with recordings_tags
    if (tagId) {
      query = supabase
        .from('recordings')
        .select('*, recordings_tags!inner(tag_id)')
        .eq('user_id', user.id)
        .eq('recordings_tags.tag_id', tagId)
    } else {
      query = supabase
        .from('recordings')
        .select('*')
        .eq('user_id', user.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recordings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recordings' },
        { status: 500 }
      )
    }

    // If we filtered by tag, normalize the data structure
    const recordings = data?.map((recording: any) => {
      if (recording.recordings_tags) {
        const { recordings_tags, ...recordingData } = recording
        return recordingData
      }
      return recording
    }) || []

    return NextResponse.json({ recordings })
  } catch (error) {
    console.error('Recordings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
