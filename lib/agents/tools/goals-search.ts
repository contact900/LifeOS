import { createClient } from '@/lib/supabase/server'

export interface GoalSearchResult {
  id: string
  title: string
  description: string | null
  category: 'finance' | 'work' | 'health' | 'personal' | 'general'
  target_date: string | null
  start_date: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  progress: number
  priority: 'low' | 'medium' | 'high'
  color: string | null
}

/**
 * Get user's goals
 */
export async function getUserGoals(
  userId: string,
  status?: 'active' | 'completed' | 'paused' | 'cancelled',
  category?: 'finance' | 'work' | 'health' | 'personal' | 'general'
): Promise<GoalSearchResult[]> {
  const supabase = await createClient()

  let query = supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching goals:', error)
    return []
  }

  return (data || []) as GoalSearchResult[]
}

/**
 * Create a goal
 */
export async function createGoal(
  userId: string,
  title: string,
  options?: {
    description?: string
    category?: 'finance' | 'work' | 'health' | 'personal' | 'general'
    targetDate?: string
    priority?: 'low' | 'medium' | 'high'
    progress?: number
  }
): Promise<GoalSearchResult | null> {
  const supabase = await createClient()

  const categoryColors: Record<string, string> = {
    finance: '#ef4444',
    work: '#3b82f6',
    health: '#10b981',
    personal: '#8b5cf6',
    general: '#6b7280',
  }

  const category = options?.category || 'general'

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title,
      description: options?.description || null,
      category,
      target_date: options?.targetDate || null,
      priority: options?.priority || 'medium',
      progress: options?.progress || 0,
      status: 'active',
      color: categoryColors[category] || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating goal:', error)
    return null
  }

  // Log initial progress
  await supabase.from('goal_progress_log').insert({
    goal_id: data.id,
    progress: options?.progress || 0,
    notes: 'Goal created',
  })

  return data as GoalSearchResult
}

/**
 * Update a goal
 */
export async function updateGoal(
  userId: string,
  goalId: string,
  updates: {
    title?: string
    description?: string
    category?: 'finance' | 'work' | 'health' | 'personal' | 'general'
    targetDate?: string | null
    status?: 'active' | 'completed' | 'paused' | 'cancelled'
    progress?: number
    priority?: 'low' | 'medium' | 'high'
  }
): Promise<GoalSearchResult | null> {
  const supabase = await createClient()

  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description || null
  if (updates.category !== undefined) {
    updateData.category = updates.category
    const categoryColors: Record<string, string> = {
      finance: '#ef4444',
      work: '#3b82f6',
      health: '#10b981',
      personal: '#8b5cf6',
      general: '#6b7280',
    }
    updateData.color = categoryColors[updates.category] || null
  }
  if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.priority !== undefined) updateData.priority = updates.priority

  // If progress is being updated, log it
  if (updates.progress !== undefined) {
    updateData.progress = updates.progress
    
    await supabase.from('goal_progress_log').insert({
      goal_id: goalId,
      progress: updates.progress,
      notes: 'Progress updated',
    })
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating goal:', error)
    return null
  }

  return data as GoalSearchResult
}

/**
 * Get goal progress insights
 */
export async function getGoalProgressInsights(
  userId: string,
  goalId: string
): Promise<{
  currentProgress: number
  progressHistory: Array<{ date: string; progress: number }>
  milestonesCompleted: number
  totalMilestones: number
  daysRemaining: number | null
  averageProgressPerDay: number
}> {
  const supabase = await createClient()

  // Get goal
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single()

  if (!goal) {
    throw new Error('Goal not found')
  }

  // Get progress log
  const { data: progressLog } = await supabase
    .from('goal_progress_log')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: true })

  // Get milestones
  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('goal_id', goalId)

  const completedMilestones = milestones?.filter((m) => m.completed_at) || []
  const totalMilestones = milestones?.length || 0

  // Calculate days remaining
  let daysRemaining: number | null = null
  if (goal.target_date) {
    const target = new Date(goal.target_date)
    const now = new Date()
    const diff = target.getTime() - now.getTime()
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Calculate average progress per day
  let averageProgressPerDay = 0
  if (progressLog && progressLog.length > 1) {
    const firstProgress = progressLog[0].progress
    const lastProgress = progressLog[progressLog.length - 1].progress
    const firstDate = new Date(progressLog[0].created_at)
    const lastDate = new Date(progressLog[progressLog.length - 1].created_at)
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff > 0) {
      averageProgressPerDay = (lastProgress - firstProgress) / daysDiff
    }
  }

  return {
    currentProgress: goal.progress,
    progressHistory: (progressLog || []).map((log) => ({
      date: log.created_at,
      progress: log.progress,
    })),
    milestonesCompleted: completedMilestones.length,
    totalMilestones,
    daysRemaining,
    averageProgressPerDay,
  }
}
