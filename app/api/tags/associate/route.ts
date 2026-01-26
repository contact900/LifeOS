import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { resource_type, resource_id, tag_ids } = body

    if (!resource_type || !resource_id || !Array.isArray(tag_ids)) {
      return NextResponse.json(
        { error: 'Invalid request: resource_type, resource_id, and tag_ids array required' },
        { status: 400 }
      )
    }

    // Determine which junction table to use
    let junctionTable: string
    let resourceColumn: string

    switch (resource_type) {
      case 'note':
        junctionTable = 'notes_tags'
        resourceColumn = 'note_id'
        break
      case 'recording':
        junctionTable = 'recordings_tags'
        resourceColumn = 'recording_id'
        break
      case 'task':
        junctionTable = 'tasks_tags'
        resourceColumn = 'task_id'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid resource_type. Must be note, recording, or task' },
          { status: 400 }
        )
    }

    // First, remove all existing associations for this resource
    await supabase
      .from(junctionTable)
      .delete()
      .eq(resourceColumn, resource_id)

    // Then, insert new associations
    if (tag_ids.length > 0) {
      const associations = tag_ids.map((tag_id: string) => ({
        [resourceColumn]: resource_id,
        tag_id,
      }))

      const { error: insertError } = await supabase
        .from(junctionTable)
        .insert(associations)

      if (insertError) {
        console.error('Error associating tags:', insertError)
        return NextResponse.json(
          { error: 'Failed to associate tags' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tag association API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const resource_type = searchParams.get('resource_type')
    const resource_id = searchParams.get('resource_id')

    if (!resource_type || !resource_id) {
      return NextResponse.json(
        { error: 'resource_type and resource_id required' },
        { status: 400 }
      )
    }

    // Determine which junction table to use
    let junctionTable: string
    let resourceColumn: string

    switch (resource_type) {
      case 'note':
        junctionTable = 'notes_tags'
        resourceColumn = 'note_id'
        break
      case 'recording':
        junctionTable = 'recordings_tags'
        resourceColumn = 'recording_id'
        break
      case 'task':
        junctionTable = 'tasks_tags'
        resourceColumn = 'task_id'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid resource_type' },
          { status: 400 }
        )
    }

    // Get tags for this resource
    const { data: associations, error } = await supabase
      .from(junctionTable)
      .select('tag_id, tags(*)')
      .eq(resourceColumn, resource_id)

    if (error) {
      console.error('Error fetching tag associations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    const tags = associations?.map((a: any) => a.tags).filter(Boolean) || []

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Tag association API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
