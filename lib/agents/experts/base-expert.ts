import OpenAI from 'openai'
import { searchMemories, MemoryCategory } from '@/lib/rag/vector-search'
import { searchNotes, NoteSearchResult } from '@/lib/agents/tools/notes-search'
import {
  searchRecordings,
  RecordingSearchResult,
} from '@/lib/agents/tools/recordings-search'

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

    // Build system context
    let systemContext = `${this.systemPrompt}\n\n${memoriesContext}`
    
    // Always include notes and recordings context if found
    if (notesContext && notesContext !== 'No relevant notes found.') {
      systemContext += `\n\n${notesContext}`
    }
    if (recordingsContext && recordingsContext !== 'No relevant recordings found.') {
      systemContext += `\n\n${recordingsContext}`
    }

    // Add clear instructions about accessing notes and recordings
    const hasNotes = notesContext && notesContext !== 'No relevant notes found.' && notesFound.length > 0
    const hasRecordings = recordingsContext && recordingsContext !== 'No relevant recordings found.' && recordingsFound.length > 0
    
    if (hasNotes || hasRecordings) {
      systemContext += `\n\n═══════════════════════════════════════════════════════════════
🚨 CRITICAL: YOU HAVE DIRECT ACCESS TO USER'S NOTES/RECORDINGS 🚨
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

MANDATORY INSTRUCTIONS:
1. The notes/recordings shown above are REAL and ACCESSIBLE to you
2. When the user asks "what did I write" or "what's in my notes", you MUST check the notes above
3. Reference specific note titles (e.g., "In your note 'Transformation center', you wrote...")
4. NEVER say "I can't access your notes" - you CAN and DO have access to them
5. If the user mentions a note title (like "Transformation center"), search for it in the notes above
6. The notes above are YOUR PRIMARY SOURCE - use them to answer questions

═══════════════════════════════════════════════════════════════`
    } else if (isAskingAboutNotes || isAskingAboutRecordings) {
      // User is asking about notes but none were found
      systemContext += `\n\nNote: You searched for notes/recordings but found no matches. The user may not have any notes yet, or the search didn't match.`
    }

    // Build messages
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

    const assistantMessage = response.choices[0]?.message?.content || ''

    return {
      response: assistantMessage,
      memories_used: memoryCount,
      reasoning: `Used ${memoryCount} relevant memories from ${this.category} category to provide contextual response.`,
    }
  }
}
