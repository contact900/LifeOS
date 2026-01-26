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

    // Verify goal belongs to user
    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const { data: milestones, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('goal_id', params.id)
      .order('order_index', { ascending: true })
      .order('target_date', { ascending: true })

    if (error) {
      console.error('Error fetching milestones:', error)
      return NextResponse.json(
        { error: 'Failed to fetch milestones' },
        { status: 500 }
      )
    }

    return NextResponse.json({ milestones: milestones || [] })
  } catch (error) {
    console.error('Milestones API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    // Verify goal belongs to user
    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, target_date, order_index } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Get max order_index if not provided
    let finalOrderIndex = order_index
    if (finalOrderIndex === undefined) {
      const { data: existing } = await supabase
        .from('milestones')
        .select('order_index')
        .eq('goal_id', params.id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()

      finalOrderIndex = existing ? (existing.order_index || 0) + 1 : 0
    }

    const { data: milestone, error } = await supabase
      .from('milestones')
      .insert({
        goal_id: params.id,
        title: title.trim(),
        description: description?.trim() || null,
        target_date: target_date || null,
        order_index: finalOrderIndex,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating milestone:', error)
      return NextResponse.json(
        { error: 'Failed to create milestone' },
        { status: 500 }
      )
    }

    return NextResponse.json({ milestone })
  } catch (error) {
    console.error('Milestones API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
