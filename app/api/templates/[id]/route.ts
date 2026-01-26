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

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', params.id)
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .single()

    if (error) {
      console.error('Error fetching template:', error)
      return NextResponse.json(
        { error: 'Failed to fetch template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { name, description, content_json, content_text, category, icon } = body

    // Check if template exists and belongs to user (not system)
    const { data: existingTemplate } = await supabase
      .from('templates')
      .select('id, is_system')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      )
    }

    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: 'Cannot modify system templates' },
        { status: 403 }
      )
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (content_json !== undefined) updates.content_json = content_json
    if (content_text !== undefined) updates.content_text = content_text
    if (category !== undefined) updates.category = category
    if (icon !== undefined) updates.icon = icon

    const { data: template, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template API error:', error)
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

    // Check if template exists and belongs to user (not system)
    const { data: existingTemplate } = await supabase
      .from('templates')
      .select('id, is_system')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      )
    }

    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
