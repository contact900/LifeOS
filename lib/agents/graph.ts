import { StateGraph, END, START } from '@langchain/langgraph'
import { routeToExpert, ExpertType } from './router'
import {
  FinanceExpert,
  WorkExpert,
  HealthExpert,
  GeneralExpert,
} from './experts'
import { saveMemory } from '@/lib/rag/vector-search'

export interface AgentState {
  user_id: string
  message: string
  intent?: ExpertType
  routing_decision?: {
    expert: ExpertType
    reasoning: string
    confidence: number
  }
  expert_response?: string
  memories_used?: number
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

/**
 * Router node: Analyzes intent and routes to appropriate expert
 */
async function routerNode(state: AgentState): Promise<Partial<AgentState>> {
  const routingDecision = await routeToExpert(
    state.message,
    state.conversation_history
  )

  return {
    intent: routingDecision.expert,
    routing_decision: routingDecision,
  }
}

/**
 * Finance expert node
 */
async function financeExpertNode(state: AgentState): Promise<Partial<AgentState>> {
  const expert = new FinanceExpert()
  const response = await expert.generateResponse(
    state.user_id,
    state.message,
    state.conversation_history
  )

  // Save the conversation to memories
  await saveMemory(
    state.user_id,
    state.message,
    'finance',
    'chat'
  )
  await saveMemory(
    state.user_id,
    response.response,
    'finance',
    'chat'
  )

  return {
    expert_response: response.response,
    memories_used: response.memories_used,
  }
}

/**
 * Work expert node
 */
async function workExpertNode(state: AgentState): Promise<Partial<AgentState>> {
  const expert = new WorkExpert()
  const response = await expert.generateResponse(
    state.user_id,
    state.message,
    state.conversation_history
  )

  // Save the conversation to memories
  await saveMemory(
    state.user_id,
    state.message,
    'work',
    'chat'
  )
  await saveMemory(
    state.user_id,
    response.response,
    'work',
    'chat'
  )

  return {
    expert_response: response.response,
    memories_used: response.memories_used,
  }
}

/**
 * Health expert node
 */
async function healthExpertNode(state: AgentState): Promise<Partial<AgentState>> {
  const expert = new HealthExpert()
  const response = await expert.generateResponse(
    state.user_id,
    state.message,
    state.conversation_history
  )

  // Save the conversation to memories
  await saveMemory(
    state.user_id,
    state.message,
    'health',
    'chat'
  )
  await saveMemory(
    state.user_id,
    response.response,
    'health',
    'chat'
  )

  return {
    expert_response: response.response,
    memories_used: response.memories_used,
  }
}

/**
 * General expert node
 */
async function generalExpertNode(state: AgentState): Promise<Partial<AgentState>> {
  const expert = new GeneralExpert()
  const response = await expert.generateResponse(
    state.user_id,
    state.message,
    state.conversation_history
  )

  // Save the conversation to memories
  await saveMemory(
    state.user_id,
    state.message,
    'general',
    'chat'
  )
  await saveMemory(
    state.user_id,
    response.response,
    'general',
    'chat'
  )

  return {
    expert_response: response.response,
    memories_used: response.memories_used,
  }
}

/**
 * Route to the appropriate expert based on intent
 */
function routeToExpertNode(state: AgentState): string {
  const intent = state.intent || 'general'
  return intent
}

/**
 * Create and compile the agent graph
 */
export function createAgentGraph() {
  const workflow = new StateGraph({
    channels: {
      user_id: {
        reducer: (x: string, y: string) => y ?? x,
        default: () => '',
      },
      message: {
        reducer: (x: string, y: string) => y ?? x,
        default: () => '',
      },
      intent: {
        reducer: (x: ExpertType | undefined, y: ExpertType | undefined) => y ?? x,
        default: () => undefined,
      },
      routing_decision: {
        reducer: (x: any, y: any) => y ?? x,
        default: () => undefined,
      },
      expert_response: {
        reducer: (x: string | undefined, y: string | undefined) => y ?? x,
        default: () => undefined,
      },
      memories_used: {
        reducer: (x: number | undefined, y: number | undefined) => y ?? x,
        default: () => undefined,
      },
      conversation_history: {
        reducer: (x: any, y: any) => y ?? x,
        default: () => undefined,
      },
    },
  })

  // Add nodes
  workflow.addNode('router', routerNode)
  workflow.addNode('finance_expert', financeExpertNode)
  workflow.addNode('work_expert', workExpertNode)
  workflow.addNode('health_expert', healthExpertNode)
  workflow.addNode('general_expert', generalExpertNode)

  // Add edges
  workflow.addEdge(START, 'router')
  workflow.addConditionalEdges('router', routeToExpertNode, {
    finance: 'finance_expert',
    work: 'work_expert',
    health: 'health_expert',
    general: 'general_expert',
  })
  workflow.addEdge('finance_expert', END)
  workflow.addEdge('work_expert', END)
  workflow.addEdge('health_expert', END)
  workflow.addEdge('general_expert', END)

  return workflow.compile()
}

/**
 * Run the agent graph with streaming support
 */
export async function* streamAgentResponse(
  userId: string,
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncGenerator<Partial<AgentState>, void, unknown> {
  try {
    const graph = createAgentGraph()
    const initialState: AgentState = {
      user_id: userId,
      message,
      conversation_history: conversationHistory,
    }

    // Use invoke instead of stream for better compatibility
    // The compiled graph should have an invoke method
    if (graph && typeof graph.invoke === 'function') {
      const finalState = await graph.invoke(initialState)
      // Yield the final state as a single result
      yield finalState
    } else {
      console.error('Graph does not have invoke method')
      throw new Error('Graph execution not available')
    }
  } catch (error) {
    console.error('Error in streamAgentResponse:', error)
    throw error
  }
}
