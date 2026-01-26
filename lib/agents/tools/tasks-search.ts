import { createClient } from '@/lib/supabase/server'

export interface TaskSearchResult {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  category: 'finance' | 'work' | 'health' | 'general'
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Search tasks by title, description, or category
 */
export async function searchTasks(
  userId: string,
  query: string,
  limit: number = 10,
  status?: 'todo' | 'in_progress' | 'done',
  category?: 'finance' | 'work' | 'health' | 'general'
): Promise<TaskSearchResult[]> {
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category)
  }

  const { data: tasks, error } = await queryBuilder

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }

  if (!tasks || tasks.length === 0) {
    return []
  }

  const queryLower = query.toLowerCase()

  // Filter tasks by search query
  const filteredTasks = tasks.filter((task) => {
    const titleMatch = task.title?.toLowerCase().includes(queryLower)
    const descriptionMatch = task.description?.toLowerCase().includes(queryLower)
    const categoryMatch = task.category?.toLowerCase().includes(queryLower)
    return titleMatch || descriptionMatch || categoryMatch
  })

  return filteredTasks.slice(0, limit) as TaskSearchResult[]
}

/**
 * Get all tasks for a user
 */
export async function getAllTasks(
  userId: string,
  status?: 'todo' | 'in_progress' | 'done',
  category?: 'finance' | 'work' | 'health' | 'general'
): Promise<TaskSearchResult[]> {
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category)
  }

  const { data: tasks, error } = await queryBuilder

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }

  return (tasks || []) as TaskSearchResult[]
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  title: string,
  description?: string,
  status: 'todo' | 'in_progress' | 'done' = 'todo',
  priority: 'low' | 'medium' | 'high' = 'medium',
  category: 'finance' | 'work' | 'health' | 'general' = 'general',
  dueDate?: string
): Promise<TaskSearchResult | null> {
  const supabase = await createClient()

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      status,
      priority,
      category,
      due_date: dueDate || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    return null
  }

  return task as TaskSearchResult
}

/**
 * Update a task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  updates: {
    title?: string
    description?: string
    status?: 'todo' | 'in_progress' | 'done'
    priority?: 'low' | 'medium' | 'high'
    category?: 'finance' | 'work' | 'health' | 'general'
    dueDate?: string | null
  }
): Promise<TaskSearchResult | null> {
  const supabase = await createClient()

  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.status !== undefined) {
    updateData.status = updates.status
    if (updates.status === 'done') {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
    }
  }
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    return null
  }

  return task as TaskSearchResult
}
