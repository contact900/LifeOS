import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids } = await req.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. IDs array required.' },
        { status: 400 }
      )
    }

    // Delete recordings
    const { error } = await supabase
      .from('recordings')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting recordings:', error)
      return NextResponse.json(
        { error: 'Failed to delete recordings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Bulk delete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

    const { ids, action, tagId } = await req.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. IDs array required.' },
        { status: 400 }
      )
    }

    if (action === 'tag' && tagId) {
      // Add tag to all selected recordings
      const tagAssignments = ids.map((recordingId: string) => ({
        recording_id: recordingId,
        tag_id: tagId,
        user_id: user.id,
      }))

      const { error } = await supabase
        .from('recordings_tags')
        .upsert(tagAssignments, {
          onConflict: 'recording_id,tag_id',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error('Error tagging recordings:', error)
        return NextResponse.json(
          { error: 'Failed to tag recordings' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, tagged: ids.length })
    }

    if (action === 'export') {
      // Fetch all recordings
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('*')
        .in('id', ids)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching recordings for export:', error)
        return NextResponse.json(
          { error: 'Failed to fetch recordings' },
          { status: 500 }
        )
      }

      // Format as JSON
      const exportData = {
        exportDate: new Date().toISOString(),
        type: 'recordings',
        count: recordings?.length || 0,
        recordings: recordings || [],
      }

      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="recordings-export-${Date.now()}.json"`,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Bulk operation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
