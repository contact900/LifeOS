import { streamText, tool, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { recall } from "@/actions/brain";
import { createClient } from "@/lib/supabase/server";

// Note: Using nodejs runtime because Supabase server client requires Node.js APIs
// export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    console.log("Received request with messages:", JSON.stringify(messages, null, 2));

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request: messages array required", { status: 400 });
    }

    // Define tools first (needed for convertToModelMessages if messages contain tool calls)
    // Initialize Supabase client for tool calls
    const supabase = await createClient();

    // Define tools
    const tools = {
      recall_memory: tool({
        description:
          "Recalls relevant memories based on a query. Use this when the user asks about past information, events, or context.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to find relevant memories",
            },
            domainId: {
              type: "number",
              description: "Optional domain ID to filter memories (e.g., 1 for work, 2 for personal)",
            },
          },
          required: ["query"],
        },
        execute: async ({ query, domainId }) => {
          try {
            const memories = await recall(query, domainId);
            if (memories.length === 0) {
              return {
                found: false,
                message: "No relevant memories found for this query. Note: Memory recall feature is currently being set up - embeddings need to be configured.",
              };
            }
            return {
              found: true,
              memories: memories.map((m: any) => ({
                content: m.content,
                similarity: m.similarity,
                createdAt: m.created_at,
              })),
            };
          } catch (error) {
            console.error("Error in recall_memory tool:", error);
            return {
              found: false,
              message: "Unable to search memories at this time. The embedding API needs to be configured correctly.",
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        },
      }),
      list_tasks: tool({
        description:
          "Lists tasks from the database. Use this when the user asks about their tasks, to-dos, or what they need to do.",
        parameters: {
          type: "object",
          properties: {
            domainId: {
              type: "number",
              description: "Optional domain ID to filter tasks",
            },
            status: {
              type: "string",
              description: "Filter by status: 'pending', 'in_progress', 'completed'",
              enum: ["pending", "in_progress", "completed"],
            },
          },
          required: [],
        },
        execute: async ({ domainId, status }) => {
          try {
            let query = supabase.from("tasks").select("*");

            if (domainId) {
              query = query.eq("domain_id", domainId);
            }

            if (status) {
              query = query.eq("status", status);
            }

            query = query.order("due_date", { ascending: true });

            const { data, error } = await query;

            if (error) {
              return {
                success: false,
                error: error.message,
              };
            }

            return {
              success: true,
              tasks: data || [],
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        },
      }),
      save_task: tool({
        description:
          "Creates or updates a task. Use this when the user wants to create a new task, update an existing one, or set a reminder.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The task title/description",
            },
            domainId: {
              type: "number",
              description: "The domain ID for this task",
            },
            status: {
              type: "string",
              description: "Task status",
              enum: ["pending", "in_progress", "completed"],
            },
            priority: {
              type: "string",
              description: "Task priority",
              enum: ["low", "medium", "high"],
            },
            dueDate: {
              type: "string",
              description: "Due date in ISO format (YYYY-MM-DD)",
            },
          },
          required: ["title"],
        },
        execute: async ({ title, domainId, status, priority, dueDate }) => {
          try {
            const { data, error } = await supabase
              .from("tasks")
              .insert({
                title,
                domain_id: domainId || null,
                status: status || "pending",
                priority: priority || "medium",
                due_date: dueDate || null,
              })
              .select()
              .single();

            if (error) {
              return {
                success: false,
                error: error.message,
              };
            }

            return {
              success: true,
              task: data,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        },
      }),
    };

    // Check if API key is available
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("API Key check - exists:", !!apiKey, "first 10 chars:", apiKey?.substring(0, 10));
    
    if (!apiKey) {
      console.error("GOOGLE_GENERATIVE_AI_API_KEY is not set!");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert UI messages to ModelMessages for the AI SDK
    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(messages, { tools });
      console.log("Converted model messages count:", modelMessages.length);
      console.log("First message role:", modelMessages[0]?.role);
    } catch (convertError) {
      console.error("Error converting messages:", convertError);
      throw convertError;
    }

    console.log("API Key exists, creating streamText with model:", "gemini-2.5-flash");
    console.log("Model messages to send:", modelMessages.length);

    try {
      const result = streamText({
        model: google("gemini-2.5-flash", {
          apiKey: apiKey,
        }),
        messages: modelMessages,
        tools,
      });

      console.log("StreamText result created, returning UI message stream response");
      return result.toUIMessageStreamResponse();
    } catch (streamError) {
      console.error("Error in streamText:", streamError);
      throw streamError;
    }
  } catch (error) {
    console.error("Error in chat API route:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

