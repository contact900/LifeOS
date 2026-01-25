# LifeOS Setup Checklist

## ✅ Completed
- [x] Project initialized with Next.js 15+
- [x] Dependencies installed
- [x] Environment variables configured
- [x] Core files created (brain.ts, chat API, InputBar, main page)

## 🔍 What You Need to Verify/Set Up

### 1. Database Schema Verification
Please verify these tables exist in your Supabase database:

- ✅ `domains` (id, name, description)
- ✅ `memories` (id, domain_id, content, embedding [vector 768], created_at)
- ✅ `tasks` (id, domain_id, title, status, priority, due_date)
- ✅ `chat_logs` (id, domain_id, role, message)
- ✅ `journal_entries` (id, domain_id, entry_text)

### 2. ⚠️ **CRITICAL: Vector Extension & RPC Function**
You need to set up the vector similarity search function. Run this SQL in your Supabase SQL Editor:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the match_memories function for vector similarity search
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

### 3. Test the Setup

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Test basic chat functionality:**
   - Open http://localhost:3000
   - Try sending a message like "Hello, can you help me create a task?"
   - The AI should be able to respond and use the `save_task` tool

3. **Test memory recall:**
   - First, you'll need to save some memories using the `saveMemory` function
   - Then ask the AI to recall something

### 4. Optional: Add Sample Data

If you want to test with sample data, you can add some domains first:

```sql
INSERT INTO domains (name, description) VALUES
  ('Work', 'Work-related tasks and memories'),
  ('Personal', 'Personal life items'),
  ('Health', 'Health and fitness related');
```

### 5. Browser Compatibility Notes

- **Voice Input**: Requires Chrome, Edge, or Safari (Web Speech API)
- **Image Upload**: Works in all modern browsers
- **CSV Upload**: Placeholder - needs implementation

## 🐛 Troubleshooting

### If embeddings fail:
- Check that `GOOGLE_GENERATIVE_AI_API_KEY` is correct
- Verify the text-embedding-004 model is accessible with your API key

### If database queries fail:
- Verify RLS (Row Level Security) policies allow your anon key to read/write
- Check that the `match_memories` function exists and is callable
- Ensure the `embedding` column type is `vector(768)`

### If chat API fails:
- Check browser console for errors
- Verify API route is accessible at `/api/chat`
- Check that Gemini API key has access to `gemini-1.5-flash` model

## Next Steps After Setup

1. Create some domains in your database
2. Test creating tasks through the chat interface
3. Test saving and recalling memories
4. Customize the UI/UX as needed


