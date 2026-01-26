import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
        console.error('Auth error:', authError)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError' || authErr?.message?.includes('aborted')) {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      console.error('Error getting user:', authErr)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // weekly_summary, monthly_summary, pattern, productivity
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('insight_type', type)
    }

    const { data: insights, error } = await query

    if (error) {
      console.error('Error fetching insights:', error)
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      )
    }

    return NextResponse.json({ insights: insights || [] })
  } catch (error) {
    console.error('Insights API error:', error)
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
        console.error('Auth error:', authError)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError' || authErr?.message?.includes('aborted')) {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      console.error('Error getting user:', authErr)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { insight_type, period_start, period_end } = body

    if (!insight_type || !period_start || !period_end) {
      return NextResponse.json(
        { error: 'insight_type, period_start, and period_end are required' },
        { status: 400 }
      )
    }

    // Generate insight based on type
    const insight = await generateInsight(
      supabase,
      user.id,
      insight_type,
      new Date(period_start),
      new Date(period_end)
    )

    return NextResponse.json({ insight })
  } catch (error) {
    console.error('Insights API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateInsight(
  supabase: any,
  userId: string,
  insightType: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Collect data for the period
  const data = await collectPeriodData(supabase, userId, periodStart, periodEnd)

  // Generate AI insight
  const prompt = getInsightPrompt(insightType, data, periodStart, periodEnd)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant that provides insightful analysis of user data. Provide clear, actionable insights in a friendly, professional tone.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const analysis = JSON.parse(
    response.choices[0]?.message?.content || '{}'
  )

  // Save insight to database
  const { data: insight, error } = await supabase
    .from('insights')
    .insert({
      user_id: userId,
      insight_type: insightType,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      title: analysis.title || `${insightType} Summary`,
      content: analysis.content || '',
      insights_data: analysis.insights || {},
      patterns: analysis.patterns || [],
      metrics: analysis.metrics || {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving insight:', error)
    throw error
  }

  return insight
}

async function collectPeriodData(
  supabase: any,
  userId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const startISO = periodStart.toISOString()
  const endISO = periodEnd.toISOString()

  // Get tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  // Get notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  // Get recordings
  const { data: recordings } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  // Get goals
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  // Get events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startISO)
    .lte('start_time', endISO)

  // Get reminders
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  return {
    tasks: tasks || [],
    notes: notes || [],
    recordings: recordings || [],
    goals: goals || [],
    events: events || [],
    reminders: reminders || [],
  }
}

function getInsightPrompt(
  insightType: string,
  data: any,
  periodStart: Date,
  periodEnd: Date
): string {
  const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  const isWeekly = periodDays <= 7
  const isMonthly = periodDays > 7 && periodDays <= 31

  const tasksCompleted = data.tasks.filter((t: any) => t.status === 'done').length
  const tasksTotal = data.tasks.length
  const notesCount = data.notes.length
  const recordingsCount = data.recordings.length
  const goalsCount = data.goals.length
  const eventsCount = data.events.length

  let prompt = `Analyze the following user activity data for a ${isWeekly ? 'week' : isMonthly ? 'month' : 'period'} from ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}:

TASKS:
- Total tasks: ${tasksTotal}
- Completed: ${tasksCompleted}
- Completion rate: ${tasksTotal > 0 ? ((tasksCompleted / tasksTotal) * 100).toFixed(1) : 0}%

NOTES:
- Notes created: ${notesCount}

RECORDINGS:
- Recordings created: ${recordingsCount}

GOALS:
- Goals tracked: ${goalsCount}

EVENTS:
- Events scheduled: ${eventsCount}

Provide a comprehensive analysis in JSON format with:
{
  "title": "A descriptive title for this ${insightType}",
  "content": "A detailed summary (2-3 paragraphs) highlighting key activities, achievements, and trends",
  "insights": {
    "key_achievements": ["achievement1", "achievement2"],
    "areas_for_improvement": ["area1", "area2"],
    "trends": ["trend1", "trend2"]
  },
  "patterns": [
    {
      "type": "pattern_type",
      "description": "pattern description",
      "confidence": 0.8
    }
  ],
  "metrics": {
    "productivity_score": 0.75,
    "consistency_score": 0.65,
    "engagement_score": 0.70
  }
}`

  if (insightType === 'productivity') {
    prompt += `\n\nFocus on productivity metrics, time management, and efficiency patterns.`
  } else if (insightType.includes('pattern')) {
    prompt += `\n\nFocus on identifying recurring patterns, habits, and behavioral trends.`
  }

  return prompt
}
