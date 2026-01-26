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

    // Get reminders that are due and haven't been notified
    const now = new Date().toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .is('completed_at', null)
      .eq('notification_sent', false)
      .lte('due_date', now)
      .gte('due_date', oneHourAgo)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error checking reminders:', error)
      return NextResponse.json(
        { error: 'Failed to check reminders' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reminders: reminders || [] })
  } catch (error) {
    console.error('Reminders check API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
