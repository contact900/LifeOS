import { createClient } from '@/lib/supabase/server'

export interface EventSearchResult {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  location: string | null
  category: 'finance' | 'work' | 'health' | 'general'
  color: string | null
  reminder_minutes: number[] | null
}

/**
 * Get user's events
 */
export async function getUserEvents(
  userId: string,
  startDate?: string,
  endDate?: string,
  category?: 'finance' | 'work' | 'health' | 'general'
): Promise<EventSearchResult[]> {
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true })

  if (startDate) {
    query = query.gte('start_date', startDate)
  }

  if (endDate) {
    query = query.lte('start_date', endDate)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return (data || []) as EventSearchResult[]
}

/**
 * Create an event
 */
export async function createEvent(
  userId: string,
  title: string,
  startDate: string,
  options?: {
    description?: string
    endDate?: string
    allDay?: boolean
    location?: string
    category?: 'finance' | 'work' | 'health' | 'general'
    reminderMinutes?: number[]
  }
): Promise<EventSearchResult | null> {
  const supabase = await createClient()

  const categoryColors: Record<string, string> = {
    finance: '#ef4444',
    work: '#3b82f6',
    health: '#10b981',
    general: '#6b7280',
  }

  const category = options?.category || 'general'

  let finalStartDate = startDate
  let finalEndDate = options?.endDate || startDate

  if (options?.allDay) {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    finalStartDate = start.toISOString()

    if (options.endDate) {
      const end = new Date(options.endDate)
      end.setHours(23, 59, 59, 999)
      finalEndDate = end.toISOString()
    } else {
      const end = new Date(startDate)
      end.setHours(23, 59, 59, 999)
      finalEndDate = end.toISOString()
    }
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      title,
      description: options?.description || null,
      start_date: finalStartDate,
      end_date: finalEndDate || null,
      all_day: options?.allDay || false,
      location: options?.location || null,
      category,
      color: categoryColors[category] || null,
      reminder_minutes: options?.reminderMinutes && options.reminderMinutes.length > 0
        ? options.reminderMinutes
        : null,
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating event:', error)
    console.error('Event data attempted:', {
      user_id: userId,
      title,
      start_date: finalStartDate,
      end_date: finalEndDate,
      all_day: options?.allDay || false,
      category,
    })
    return null
  }
  
  console.log('✅ Event created successfully:', {
    id: data.id,
    title: data.title,
    start_date: data.start_date,
    end_date: data.end_date,
  })

  // Create reminders if reminder_minutes is provided
  if (options?.reminderMinutes && options.reminderMinutes.length > 0) {
    for (const minutes of options.reminderMinutes) {
      const reminderDate = new Date(finalStartDate)
      reminderDate.setMinutes(reminderDate.getMinutes() - minutes)

      await supabase.from('reminders').insert({
        user_id: userId,
        title: `Reminder: ${title}`,
        description: options.description || `Event: ${title}`,
        due_date: reminderDate.toISOString(),
        browser_notification: true,
        email_notification: false,
        category,
        context: `Event reminder for: ${title}`,
      })
    }
  }

  return data as EventSearchResult
}

/**
 * Update an event
 */
export async function updateEvent(
  userId: string,
  eventId: string,
  updates: {
    title?: string
    description?: string
    start_date?: string
    end_date?: string
    allDay?: boolean
    location?: string
    category?: 'finance' | 'work' | 'health' | 'general'
    reminderMinutes?: number[]
  }
): Promise<EventSearchResult | null> {
  const supabase = await createClient()

  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.start_date !== undefined) updateData.start_date = updates.start_date
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date
  if (updates.allDay !== undefined) updateData.all_day = updates.allDay
  if (updates.location !== undefined) updateData.location = updates.location
  if (updates.category !== undefined) {
    updateData.category = updates.category
    const categoryColors: Record<string, string> = {
      finance: '#ef4444',
      work: '#3b82f6',
      health: '#10b981',
      general: '#6b7280',
    }
    updateData.color = categoryColors[updates.category] || null
  }
  if (updates.reminderMinutes !== undefined) {
    updateData.reminder_minutes =
      updates.reminderMinutes.length > 0 ? updates.reminderMinutes : null
  }

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating event:', error)
    return null
  }

  return data as EventSearchResult
}
