import { createClient } from '@/lib/supabase/server'

export interface ReminderSearchResult {
  id: string
  title: string
  description: string | null
  due_date: string
  category: string
  priority: string
  context: string | null
  completed_at: string | null
}

/**
 * Get user's reminders
 */
export async function getUserReminders(
  userId: string,
  upcoming: boolean = true
): Promise<ReminderSearchResult[]> {
  const supabase = await createClient()

  let query = supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })

  if (upcoming) {
    query = query.is('completed_at', null).gte('due_date', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching reminders:', error)
    return []
  }

  return (data || []) as ReminderSearchResult[]
}

/**
 * Create a reminder
 */
export async function createReminder(
  userId: string,
  title: string,
  dueDate: string,
  options?: {
    description?: string
    category?: 'finance' | 'work' | 'health' | 'general'
    priority?: 'low' | 'medium' | 'high'
    emailNotification?: boolean
    browserNotification?: boolean
    context?: string
  }
): Promise<ReminderSearchResult | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      title,
      due_date: dueDate,
      description: options?.description || null,
      category: options?.category || 'general',
      priority: options?.priority || 'medium',
      email_notification: options?.emailNotification || false,
      browser_notification: options?.browserNotification !== false,
      context: options?.context || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating reminder:', error)
    return null
  }

  return data as ReminderSearchResult
}

/**
 * Update a reminder
 */
export async function updateReminder(
  userId: string,
  reminderId: string,
  updates: {
    title?: string
    description?: string
    due_date?: string
    completed_at?: string | null
    category?: 'finance' | 'work' | 'health' | 'general'
    priority?: 'low' | 'medium' | 'high'
    emailNotification?: boolean
    browserNotification?: boolean
    context?: string
  }
): Promise<ReminderSearchResult | null> {
  const supabase = await createClient()

  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date
  if (updates.completed_at !== undefined) updateData.completed_at = updates.completed_at
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.emailNotification !== undefined) updateData.email_notification = updates.emailNotification
  if (updates.browserNotification !== undefined) updateData.browser_notification = updates.browserNotification
  if (updates.context !== undefined) updateData.context = updates.context

  const { data, error } = await supabase
    .from('reminders')
    .update(updateData)
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating reminder:', error)
    return null
  }

  return data as ReminderSearchResult
}
