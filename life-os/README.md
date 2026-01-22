# LifeOS - Personal AI Chief of Staff

A Next.js application that serves as your personal AI assistant, helping you manage tasks, recall memories, and stay organized using AI-powered features.

## Features

- **Chat Interface**: Interactive chat with AI assistant powered by Gemini 1.5 Flash
- **Memory System**: Save and recall memories using vector embeddings (text-embedding-004)
- **Task Management**: Create, list, and manage tasks with domain organization
- **Multi-Modal Input**:
  - Text input
  - Voice input (Web Speech API)
  - Vision mode (image upload and analysis)
  - CSV dropzone (for future P&L parsing)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Vercel AI SDK with Google Gemini 1.5 Flash
- **Embeddings**: Google text-embedding-004

## Prerequisites

1. Node.js 18+ installed
2. A Supabase project with the following tables:
   - `domains` (id, name, description)
   - `memories` (id, domain_id, content, embedding [vector 768], created_at)
   - `tasks` (id, domain_id, title, status, priority, due_date)
   - `chat_logs` (id, domain_id, role, message)
   - `journal_entries` (id, domain_id, entry_text)
3. A Google AI API key
4. A Supabase RPC function `match_memories` for vector similarity search

## Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
   ```

3. **Set up Supabase RPC function**:
   Create the `match_memories` function in your Supabase database:
   ```sql
   CREATE OR REPLACE FUNCTION match_memories(
     query_embedding vector(768),
     match_domain_id int DEFAULT NULL,
     match_threshold float DEFAULT 0.5,
     match_count int DEFAULT 5
   )
   RETURNS TABLE (
     id bigint,
     content text,
     domain_id int,
     created_at timestamp with time zone,
     similarity float
   )
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       memories.id,
       memories.content,
       memories.domain_id,
       memories.created_at,
       1 - (memories.embedding <=> query_embedding) as similarity
     FROM memories
     WHERE 
       (match_domain_id IS NULL OR memories.domain_id = match_domain_id)
       AND (1 - (memories.embedding <=> query_embedding)) > match_threshold
     ORDER BY memories.embedding <=> query_embedding
     LIMIT match_count;
   END;
   $$;
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
life-os/
├── actions/
│   └── brain.ts          # Server actions for memory operations
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts  # Chat API route with AI tools
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main chat interface
│   └── globals.css       # Global styles
├── components/
│   └── InputBar.tsx      # Multi-modal input component
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # Browser Supabase client
│   │   └── server.ts     # Server Supabase client
│   └── utils.ts          # Utility functions (cn)
├── types/
│   └── speech-recognition.d.ts  # Web Speech API types
└── package.json
```

## AI Tools

The chat API includes three tools that the AI can use:

1. **recall_memory**: Searches for relevant memories based on a query
2. **list_tasks**: Lists tasks with optional filtering by domain and status
3. **save_task**: Creates a new task in the database

## Development

- The project uses TypeScript for type safety
- Tailwind CSS v4 for styling
- Shadcn/UI components (ready to be added via CLI)
- Server Actions for database operations
- Edge-compatible API routes (except where Node.js APIs are needed)

## Notes

- Voice input requires browser support for Web Speech API (Chrome, Edge, Safari)
- Image uploads are converted to base64 and sent to Gemini's vision model
- CSV parsing feature is a placeholder for future implementation
- The embedding model generates 768-dimensional vectors
