import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type ExpertType = 'finance' | 'work' | 'health' | 'general'

export interface RoutingDecision {
  expert: ExpertType
  reasoning: string
  confidence: number
}

/**
 * Chief of Staff Router
 * Analyzes user intent and routes to the appropriate expert agent
 */
export async function routeToExpert(
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<RoutingDecision> {
  const systemPrompt = `You are the Chief of Staff Router for LifeOS, a personal assistant system with specialized expert agents.

Your role is to analyze user messages and route them to the most appropriate expert:
- **finance**: Budgeting, investments, expenses, taxes, financial planning, money management
- **work**: Career, projects, meetings, tasks, professional development, work-related goals
- **health**: Fitness, nutrition, medical, wellness, mental health, exercise, diet
- **general**: General questions, casual conversation, or when the topic doesn't clearly fit the above categories

Analyze the user's message and respond in JSON format with:
1. The expert type (finance, work, health, or general)
2. A brief reasoning for your choice
3. A confidence score (0-1)

Be decisive - if the message is clearly about one domain, route there. If it's ambiguous or general, use "general".

You must respond with valid JSON only.`

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from router')
  }

  try {
    const parsed = JSON.parse(content) as {
      expert: ExpertType
      reasoning: string
      confidence: number
    }

    return {
      expert: parsed.expert,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
    }
  } catch (error) {
    // Fallback: try to extract expert type from text response
    const lowerContent = content.toLowerCase()
    let expert: ExpertType = 'general'

    if (lowerContent.includes('finance') || lowerContent.includes('financial')) {
      expert = 'finance'
    } else if (lowerContent.includes('work') || lowerContent.includes('career')) {
      expert = 'work'
    } else if (lowerContent.includes('health') || lowerContent.includes('fitness')) {
      expert = 'health'
    }

    return {
      expert,
      reasoning: content,
      confidence: 0.7,
    }
  }
}
