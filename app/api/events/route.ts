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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const category = searchParams.get('category')

    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)

    if (startDate) {
      query = query.gte('start_date', startDate)
    }

    if (endDate) {
      query = query.lte('start_date', endDate)
    }

    if (category) {
      query = query.eq('category', category)
    }

    query = query.order('start_date', { ascending: true })

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    return NextResponse.json({ events: events || [] })
  } catch (error) {
    console.error('Events API error:', error)
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
      start_date,
      end_date,
      all_day = false,
      location,
      category = 'general',
      color,
      reminder_minutes = [],
    } = body

    if (!title || !title.trim() || !start_date) {
      return NextResponse.json(
        { error: 'Title and start_date are required' },
        { status: 400 }
      )
    }

    // If all_day, set times to start/end of day
    let finalStartDate = start_date
    let finalEndDate = end_date || start_date

    if (all_day) {
      const start = new Date(start_date)
      start.setHours(0, 0, 0, 0)
      finalStartDate = start.toISOString()

      if (end_date) {
        const end = new Date(end_date)
        end.setHours(23, 59, 59, 999)
        finalEndDate = end.toISOString()
      } else {
        const end = new Date(start_date)
        end.setHours(23, 59, 59, 999)
        finalEndDate = end.toISOString()
      }
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        start_date: finalStartDate,
        end_date: finalEndDate || null,
        all_day,
        location: location?.trim() || null,
        category,
        color: color || null,
        reminder_minutes: reminder_minutes.length > 0 ? reminder_minutes : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    // Create reminders if reminder_minutes is provided
    if (reminder_minutes && reminder_minutes.length > 0) {
      for (const minutes of reminder_minutes) {
        const reminderDate = new Date(finalStartDate)
        reminderDate.setMinutes(reminderDate.getMinutes() - minutes)

        await supabase.from('reminders').insert({
          user_id: user.id,
          title: `Reminder: ${title.trim()}`,
          description: description || `Event: ${title.trim()}`,
          due_date: reminderDate.toISOString(),
          browser_notification: true,
          email_notification: false,
          category,
          context: `Event reminder for: ${title.trim()}`,
        })
      }
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
