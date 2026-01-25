import { createClient } from '@/lib/supabase/server'
import { streamAgentResponse } from '@/lib/agents/graph'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const runtime = 'nodejs' // Use nodejs runtime for LangGraph

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    console.log('Chat API received request:', JSON.stringify(body, null, 2))
    
    const uiMessages = body.messages || body.data?.messages || []

    if (!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) {
      console.error('Invalid request format:', body)
      return new Response('Invalid request: messages array required', {
        status: 400,
      })
    }

    // Convert UI messages to model messages and extract conversation history
    const modelMessages = uiMessages
      .filter((msg: any) => msg && msg.role && (msg.content !== undefined && msg.content !== null))
      .map((msg: any) => {
        let content = msg.content
        if (typeof content !== 'string') {
          if (Array.isArray(content)) {
            // Handle array content (like tool calls)
            content = content.map((part: any) => {
              if (part.type === 'text') return part.text || ''
              return JSON.stringify(part)
            }).join(' ')
          } else if (typeof content === 'object') {
            content = JSON.stringify(content)
          } else {
            content = String(content)
          }
        }
        return {
          role: msg.role,
          content: content,
        }
      })
    
    // Extract the last user message and conversation history
    const lastUserMessage = modelMessages.filter(m => m.role === 'user').pop()
    const userMessage = lastUserMessage?.content || ''
    
    // Build conversation history (excluding the last user message)
    const conversationHistory = modelMessages
      .slice(0, -1)
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))
    
    console.log('User message:', userMessage)
    console.log('Conversation history length:', conversationHistory.length)
    
    // Verify OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set!')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use LangGraph agent with memory retrieval
    console.log('Using LangGraph agent with memory retrieval')
    
    let finalResponse = ''
    let routingInfo = ''
    let memoriesUsed = 0

    try {
      // Stream the agent graph execution
      for await (const state of streamAgentResponse(
        user.id,
        userMessage,
        conversationHistory.length > 0 ? conversationHistory : undefined
      )) {
        // Collect routing decision
        if (state.routing_decision) {
          routingInfo = `[Routing to ${state.routing_decision.expert} expert: ${state.routing_decision.reasoning}]`
          console.log('Routing decision:', routingInfo)
        }

        // Collect final response
        if (state.expert_response) {
          finalResponse = state.expert_response
          memoriesUsed = state.memories_used || 0
          console.log('Expert response received, memories used:', memoriesUsed)
        }
      }
    } catch (agentError) {
      console.error('Agent graph error:', agentError)
      // Continue with fallback if agent graph fails
    }

    // If we have a final response from the agent, stream it using Vercel AI SDK
    if (finalResponse) {
      console.log('Streaming agent response')
      
      // Use OpenAI to stream the response for better UX
      // Include conversation history for context
      const result = streamText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'system',
            content: 'You are a helpful personal assistant for LifeOS. Be concise and helpful. You can help with finance, work, health, and general topics.',
          },
          ...conversationHistory,
          {
            role: 'user',
            content: userMessage,
          },
          {
            role: 'assistant',
            content: finalResponse,
          },
        ],
        temperature: 0.7,
        maxTokens: 1000,
      })

      return result.toUIMessageStreamResponse()
    }

    // Fallback: generate a response directly if agent graph didn't produce one
    // But still search notes, recordings, and memories to give the AI access
    console.log('Using fallback: direct OpenAI response with full search')
    
    // Import search functions for fallback
    const { searchNotes } = await import('@/lib/agents/tools/notes-search')
    const { searchRecordings } = await import('@/lib/agents/tools/recordings-search')
    const { searchMemories } = await import('@/lib/rag/vector-search')
    
    // Check if user is asking about notes
    const isAskingAboutNotes = 
      userMessage.toLowerCase().includes('note') ||
      userMessage.toLowerCase().includes('wrote') ||
      userMessage.toLowerCase().includes('written') ||
      userMessage.toLowerCase().includes('what did i')
    
    // Search memories (past conversations) - search across all categories
    let memoriesContext = ''
    try {
      // Search memories from all categories to get past conversations
      const allMemories: any[] = []
      const categories: Array<'finance' | 'work' | 'health' | 'general'> = ['finance', 'work', 'health', 'general']
      
      for (const category of categories) {
        try {
          const categoryMemories = await searchMemories(user.id, category, userMessage, 3)
          allMemories.push(...categoryMemories)
        } catch (err) {
          console.error(`[Fallback] Error searching ${category} memories:`, err)
        }
      }
      
      // Sort by similarity and take top 10
      allMemories.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      const topMemories = allMemories.slice(0, 10)
      
      if (topMemories.length > 0) {
        memoriesContext = `Relevant past conversations and memories:\n\n` +
          topMemories
            .map(
              (mem, idx) =>
                `[Memory ${idx + 1}]\nSource: ${mem.source_type} (${mem.category})\nContent: ${mem.content}\nRelevance: ${((mem.similarity || 0) * 100).toFixed(1)}%`
            )
            .join('\n\n')
        console.log(`[Fallback] Found ${topMemories.length} memories from past conversations`)
      }
    } catch (error) {
      console.error('[Fallback] Error searching memories:', error)
    }
    
    // Search notes if relevant
    let notesContext = ''
    try {
      const notesFound = await searchNotes(user.id, userMessage, isAskingAboutNotes ? 10 : 5)
      if (notesFound.length > 0) {
        notesContext = `Relevant notes found:\n\n` +
          notesFound
            .map(
              (note, idx) =>
                `[Note ${idx + 1}: "${note.title}"]\nCreated: ${new Date(note.created_at).toLocaleDateString()}\nContent: ${note.content.substring(0, 1000)}${note.content.length > 1000 ? '...' : ''}`
            )
            .join('\n\n')
        console.log(`[Fallback] Found ${notesFound.length} notes`)
      }
    } catch (error) {
      console.error('[Fallback] Error searching notes:', error)
    }
    
    // Build system message with all context
    let systemMessage = 'You are a helpful personal assistant for LifeOS. Be concise and helpful. You can help with finance, work, health, and general topics.'
    
    // Add memories context (past conversations)
    if (memoriesContext) {
      systemMessage += `\n\n🚨 YOU HAVE ACCESS TO PAST CONVERSATIONS 🚨\n\nThe following memories from past conversations are available:\n\n${memoriesContext}\n\nIMPORTANT: These are your past conversations with the user. You CAN and SHOULD reference them when relevant. NEVER say you don't have access to past conversations if memories are shown above.`
    }
    
    // Add notes context
    if (notesContext) {
      systemMessage += `\n\n🚨 YOU HAVE ACCESS TO THE USER'S NOTES 🚨\n\nThe following notes are available to you:\n\n${notesContext}\n\nIMPORTANT: When the user asks about their notes, you MUST reference the notes shown above. NEVER say you can't access notes if they are shown above. Reference notes by their title (e.g., "In your note titled '[title]', you wrote...").`
    }
    
    const result = streamText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        ...modelMessages,
      ],
      temperature: 0.7,
      maxTokens: 1000,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
    })
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
