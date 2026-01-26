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

    const { data: reminder, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching reminder:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reminder' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reminder })
  } catch (error) {
    console.error('Reminder API error:', error)
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
    const {
      title,
      description,
      due_date,
      completed_at,
      email_notification,
      browser_notification,
      category,
      priority,
      context,
      notification_sent,
    } = body

    const updates: any = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (due_date !== undefined) updates.due_date = due_date
    if (completed_at !== undefined) updates.completed_at = completed_at
    if (email_notification !== undefined) updates.email_notification = email_notification
    if (browser_notification !== undefined) updates.browser_notification = browser_notification
    if (category !== undefined) updates.category = category
    if (priority !== undefined) updates.priority = priority
    if (context !== undefined) updates.context = context
    if (notification_sent !== undefined) updates.notification_sent = notification_sent

    const { data: reminder, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating reminder:', error)
      return NextResponse.json(
        { error: 'Failed to update reminder' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reminder })
  } catch (error) {
    console.error('Reminder API error:', error)
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

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting reminder:', error)
      return NextResponse.json(
        { error: 'Failed to delete reminder' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reminder API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
