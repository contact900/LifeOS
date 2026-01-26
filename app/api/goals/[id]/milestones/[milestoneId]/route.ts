import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: { id: string; milestoneId: string } }
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
    const { title, description, target_date, completed_at, order_index } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (target_date !== undefined) updateData.target_date = target_date || null
    if (completed_at !== undefined) updateData.completed_at = completed_at || null
    if (order_index !== undefined) updateData.order_index = order_index

    const { data: milestone, error } = await supabase
      .from('milestones')
      .update(updateData)
      .eq('id', params.milestoneId)
      .eq('goal_id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating milestone:', error)
      return NextResponse.json(
        { error: 'Failed to update milestone' },
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; milestoneId: string } }
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

    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', params.milestoneId)
      .eq('goal_id', params.id)

    if (error) {
      console.error('Error deleting milestone:', error)
      return NextResponse.json(
        { error: 'Failed to delete milestone' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Milestones API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
