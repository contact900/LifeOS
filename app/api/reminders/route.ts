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
    const upcoming = searchParams.get('upcoming') === 'true'
    const completed = searchParams.get('completed') === 'true'
    const limit = searchParams.get('limit')

    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)

    if (upcoming) {
      query = query
        .is('completed_at', null)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
    } else if (completed) {
      query = query
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
    } else {
      query = query
        .is('completed_at', null)
        .order('due_date', { ascending: true })
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: reminders, error } = await query

    if (error) {
      console.error('Error fetching reminders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reminders: reminders || [] })
  } catch (error) {
    console.error('Reminders API error:', error)
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
    const {
      title,
      description,
      due_date,
      email_notification = false,
      browser_notification = true,
      category = 'general',
      priority = 'medium',
      context,
    } = body

    if (!title || !title.trim() || !due_date) {
      return NextResponse.json(
        { error: 'Title and due_date are required' },
        { status: 400 }
      )
    }

    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        due_date,
        email_notification,
        browser_notification,
        category,
        priority,
        context: context || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating reminder:', error)
      return NextResponse.json(
        { error: 'Failed to create reminder' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reminder })
  } catch (error) {
    console.error('Reminders API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
