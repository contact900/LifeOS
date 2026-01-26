import OpenAI from 'openai'
import { searchMemories, MemoryCategory } from '@/lib/rag/vector-search'
import { searchNotes, NoteSearchResult } from '@/lib/agents/tools/notes-search'
import {
  searchRecordings,
  RecordingSearchResult,
} from '@/lib/agents/tools/recordings-search'
import {
  searchTasks,
  getAllTasks,
  createTask,
  updateTask,
  TaskSearchResult,
} from '@/lib/agents/tools/tasks-search'
import {
  suggestTags,
  getOrCreateTag,
  TagSuggestion,
} from '@/lib/agents/tools/tag-suggestions'
import {
  getUserReminders,
  createReminder,
  updateReminder,
  ReminderSearchResult,
} from '@/lib/agents/tools/reminders-search'
import {
  getUserEvents,
  createEvent,
  updateEvent,
  EventSearchResult,
} from '@/lib/agents/tools/events-search'
import {
  getUserGoals,
  createGoal,
  updateGoal,
  getGoalProgressInsights,
  GoalSearchResult,
} from '@/lib/agents/tools/goals-search'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ExpertResponse {
  response: string
  memories_used: number
  reasoning: string
}

/**
 * Base class for expert agents
 */
export abstract class BaseExpert {
  protected category: MemoryCategory
  protected expertName: string
  protected systemPrompt: string

  constructor(category: MemoryCategory, expertName: string, systemPrompt: string) {
    this.category = category
    this.expertName = expertName
    this.systemPrompt = systemPrompt
  }

  /**
   * Query relevant memories from the vector store
   * If asking about past conversations, search across all categories
   */
  protected async getRelevantMemories(
    userId: string,
    query: string
  ): Promise<string> {
    // Check if user is asking about past conversations/history
    const isAskingAboutHistory = 
      query.toLowerCase().includes('past') ||
      query.toLowerCase().includes('previous') ||
      query.toLowerCase().includes('history') ||
      query.toLowerCase().includes('conversation') ||
      query.toLowerCase().includes('chat') ||
      query.toLowerCase().includes('memory') ||
      query.toLowerCase().includes('memories') ||
      query.toLowerCase().includes('remember') ||
      query.toLowerCase().includes('what did we') ||
      query.toLowerCase().includes('what did i') ||
      query.toLowerCase().includes('like what') ||
      query.toLowerCase().includes('specifically')

    let allMemories: any[] = []

    if (isAskingAboutHistory) {
      // Search across ALL categories when asking about past conversations
      console.log(`[${this.expertName}] User asking about past conversations - searching all categories`)
      const categories: Array<'finance' | 'work' | 'health' | 'general'> = ['finance', 'work', 'health', 'general']
      
      for (const category of categories) {
        try {
          // Use lower threshold (0.3) for past conversation queries to be more inclusive
          const categoryMemories = await searchMemories(userId, category, query, 5, 0.3)
          allMemories.push(...categoryMemories)
          console.log(`[${this.expertName}] Found ${categoryMemories.length} memories in ${category} category`)
        } catch (err) {
          console.error(`[${this.expertName}] Error searching ${category} memories:`, err)
        }
      }
      
      // Sort by similarity and take top results
      allMemories.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      allMemories = allMemories.slice(0, 10) // Top 10 across all categories
    } else {
      // Normal search in this expert's category
      allMemories = await searchMemories(userId, this.category, query, 5)
    }

    if (allMemories.length === 0) {
      console.log(`[${this.expertName}] No memories found for query: "${query}"`)
      return 'No relevant memories found in the database.'
    }

    console.log(`[${this.expertName}] Found ${allMemories.length} memories, top similarity: ${((allMemories[0]?.similarity || 0) * 100).toFixed(1)}%`)

    // Format memories as context
    const context = allMemories
      .map(
        (mem, idx) =>
          `[Memory ${idx + 1}]\nSource: ${mem.source_type} (${mem.category})\nContent: ${mem.content}\nRelevance: ${((mem.similarity || 0) * 100).toFixed(1)}%`
      )
      .join('\n\n')

    const categoryLabel = isAskingAboutHistory ? 'all categories' : this.category
    return `Relevant memories from your ${categoryLabel} history:\n\n${context}`
  }

  /**
   * Search notes by query
   */
  protected async searchUserNotes(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<NoteSearchResult[]> {
    return await searchNotes(userId, query, limit)
  }

  /**
   * Search recordings by query
   */
  protected async searchUserRecordings(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<RecordingSearchResult[]> {
    return await searchRecordings(userId, query, limit)
  }

  /**
   * Search tasks by query
   */
  protected async searchUserTasks(
    userId: string,
    query: string,
    limit: number = 10,
    status?: 'todo' | 'in_progress' | 'done',
    category?: 'finance' | 'work' | 'health' | 'general'
  ): Promise<TaskSearchResult[]> {
    return await searchTasks(userId, query, limit, status, category)
  }

  /**
   * Get all tasks for user
   */
  protected async getUserTasks(
    userId: string,
    status?: 'todo' | 'in_progress' | 'done',
    category?: 'finance' | 'work' | 'health' | 'general'
  ): Promise<TaskSearchResult[]> {
    return await getAllTasks(userId, status, category)
  }

  /**
   * Create a task
   */
  protected async createUserTask(
    userId: string,
    title: string,
    description?: string,
    status: 'todo' | 'in_progress' | 'done' = 'todo',
    priority: 'low' | 'medium' | 'high' = 'medium',
    category: 'finance' | 'work' | 'health' | 'general' = 'general',
    dueDate?: string
  ): Promise<TaskSearchResult | null> {
    return await createTask(userId, title, description, status, priority, category, dueDate)
  }

  /**
   * Update a task
   */
  protected async updateUserTask(
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
    return await updateTask(userId, taskId, updates)
  }

  /**
   * Format notes as context string
   */
  protected formatNotesContext(notes: NoteSearchResult[]): string {
    if (notes.length === 0) {
      return 'No relevant notes found.'
    }

    return (
      `Relevant notes found:\n\n` +
      notes
        .map(
          (note, idx) =>
            `[Note ${idx + 1}: "${note.title}"]\nCreated: ${new Date(note.created_at).toLocaleDateString()}\nContent: ${note.content.substring(0, 500)}${note.content.length > 500 ? '...' : ''}`
        )
        .join('\n\n')
    )
  }

  /**
   * Format recordings as context string
   */
  protected formatRecordingsContext(
    recordings: RecordingSearchResult[]
  ): string {
    if (recordings.length === 0) {
      return 'No relevant recordings found.'
    }

    return (
      `Relevant recordings found:\n\n` +
      recordings
        .map(
          (rec, idx) =>
            `[Recording ${idx + 1}]\nCreated: ${new Date(rec.created_at).toLocaleDateString()}\n${rec.summary ? `Summary: ${rec.summary}\n` : ''}Transcript: ${rec.transcript.substring(0, 500)}${rec.transcript.length > 500 ? '...' : ''}`
        )
        .join('\n\n')
    )
  }

  /**
   * Format tasks as context string
   */
  protected formatTasksContext(tasks: TaskSearchResult[]): string {
    if (tasks.length === 0) {
      return 'No relevant tasks found.'
    }

    return (
      `Relevant tasks found:\n\n` +
      tasks
        .map(
          (task, idx) =>
            `[Task ${idx + 1}: "${task.title}"]\nStatus: ${task.status}\nPriority: ${task.priority}\nCategory: ${task.category}${task.description ? `\nDescription: ${task.description.substring(0, 200)}${task.description.length > 200 ? '...' : ''}` : ''}${task.due_date ? `\nDue: ${new Date(task.due_date).toLocaleDateString()}` : ''}\nCreated: ${new Date(task.created_at).toLocaleDateString()}`
        )
        .join('\n\n')
    )
  }

  /**
   * Suggest tags for content
   */
  protected async suggestTagsForContent(
    userId: string,
    content: string,
    resourceType: 'note' | 'recording' | 'task',
    existingTagNames: string[] = []
  ): Promise<TagSuggestion[]> {
    return await suggestTags(userId, content, resourceType, existingTagNames)
  }

  /**
   * Get or create a tag
   */
  protected async getOrCreateUserTag(
    userId: string,
    tagName: string,
    color: string
  ): Promise<string | null> {
    return await getOrCreateTag(userId, tagName, color)
  }

  /**
   * Get user's reminders
   */
  protected async getUserReminders(
    userId: string,
    upcoming: boolean = true
  ): Promise<ReminderSearchResult[]> {
    return await getUserReminders(userId, upcoming)
  }

  /**
   * Create a reminder
   */
  protected async createUserReminder(
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
    return await createReminder(userId, title, dueDate, options)
  }

  /**
   * Update a reminder
   */
  protected async updateUserReminder(
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
    return await updateReminder(userId, reminderId, updates)
  }

  /**
   * Format reminders as context string
   */
  protected formatRemindersContext(reminders: ReminderSearchResult[]): string {
    if (reminders.length === 0) {
      return 'No upcoming reminders.'
    }

    return (
      `Upcoming reminders:\n\n` +
      reminders
        .map(
          (reminder, idx) =>
            `[Reminder ${idx + 1}: "${reminder.title}"]\nDue: ${new Date(reminder.due_date).toLocaleString()}${reminder.description ? `\nDescription: ${reminder.description.substring(0, 200)}${reminder.description.length > 200 ? '...' : ''}` : ''}\nPriority: ${reminder.priority}\nCategory: ${reminder.category}${reminder.context ? `\nContext: ${reminder.context}` : ''}`
        )
        .join('\n\n')
    )
  }

  /**
   * Get user's events
   */
  protected async getUserEvents(
    userId: string,
    startDate?: string,
    endDate?: string,
    category?: 'finance' | 'work' | 'health' | 'general'
  ): Promise<EventSearchResult[]> {
    return await getUserEvents(userId, startDate, endDate, category)
  }

  /**
   * Create an event
   */
  protected async createUserEvent(
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
    return await createEvent(userId, title, startDate, options)
  }

  /**
   * Update an event
   */
  protected async updateUserEvent(
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
    return await updateEvent(userId, eventId, updates)
  }

  /**
   * Format events as context string
   */
  protected formatEventsContext(events: EventSearchResult[]): string {
    if (events.length === 0) {
      return 'No upcoming events.'
    }

    return (
      `Upcoming events:\n\n` +
      events
        .map(
          (event, idx) =>
            `[Event ${idx + 1}: "${event.title}"]\nStart: ${new Date(event.start_date).toLocaleString()}${event.end_date ? `\nEnd: ${new Date(event.end_date).toLocaleString()}` : ''}${event.all_day ? '\nAll Day Event' : ''}${event.location ? `\nLocation: ${event.location}` : ''}${event.description ? `\nDescription: ${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}` : ''}\nCategory: ${event.category}`
        )
        .join('\n\n')
    )
  }

  /**
   * Get user's goals
   */
  protected async getUserGoals(
    userId: string,
    status?: 'active' | 'completed' | 'paused' | 'cancelled',
    category?: 'finance' | 'work' | 'health' | 'personal' | 'general'
  ): Promise<GoalSearchResult[]> {
    return await getUserGoals(userId, status, category)
  }

  /**
   * Create a goal
   */
  protected async createUserGoal(
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
    return await createGoal(userId, title, options)
  }

  /**
   * Update a goal
   */
  protected async updateUserGoal(
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
    return await updateGoal(userId, goalId, updates)
  }

  /**
   * Get goal progress insights
   */
  protected async getGoalInsights(
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
    return await getGoalProgressInsights(userId, goalId)
  }

  /**
   * Format goals as context string
   */
  protected formatGoalsContext(goals: GoalSearchResult[]): string {
    if (goals.length === 0) {
      return 'No active goals.'
    }

    return (
      `Active goals:\n\n` +
      goals
        .map(
          (goal, idx) =>
            `[Goal ${idx + 1}: "${goal.title}"]\nProgress: ${goal.progress}%\nStatus: ${goal.status}\nPriority: ${goal.priority}\nCategory: ${goal.category}${goal.target_date ? `\nTarget Date: ${new Date(goal.target_date).toLocaleDateString()}` : ''}${goal.description ? `\nDescription: ${goal.description.substring(0, 200)}${goal.description.length > 200 ? '...' : ''}` : ''}`
        )
        .join('\n\n')
    )
  }

  /**
   * Generate response using GPT-4o with retrieved memories as context
   */
  async generateResponse(
    userId: string,
    userMessage: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<ExpertResponse> {
    // Always search notes and recordings to give the AI access to them
    // Check if user is asking about notes/recordings specifically
    const isAskingAboutNotes = 
      userMessage.toLowerCase().includes('note') ||
      userMessage.toLowerCase().includes('wrote') ||
      userMessage.toLowerCase().includes('written') ||
      userMessage.toLowerCase().includes('what did i') ||
      userMessage.toLowerCase().includes('tell me what')
    
    const isAskingAboutRecordings =
      userMessage.toLowerCase().includes('recording') ||
      userMessage.toLowerCase().includes('recorded') ||
      userMessage.toLowerCase().includes('said')
    
    const isAskingAboutTasks =
      userMessage.toLowerCase().includes('task') ||
      userMessage.toLowerCase().includes('todo') ||
      userMessage.toLowerCase().includes('remind') ||
      userMessage.toLowerCase().includes('reminder') ||
      userMessage.toLowerCase().includes('due') ||
      userMessage.toLowerCase().includes('what do i need to do') ||
      userMessage.toLowerCase().includes('what should i do') ||
      userMessage.toLowerCase().includes('create a task') ||
      userMessage.toLowerCase().includes('add a task') ||
      userMessage.toLowerCase().includes('make a task')
    
    // For notes queries, use the full message or extract meaningful terms
    let notesSearchQuery = userMessage
    if (isAskingAboutNotes) {
      // Extract meaningful words from the query (keep important terms)
      const words = userMessage.toLowerCase().split(/\s+/)
      const meaningfulWords = words.filter(
        (word) =>
          word.length > 2 &&
          !['the', 'and', 'for', 'are', 'but', 'not', 'with', 'this', 'that', 'what', 'did', 'my', 'about', 'in', 'can', 'you', 'tell', 'me'].includes(word)
      )
      
      // If we have meaningful words, use them; otherwise use full message
      notesSearchQuery = meaningfulWords.length > 0 ? meaningfulWords.join(' ') : userMessage
    } else {
      // Extract search terms from the user message (remove common words)
      const searchTerms = userMessage
        .toLowerCase()
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 2 &&
            !['the', 'and', 'for', 'are', 'but', 'not', 'with', 'this', 'that'].includes(word)
        )
        .join(' ')
      notesSearchQuery = searchTerms || userMessage
    }

    // Retrieve relevant memories
    const memoriesContext = await this.getRelevantMemories(userId, userMessage)
    const memoryCount = memoriesContext.includes('No relevant memories')
      ? 0
      : memoriesContext.split('[Memory').length - 1

    // Always search notes - especially if user is asking about them
    let notesFound: NoteSearchResult[] = []
    let notesContext = ''
    try {
      // If user is asking about notes, search more aggressively
      const notesLimit = isAskingAboutNotes ? 10 : 5
      notesFound = await this.searchUserNotes(userId, notesSearchQuery, notesLimit)
      console.log(`[${this.expertName}] Found ${notesFound.length} notes for query: "${notesSearchQuery}"`)
      console.log(`[${this.expertName}] Note titles found:`, notesFound.map(n => n.title).join(', '))
      
      // Check if user mentioned a specific note title (capitalized words or quoted text)
      // Look for patterns like "note titled X" or "note X" or just capitalized phrases
      const titleMatches = userMessage.match(/(?:note|titled?|called)\s+["']?([A-Z][^"']+)["']?/i) ||
                          userMessage.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/) // Capitalized phrases
      
      if (titleMatches && titleMatches.length > 0) {
        const mentionedTitle = titleMatches[1] || titleMatches[0]
        console.log(`[${this.expertName}] User mentioned note title: "${mentionedTitle}"`)
        
        // Search specifically for this title
        const titleSearchResults = await this.searchUserNotes(userId, mentionedTitle, 5)
        if (titleSearchResults.length > 0) {
          // Merge with existing results, prioritizing title matches
          const existingIds = new Set(notesFound.map(n => n.id))
          const newNotes = titleSearchResults.filter(n => !existingIds.has(n.id))
          notesFound = [...titleSearchResults, ...newNotes, ...notesFound].slice(0, notesLimit)
          console.log(`[${this.expertName}] After title search, found ${notesFound.length} notes`)
        }
      }
      
      if (notesFound.length > 0) {
        notesContext = this.formatNotesContext(notesFound)
        console.log(`[${this.expertName}] Notes context length: ${notesContext.length} chars`)
      } else {
        console.log(`[${this.expertName}] No notes found - this might mean user has no notes or search didn't match`)
      }
    } catch (error) {
      console.error(`[${this.expertName}] Error searching notes:`, error)
    }

    // Always search recordings - the AI can decide if they're relevant
    let recordingsFound: RecordingSearchResult[] = []
    let recordingsContext = ''
    try {
      // Use similar search query logic for recordings
      const recordingsSearchQuery = isAskingAboutRecordings 
        ? userMessage // Use full message if asking about recordings
        : notesSearchQuery // Use the same query as notes
      
      recordingsFound = await this.searchUserRecordings(userId, recordingsSearchQuery, 5)
      console.log(`[${this.expertName}] Found ${recordingsFound.length} recordings for query: "${recordingsSearchQuery}"`)
      if (recordingsFound.length > 0) {
        recordingsContext = this.formatRecordingsContext(recordingsFound)
        console.log(`[${this.expertName}] Recordings context length: ${recordingsContext.length} chars`)
      }
    } catch (error) {
      console.error(`[${this.expertName}] Error searching recordings:`, error)
    }

    // ALWAYS search tasks - give AI access to all tasks
    let tasksFound: TaskSearchResult[] = []
    let tasksContext = ''
    try {
      if (isAskingAboutTasks) {
        // If asking about tasks, get all tasks or search by query
        const tasksSearchQuery = userMessage.toLowerCase().includes('all') || 
                                 userMessage.toLowerCase().includes('list') ||
                                 userMessage.toLowerCase().includes('show')
          ? '' // Empty query to get all tasks
          : userMessage
        
        tasksFound = await this.searchUserTasks(userId, tasksSearchQuery, 10)
        console.log(`[${this.expertName}] Found ${tasksFound.length} tasks for query: "${tasksSearchQuery}"`)
      } else {
        // For general queries, get recent/active tasks to give AI context
        tasksFound = await this.searchUserTasks(userId, '', 10) // Get all tasks
      }
      
      if (tasksFound.length > 0) {
        tasksContext = this.formatTasksContext(tasksFound)
        console.log(`[${this.expertName}] Tasks context length: ${tasksContext.length} chars`)
      }
    } catch (error) {
      console.error(`[${this.expertName}] Error searching tasks:`, error)
    }

    // ALWAYS search reminders - give AI access to upcoming reminders
    const isAskingAboutReminders =
      userMessage.toLowerCase().includes('remind') ||
      userMessage.toLowerCase().includes('reminder') ||
      userMessage.toLowerCase().includes('remind me') ||
      userMessage.toLowerCase().includes('set a reminder') ||
      userMessage.toLowerCase().includes('create a reminder') ||
      userMessage.toLowerCase().includes('my reminders') ||
      userMessage.toLowerCase().includes('upcoming reminders')

    let remindersFound: ReminderSearchResult[] = []
    let remindersContext = ''
    try {
      // Always get upcoming reminders for context
      remindersFound = await this.getUserReminders(userId, true)
      
      if (remindersFound.length > 0) {
        remindersContext = this.formatRemindersContext(remindersFound)
        console.log(`[${this.expertName}] Reminders context length: ${remindersContext.length} chars`)
      }
    } catch (error) {
      console.error(`[${this.expertName}] Error searching reminders:`, error)
    }

    // Search events - especially if user is asking about events/calendar
    const isAskingAboutEvents =
      userMessage.toLowerCase().includes('event') ||
      userMessage.toLowerCase().includes('calendar') ||
      userMessage.toLowerCase().includes('schedule') ||
      userMessage.toLowerCase().includes('meeting') ||
      userMessage.toLowerCase().includes('appointment') ||
      userMessage.toLowerCase().includes('my events') ||
      userMessage.toLowerCase().includes('upcoming events') ||
      userMessage.toLowerCase().includes('what do i have') ||
      userMessage.toLowerCase().includes('what\'s on my calendar')

    let eventsFound: EventSearchResult[] = []
    let eventsContext = ''
    try {
      // Get events for the next 30 days
      const startDate = new Date().toISOString()
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      
      eventsFound = await this.getUserEvents(userId, startDate, endDate)
      
      if (eventsFound.length > 0) {
        eventsContext = this.formatEventsContext(eventsFound)
        console.log(`[${this.expertName}] Events context length: ${eventsContext.length} chars`)
      }
    } catch (error) {
      console.error(`[${this.expertName}] Error searching events:`, error)
    }

    // ALWAYS search goals - give AI access to active goals
    const isAskingAboutGoals =
      userMessage.toLowerCase().includes('goal') ||
      userMessage.toLowerCase().includes('target') ||
      userMessage.toLowerCase().includes('objective') ||
      userMessage.toLowerCase().includes('my goals') ||
      userMessage.toLowerCase().includes('progress') ||
      userMessage.toLowerCase().includes('milestone')

    let goalsFound: GoalSearchResult[] = []
    let goalsContext = ''
    try {
      // Always get active goals for context, or all if specifically asking about goals
      goalsFound = await this.getUserGoals(userId, isAskingAboutGoals ? undefined : 'active')
      
      if (goalsFound.length > 0) {
        goalsContext = this.formatGoalsContext(goalsFound)
        console.log(`[${this.expertName}] Goals context length: ${goalsContext.length} chars`)
      }
    } catch (error) {
      console.error(`[${this.expertName}] Error searching goals:`, error)
    }

    // Build system context
    let systemContext = `${this.systemPrompt}\n\n${memoriesContext}`
    
    // Always include notes, recordings, tasks, and reminders context if found
    if (notesContext && notesContext !== 'No relevant notes found.') {
      systemContext += `\n\n${notesContext}`
    }
    if (recordingsContext && recordingsContext !== 'No relevant recordings found.') {
      systemContext += `\n\n${recordingsContext}`
    }
    if (tasksContext && tasksContext !== 'No relevant tasks found.') {
      systemContext += `\n\n${tasksContext}`
    }
    if (remindersContext && remindersContext !== 'No upcoming reminders.') {
      systemContext += `\n\n${remindersContext}`
    }
    if (eventsContext && eventsContext !== 'No upcoming events.') {
      systemContext += `\n\n${eventsContext}`
    }
    if (goalsContext && goalsContext !== 'No active goals.') {
      systemContext += `\n\n${goalsContext}`
    }

    // Add clear instructions about accessing notes, recordings, tasks, reminders, events, and goals
    const hasNotes = notesContext && notesContext !== 'No relevant notes found.' && notesFound.length > 0
    const hasRecordings = recordingsContext && notesContext !== 'No relevant recordings found.' && recordingsFound.length > 0
    const hasTasks = tasksContext && tasksContext !== 'No relevant tasks found.' && tasksFound.length > 0
    const hasReminders = remindersContext && remindersContext !== 'No upcoming reminders.' && remindersFound.length > 0
    const hasEvents = eventsContext && eventsContext !== 'No upcoming events.' && eventsFound.length > 0
    const hasGoals = goalsContext && goalsContext !== 'No active goals.' && goalsFound.length > 0
    
    if (hasNotes || hasRecordings || hasTasks || hasReminders || hasEvents || hasGoals) {
      systemContext += `\n\n═══════════════════════════════════════════════════════════════
🚨 CRITICAL: YOU HAVE DIRECT ACCESS TO USER'S DATA 🚨
═══════════════════════════════════════════════════════════════

${hasNotes ? `✅ NOTES FOUND: You have access to ${notesFound.length} note(s) from the user.
   The notes are shown above in the "Relevant notes found:" section.
   You MUST read and reference these notes when answering questions.
   Example: "In your note titled '[Note Title]', you wrote: [content]"
   
   DO NOT say you cannot access notes. The notes are RIGHT ABOVE in the context.
   ` : ''}
${hasRecordings ? `✅ RECORDINGS FOUND: You have access to ${recordingsFound.length} recording(s) from the user.
   The recordings are shown above in the "Relevant recordings found:" section.
   You MUST read and reference these recordings when answering questions.
   ` : ''}
${hasTasks ? `✅ TASKS FOUND: You have access to ${tasksFound.length} task(s) from the user.
   The tasks are shown above in the "Relevant tasks found:" section.
   You MUST read and reference these tasks when answering questions about tasks, todos, or work items.
   
   TASK MANAGEMENT CAPABILITIES:
   - You can CREATE tasks using: createUserTask(userId, title, description?, status?, priority?, category?, dueDate?)
   - status: 'todo' | 'in_progress' | 'done' (default: 'todo')
   - priority: 'low' | 'medium' | 'high' (default: 'medium')
   - category: 'finance' | 'work' | 'health' | 'general' (default: 'general')
   - dueDate: ISO date string (optional)
   
   - You can UPDATE tasks using: updateUserTask(userId, taskId, { title?, description?, status?, priority?, category?, dueDate? })
   - You can LIST tasks using: getUserTasks(userId, status?, category?)
   
   When the user asks to create a task or todo, you MUST use createUserTask().
   When the user asks about their tasks, you MUST reference the tasks shown above.
   DO NOT say you cannot access tasks - the tasks are RIGHT ABOVE in the context.
   ` : ''}
${hasReminders ? `✅ REMINDERS FOUND: You have access to ${remindersFound.length} upcoming reminder(s) from the user.
   The reminders are shown above in the "Upcoming reminders:" section.
   You MUST read and reference these reminders when answering questions about reminders, notifications, or scheduled items.
   
   REMINDER MANAGEMENT CAPABILITIES:
   - You can CREATE reminders using: createUserReminder(userId, title, dueDate, { description?, category?, priority?, emailNotification?, browserNotification?, context? })
   - dueDate: ISO date string (required, format: YYYY-MM-DDTHH:mm:ss.sssZ)
   - category: 'finance' | 'work' | 'health' | 'general' (default: 'general')
   - priority: 'low' | 'medium' | 'high' (default: 'medium')
   - emailNotification: boolean (default: false)
   - browserNotification: boolean (default: true)
   - context: string (optional, for smart reminders)
   
   - You can UPDATE reminders using: updateUserReminder(userId, reminderId, { title?, description?, due_date?, completed_at?, category?, priority?, emailNotification?, browserNotification?, context? })
   - You can LIST reminders using: getUserReminders(userId, upcoming?)
   
   When the user asks to "remind me", "set a reminder", "create a reminder", or asks you to remind them about something, you MUST use createUserReminder().
   Parse the date/time from the user's message (e.g., "tomorrow at 3pm", "next Monday", "in 2 hours", "December 25th at 9am").
   If the user doesn't specify a time, use a reasonable default (e.g., 9am for morning reminders, 3pm for afternoon).
   When the user asks about their reminders, you MUST reference the reminders shown above.
   DO NOT say you cannot access reminders - the reminders are RIGHT ABOVE in the context.
   ` : ''}
${hasEvents ? `✅ EVENTS FOUND: You have access to ${eventsFound.length} upcoming event(s) from the user.
   The events are shown above in the "Upcoming events:" section.
   You can reference these events when answering questions.
   ` : ''}
   
🚨 EVENT CREATION CAPABILITIES (ALWAYS AVAILABLE):
   - You CAN and MUST create events when the user asks you to schedule, create, or add events to their calendar.
   - The system will automatically create events when you detect scheduling requests.
   - When the user says "schedule", "create an event", "add to calendar", "set up a meeting", "book", "plan", or similar phrases, the event WILL BE CREATED automatically.
   - You should confirm the event creation to the user after it's been created.
   - DO NOT say you cannot create events - the system handles this automatically.
   - If an event was just created (you'll see a message above), you MUST confirm it to the user.
   
   When the user asks about their calendar, events, or schedule, reference the events shown above (if any).

TAG MANAGEMENT CAPABILITIES:
- You can SUGGEST tags using: suggestTagsForContent(userId, content, resourceType, existingTagNames?)
- You can GET OR CREATE tags using: getOrCreateUserTag(userId, tagName, color)
- When the user creates content (notes, recordings, tasks), you can suggest relevant tags
- Tag colors should be chosen from: #3b82f6, #ef4444, #10b981, #f59e0b, #8b5cf6, #ec4899, #06b6d4, #84cc16, #f97316, #6366f1
- You can mention tag suggestions in your responses to help users organize their content

MANDATORY INSTRUCTIONS:
1. The notes/recordings/tasks/reminders/goals shown above are REAL and ACCESSIBLE to you
2. When the user asks "what did I write" or "what's in my notes", you MUST check the notes above
3. When the user asks about tasks, todos, or work items, you MUST check the tasks above
4. When the user asks about reminders or notifications, you MUST check the reminders above
5. When the user asks about goals, progress, or milestones, you MUST check the goals above
6. Reference specific titles (e.g., "In your note 'Transformation center'...", "Your task 'Complete project'...", "Your goal 'Run marathon'...")
7. NEVER say "I can't access your [notes/tasks/reminders/goals]" - you CAN and DO have access to them
8. If the user mentions a specific title, search for it in the data shown above
9. The data above is YOUR PRIMARY SOURCE - use it to answer questions
10. Always be specific: mention the exact title, status, progress, or details from the data above

═══════════════════════════════════════════════════════════════`
    } else if (isAskingAboutNotes || isAskingAboutRecordings) {
      // User is asking about notes but none were found
      systemContext += `\n\nNote: You searched for notes/recordings but found no matches. The user may not have any notes yet, or the search didn't match.`
    }
    
    // ALWAYS add event creation capabilities (even if no events exist)
    systemContext += `\n\n🚨 EVENT CREATION CAPABILITIES (ALWAYS AVAILABLE):
   - You CAN and MUST create events when the user asks you to schedule, create, or add events to their calendar.
   - The system will automatically create events when you detect scheduling requests.
   - When the user says "schedule", "create an event", "add to calendar", "set up a meeting", "book", "plan", "put it on", or similar phrases, the event WILL BE CREATED automatically.
   - You should confirm the event creation to the user after it's been created.
   - DO NOT say you cannot create events - the system handles this automatically.
   - If an event was just created (you'll see a message above), you MUST confirm it to the user.
   -    When the user asks about their calendar, events, or schedule, reference the events shown above (if any).`
${hasGoals ? `
✅ GOALS FOUND: You have access to ${goalsFound.length} goal(s) from the user.
   The goals are shown above in the "Active goals:" section.
   You can reference these goals when answering questions.
   
   GOAL MANAGEMENT CAPABILITIES:
   - You can CREATE goals using: createUserGoal(userId, title, { description?, category?, targetDate?, priority?, progress? })
   - category: 'finance' | 'work' | 'health' | 'personal' | 'general' (default: 'general')
   - priority: 'low' | 'medium' | 'high' (default: 'medium')
   - targetDate: ISO date string (optional)
   - progress: number 0-100 (default: 0)
   
   - You can UPDATE goals using: updateUserGoal(userId, goalId, { title?, description?, category?, targetDate?, status?, progress?, priority? })
   - You can GET goal insights using: getGoalInsights(userId, goalId) - returns progress history, milestones, and analytics
   - You can LIST goals using: getUserGoals(userId, status?, category?)
   
   - You can provide AI insights on progress by analyzing goal data and progress logs
   - When the user asks to "set a goal", "create a goal", "track progress", or asks about goals, you can help them
   - When the user asks about progress or milestones, you MUST reference the goals shown above
   DO NOT say you cannot access goals - the goals are RIGHT ABOVE in the context.
   ` : ''}

🚨 GOAL CREATION CAPABILITIES (ALWAYS AVAILABLE):
   - You CAN and MUST create goals when the user asks you to set, create, or track goals.
   - When the user says "set a goal", "create a goal", "I want to achieve", "my goal is", or similar phrases, you can help create goals.
   - You can provide insights on progress by analyzing goal data and progress history.
   - When the user asks about their goals, progress, or milestones, reference the goals shown above (if any).

    // Check if user wants to create an event - be more comprehensive
    const lowerMessage = userMessage.toLowerCase()
    
    // Check for explicit scheduling/creation requests
    const hasScheduleWords = 
      lowerMessage.includes('schedule') ||
      lowerMessage.includes('create') ||
      lowerMessage.includes('add') ||
      lowerMessage.includes('book') ||
      lowerMessage.includes('plan') ||
      lowerMessage.includes('set up') ||
      lowerMessage.includes('put it on') ||
      lowerMessage.includes('put on')
    
    // Check for event/meeting/calendar context
    const hasEventContext =
      lowerMessage.includes('event') ||
      lowerMessage.includes('meeting') ||
      lowerMessage.includes('appointment') ||
      lowerMessage.includes('calendar')
    
    // Check for time/date references
    const hasTimeReference =
      lowerMessage.includes('tomorrow') ||
      lowerMessage.includes('next') ||
      lowerMessage.includes('at ') ||
      lowerMessage.includes('for ') ||
      lowerMessage.includes('on ') ||
      /\d+\s*(am|pm|hour|minute)/i.test(lowerMessage) ||
      /\d{1,2}:\d{2}/.test(lowerMessage)
    
    // Check for request patterns
    const hasRequestPattern =
      lowerMessage.includes('can you') ||
      lowerMessage.includes('could you') ||
      lowerMessage.includes('please') ||
      lowerMessage.includes('for me') ||
      lowerMessage.includes('i need') ||
      lowerMessage.includes('i want')
    
    // Determine if user wants to create an event
    const wantsToCreateEvent = 
      // Explicit creation requests
      (hasScheduleWords && hasEventContext) ||
      // "Schedule a meeting" pattern
      (lowerMessage.includes('schedule') && lowerMessage.includes('meeting')) ||
      // "Create an event" pattern
      (lowerMessage.includes('create') && lowerMessage.includes('event')) ||
      // "Add to calendar" pattern
      (lowerMessage.includes('add') && lowerMessage.includes('calendar')) ||
      // "Schedule" with time reference
      (lowerMessage.includes('schedule') && hasTimeReference) ||
      // "Meeting" with time reference and request pattern
      (lowerMessage.includes('meeting') && hasTimeReference && hasRequestPattern) ||
      // "Event" with time reference and request pattern
      (lowerMessage.includes('event') && hasTimeReference && hasRequestPattern) ||
      // "Calendar" with scheduling words
      (lowerMessage.includes('calendar') && hasScheduleWords)

    let createdEvent: EventSearchResult | null = null
    let eventCreationResult = ''

    if (wantsToCreateEvent) {
      console.log(`[${this.expertName}] ✅ DETECTED EVENT CREATION REQUEST: "${userMessage}"`)
      try {
        console.log(`[${this.expertName}] Parsing event details from user message...`)
        
        // Use OpenAI to parse event details from user message
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        
        const parsePrompt = `Parse the following user request to create a calendar event. Extract:
1. Event title (required)
2. Date/time (parse relative dates like "tomorrow", "next Friday", "in 2 days", or absolute dates)
3. Duration or end time (if mentioned)
4. Location (if mentioned)
5. Description (if mentioned)
6. Category: finance, work, health, or general (infer from context)

User message: "${userMessage}"

Current date/time context:
- Today: ${todayStr}
- Tomorrow: ${tomorrowStr}
- Current time: ${now.toISOString()}

Respond with JSON only:
{
  "title": "string",
  "startDate": "ISO 8601 date string (e.g., 2024-01-15T14:00:00.000Z)",
  "endDate": "ISO 8601 date string or null",
  "allDay": boolean,
  "location": "string or null",
  "description": "string or null",
  "category": "finance|work|health|general"
}

CRITICAL DATE PARSING RULES:
- "tomorrow" = ${tomorrowStr}T14:00:00.000Z (default 2pm)
- "next Friday" = calculate the date of the next Friday, default 2pm
- "in X days" = current date + X days, default 2pm
- If user says "tomorrow at 1pm" or "tomorrow for 1 pm" = ${tomorrowStr}T13:00:00.000Z (1pm = 13:00)
- If user says "tomorrow at 3pm" = ${tomorrowStr}T15:00:00.000Z
- If user says "tomorrow at 1am" = ${tomorrowStr}T01:00:00.000Z
- If user says "tomorrow morning" = ${tomorrowStr}T09:00:00.000Z
- If user says "tomorrow afternoon" = ${tomorrowStr}T14:00:00.000Z
- If user says "tomorrow evening" = ${tomorrowStr}T18:00:00.000Z
- Convert 12-hour format to 24-hour: 1pm=13:00, 2pm=14:00, 3pm=15:00, 12pm=12:00, 12am=00:00, 1am=01:00
- If no time specified and not "all day", default to 14:00 (2pm)
- If duration mentioned (e.g., "1 hour"), add that to startDate for endDate (default 1 hour if not specified)
- If "all day" mentioned, set allDay: true and use 00:00:00 for start, 23:59:59 for end
- If no title is provided, use "Calendar Event" as the title

Always use ISO 8601 format with timezone (Z suffix).`

        const parseResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a date/time parser. Always respond with valid JSON only.',
            },
            {
              role: 'user',
              content: parsePrompt,
            },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        })

        const parsedContent = parseResponse.choices[0]?.message?.content
        if (parsedContent) {
          const eventData = JSON.parse(parsedContent) as {
            title: string
            startDate: string
            endDate?: string | null
            allDay?: boolean
            location?: string | null
            description?: string | null
            category?: 'finance' | 'work' | 'health' | 'general'
          }

          console.log(`[${this.expertName}] Parsed event data:`, eventData)

          // If no title provided, generate a default one based on the date
          let eventTitle = eventData.title
          if (!eventTitle || eventTitle.trim() === '' || eventTitle === 'Calendar Event') {
            const eventDate = new Date(eventData.startDate)
            eventTitle = `Event on ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          }
          
          // Create the event
          console.log(`[${this.expertName}] Attempting to create event with:`, {
            userId,
            title: eventTitle,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            allDay: eventData.allDay,
            location: eventData.location,
            category: eventData.category || 'general',
            description: eventData.description || `Event created from: ${userMessage}`,
          })
          
          createdEvent = await this.createUserEvent(
            userId,
            eventTitle,
            eventData.startDate,
            {
              endDate: eventData.endDate || undefined,
              allDay: eventData.allDay || false,
              location: eventData.location || undefined,
              category: eventData.category || 'general',
              description: eventData.description || `Event created from: ${userMessage}`,
            }
          )

          if (createdEvent) {
            eventCreationResult = `✅ Event created successfully: "${createdEvent.title}" on ${new Date(createdEvent.start_date).toLocaleString()}`
            console.log(`[${this.expertName}] ✅ Event created successfully:`, {
              id: createdEvent.id,
              title: createdEvent.title,
              start_date: createdEvent.start_date,
              end_date: createdEvent.end_date,
              user_id: userId,
            })
            
            // Add to system context
            systemContext += `\n\n${eventCreationResult}\nEvent details:\n- Title: ${createdEvent.title}\n- Start: ${new Date(createdEvent.start_date).toLocaleString()}${createdEvent.end_date ? `\n- End: ${new Date(createdEvent.end_date).toLocaleString()}` : ''}${createdEvent.location ? `\n- Location: ${createdEvent.location}` : ''}${createdEvent.description ? `\n- Description: ${createdEvent.description}` : ''}\n- Category: ${createdEvent.category}\n- Event ID: ${createdEvent.id}`
          } else {
            eventCreationResult = '❌ Failed to create event. Please try again.'
            console.error(`[${this.expertName}] ❌ Failed to create event - createUserEvent returned null`)
          }
        }
      } catch (error) {
        console.error(`[${this.expertName}] Error creating event:`, error)
        eventCreationResult = '❌ Error parsing event details. Please provide: title, date/time, and optionally location, description.'
      }
    }

    // If event was created, add explicit instruction to system context
    if (createdEvent) {
      systemContext += `\n\n🚨 CRITICAL: An event was JUST CREATED by the system. The event "${createdEvent.title}" has been successfully added to the user's calendar for ${new Date(createdEvent.start_date).toLocaleString()}. You MUST confirm this to the user. DO NOT say you cannot create events - the event has already been created and is in their calendar.`
    }

    // Build messages AFTER event creation so system context includes the result
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemContext,
      },
    ]

    // Add conversation history if provided
    if (conversationHistory) {
      conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    })

    // Generate response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      stream: false,
    })

    let assistantMessage = response.choices[0]?.message?.content || ''
    
    // If event was created, ensure the response mentions it explicitly
    if (createdEvent) {
      const hasCreated = assistantMessage.toLowerCase().includes('created') || 
                         assistantMessage.toLowerCase().includes('scheduled') ||
                         assistantMessage.toLowerCase().includes('added')
      
      if (!hasCreated) {
        // Prepend confirmation message
        assistantMessage = `✅ I've successfully created the event "${createdEvent.title}" in your calendar for ${new Date(createdEvent.start_date).toLocaleString()}. ${assistantMessage}`
      }
    } else if (wantsToCreateEvent && !createdEvent) {
      // Event creation was attempted but failed
      assistantMessage = `I tried to create the event, but encountered an issue. ${eventCreationResult || 'Please try again with more specific details (title, date, and time).'}`
    }

    return {
      response: assistantMessage,
      memories_used: memoryCount,
      reasoning: `Used ${memoryCount} relevant memories from ${this.category} category to provide contextual response.`,
    }
  }
}
