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

    // Delete notes (cascade will handle related records)
    const { error } = await supabase
      .from('notes')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting notes:', error)
      return NextResponse.json(
        { error: 'Failed to delete notes' },
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

    const { ids, action, tagId, category } = await req.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. IDs array required.' },
        { status: 400 }
      )
    }

    if (action === 'tag' && tagId) {
      // Add tag to all selected notes
      const tagAssignments = ids.map((noteId: string) => ({
        note_id: noteId,
        tag_id: tagId,
        user_id: user.id,
      }))

      // Use upsert to avoid duplicates
      const { error } = await supabase
        .from('notes_tags')
        .upsert(tagAssignments, {
          onConflict: 'note_id,tag_id',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error('Error tagging notes:', error)
        return NextResponse.json(
          { error: 'Failed to tag notes' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, tagged: ids.length })
    }

    if (action === 'export') {
      // Fetch all notes
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .in('id', ids)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching notes for export:', error)
        return NextResponse.json(
          { error: 'Failed to fetch notes' },
          { status: 500 }
        )
      }

      // Format as JSON
      const exportData = {
        exportDate: new Date().toISOString(),
        type: 'notes',
        count: notes?.length || 0,
        notes: notes || [],
      }

      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="notes-export-${Date.now()}.json"`,
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
