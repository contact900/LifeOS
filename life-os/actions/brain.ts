"use server";

import { createClient } from "@/lib/supabase/server";
import { embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

/**
 * Generates an embedding for the given text using Google's text-embedding-004 model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  try {
    // Use direct API call - the embedding API format uses 'text' field directly
    // Based on Google's embedding API, text-embedding-004 uses a simpler format
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: {
            parts: [{ text }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Embedding API error:", errorText);
      throw new Error(`Failed to generate embedding: ${errorText}`);
    }

    const data = await response.json();
    
    // The response format for text-embedding-004 is different
    if (data.embedding && data.embedding.values) {
      return data.embedding.values;
    }
    
    throw new Error("Invalid embedding response format");
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Saves a memory with its embedding to the database
 * @param text - The memory content to save
 * @param domainId - The domain ID to associate the memory with
 * @returns The created memory record
 */
export async function saveMemory(text: string, domainId: number) {
  const supabase = await createClient();

  try {
    // Generate embedding
    const embedding = await generateEmbedding(text);

    // Insert memory with embedding
    const { data, error } = await supabase
      .from("memories")
      .insert({
        domain_id: domainId,
        content: text,
        embedding: embedding,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save memory: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error saving memory:", error);
    throw error;
  }
}

/**
 * Recalls memories similar to the query using vector similarity search
 * @param query - The search query text
 * @param domainId - The domain ID to search within (optional)
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Array of matching memories with similarity scores
 */
export async function recall(
  query: string,
  domainId?: number,
  limit: number = 5
) {
  const supabase = await createClient();

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Call the RPC function match_memories
    // This assumes you have a match_memories function in Supabase that performs vector similarity search
    const { data, error } = await supabase.rpc("match_memories", {
      query_embedding: queryEmbedding,
      match_domain_id: domainId || null,
      match_threshold: 0.5, // Similarity threshold (adjust as needed)
      match_count: limit,
    });

    if (error) {
      throw new Error(`Failed to recall memories: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error recalling memories:", error);
    throw error;
  }
}

