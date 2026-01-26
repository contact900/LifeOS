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
    const type = searchParams.get('type') // 'note' | 'recording' | null (all)

    let query = supabase
      .from('templates')
      .select('*')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Templates API error:', error)
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

    const body = await req.json()
    const { name, description, type, content_json, content_text, category, icon } = body

    if (!name || !name.trim() || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    if (type === 'note' && !content_json) {
      return NextResponse.json(
        { error: 'content_json is required for note templates' },
        { status: 400 }
      )
    }

    if (type === 'recording' && !content_text) {
      return NextResponse.json(
        { error: 'content_text is required for recording templates' },
        { status: 400 }
      )
    }

    // Check if template with same name already exists for this user
    const { data: existingTemplate } = await supabase
      .from('templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 400 }
      )
    }

    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        type,
        content_json: content_json || null,
        content_text: content_text || null,
        category: category || 'general',
        icon: icon || null,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Templates API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
