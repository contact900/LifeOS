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
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = supabase
      .from('insight_patterns')
      .select('*')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: patterns, error } = await query

    if (error) {
      console.error('Error fetching patterns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch patterns' },
        { status: 500 }
      )
    }

    return NextResponse.json({ patterns: patterns || [] })
  } catch (error) {
    console.error('Patterns API error:', error)
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

    // Collect historical data for pattern detection
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const data = await collectPatternData(supabase, user.id, thirtyDaysAgo, new Date())

    // Detect patterns using AI
    const patterns = await detectPatterns(data)

    // Save patterns to database
    const savedPatterns = []
    for (const pattern of patterns) {
      const { data: saved, error } = await supabase
        .from('insight_patterns')
        .upsert(
          {
            user_id: user.id,
            pattern_type: pattern.type,
            pattern_name: pattern.name,
            description: pattern.description,
            confidence_score: pattern.confidence,
            data_points: pattern.data_points,
            is_active: true,
          },
          {
            onConflict: 'user_id,pattern_type,pattern_name',
          }
        )
        .select()
        .single()

      if (!error && saved) {
        savedPatterns.push(saved)
      }
    }

    return NextResponse.json({ patterns: savedPatterns })
  } catch (error) {
    console.error('Patterns API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function collectPatternData(
  supabase: any,
  userId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const startISO = periodStart.toISOString()
  const endISO = periodEnd.toISOString()

  // Get all relevant data
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  const { data: recordings } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startISO)
    .lte('start_time', endISO)

  return {
    tasks: tasks || [],
    notes: notes || [],
    recordings: recordings || [],
    goals: goals || [],
    events: events || [],
  }
}

async function detectPatterns(data: any): Promise<any[]> {
  const prompt = `Analyze the following user activity data and identify behavioral patterns. Look for:
- Task completion patterns (time of day, day of week)
- Note-taking frequency and topics
- Recording habits
- Goal progress patterns
- Time usage patterns
- Category distribution patterns

Data:
- Tasks: ${data.tasks.length} total, ${data.tasks.filter((t: any) => t.status === 'done').length} completed
- Notes: ${data.notes.length}
- Recordings: ${data.recordings.length}
- Goals: ${data.goals.length}
- Events: ${data.events.length}

Respond in JSON format with an array of patterns:
[
  {
    "type": "task_completion|note_frequency|recording_habits|goal_progress|time_usage|category_distribution|productivity_trend",
    "name": "Pattern name",
    "description": "Detailed description of the pattern",
    "confidence": 0.85,
    "data_points": [{"key": "value"}]
  }
]`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an AI pattern recognition expert. Identify meaningful patterns in user behavior data.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(
    response.choices[0]?.message?.content || '{"patterns": []}'
  )

  return result.patterns || []
}
