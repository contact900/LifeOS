import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    let user
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError') {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get productivity metrics
    const { data: metrics, error } = await supabase
      .from('productivity_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true })

    if (error) {
      console.error('Error fetching productivity metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch productivity metrics' },
        { status: 500 }
      )
    }

    // Calculate aggregate statistics
    const totalTasksCompleted = metrics?.reduce((sum, m) => sum + (m.tasks_completed || 0), 0) || 0
    const totalTasksCreated = metrics?.reduce((sum, m) => sum + (m.tasks_created || 0), 0) || 0
    const totalNotes = metrics?.reduce((sum, m) => sum + (m.notes_created || 0), 0) || 0
    const totalRecordings = metrics?.reduce((sum, m) => sum + (m.recordings_created || 0), 0) || 0
    const avgGoalProgress = metrics?.length > 0
      ? metrics.reduce((sum, m) => sum + (parseFloat(m.goals_progress) || 0), 0) / metrics.length
      : 0

    const stats = {
      period_days: days,
      total_tasks_completed: totalTasksCompleted,
      total_tasks_created: totalTasksCreated,
      task_completion_rate: totalTasksCreated > 0 ? (totalTasksCompleted / totalTasksCreated) * 100 : 0,
      total_notes: totalNotes,
      total_recordings: totalRecordings,
      avg_goal_progress: avgGoalProgress,
      daily_metrics: metrics || [],
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Productivity API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    let user
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError') {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate and save productivity metrics for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const metrics = await calculateDailyMetrics(supabase, user.id, today)

    // Upsert metrics
    const { data: saved, error } = await supabase
      .from('productivity_metrics')
      .upsert(
        {
          user_id: user.id,
          metric_date: todayStr,
          ...metrics,
        },
        {
          onConflict: 'user_id,metric_date',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving productivity metrics:', error)
      return NextResponse.json(
        { error: 'Failed to save productivity metrics' },
        { status: 500 }
      )
    }

    return NextResponse.json({ metrics: saved })
  } catch (error) {
    console.error('Productivity API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateDailyMetrics(
  supabase: any,
  userId: string,
  date: Date
) {
  const startISO = new Date(date).toISOString()
  const endISO = new Date(date)
  endISO.setHours(23, 59, 59, 999)
  const endISOStr = endISO.toISOString()

  // Get tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISOStr)

  // Get notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISOStr)

  // Get recordings
  const { data: recordings } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISOStr)

  // Get goals progress
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')

  const tasksCompleted = tasks?.filter((t: any) => t.status === 'done').length || 0
  const tasksCreated = tasks?.length || 0
  const notesCreated = notes?.length || 0
  const recordingsCreated = recordings?.length || 0

  // Calculate average goal progress
  const avgProgress = goals && goals.length > 0
    ? goals.reduce((sum: number, g: any) => sum + (g.progress || 0), 0) / goals.length
    : 0

  // Calculate category distribution
  const categoryCounts: Record<string, number> = {}
  tasks?.forEach((t: any) => {
    const cat = t.category || 'general'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })

  return {
    tasks_completed: tasksCompleted,
    tasks_created: tasksCreated,
    notes_created: notesCreated,
    recordings_created: recordingsCreated,
    goals_progress: avgProgress,
    category_distribution: categoryCounts,
  }
}
