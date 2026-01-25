-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum types
CREATE TYPE memory_category AS ENUM ('finance', 'work', 'health', 'general');
CREATE TYPE source_type AS ENUM ('chat', 'note', 'recording');

-- Create memories table for vector storage
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    category memory_category NOT NULL DEFAULT 'general',
    source_type source_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    transcript TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for memories table
CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);
CREATE INDEX IF NOT EXISTS memories_category_idx ON memories(category);
CREATE INDEX IF NOT EXISTS memories_user_category_idx ON memories(user_id, category);
CREATE INDEX IF NOT EXISTS memories_created_at_idx ON memories(created_at DESC);

-- Create vector index for similarity search (using HNSW for better performance)
-- Note: HNSW requires at least 100 rows. For smaller datasets, use ivfflat instead.
-- Uncomment the appropriate index based on your data size:
CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative for smaller datasets (uncomment if needed):
-- CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Create indexes for notes table
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC);

-- Create indexes for recordings table
CREATE INDEX IF NOT EXISTS recordings_user_id_idx ON recordings(user_id);
CREATE INDEX IF NOT EXISTS recordings_created_at_idx ON recordings(created_at DESC);

-- Create function for vector similarity search (cosine distance)
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding vector(1536),
    match_user_id UUID,
    match_category memory_category,
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    category memory_category,
    source_type source_type,
    created_at TIMESTAMP WITH TIME ZONE,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        memories.id,
        memories.content,
        memories.category,
        memories.source_type,
        memories.created_at,
        1 - (memories.embedding <=> query_embedding) AS similarity
    FROM memories
    WHERE
        memories.user_id = match_user_id
        AND memories.category = match_category
        AND memories.embedding IS NOT NULL
        AND 1 - (memories.embedding <=> query_embedding) > match_threshold
    ORDER BY memories.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_memories_updated_at
    BEFORE UPDATE ON memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recordings_updated_at
    BEFORE UPDATE ON recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for memories
CREATE POLICY "Users can view their own memories"
    ON memories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
    ON memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
    ON memories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
    ON memories FOR DELETE
    USING (auth.uid() = user_id);

-- Create RLS policies for notes
CREATE POLICY "Users can view their own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- Create RLS policies for recordings
CREATE POLICY "Users can view their own recordings"
    ON recordings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings"
    ON recordings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
    ON recordings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
    ON recordings FOR DELETE
    USING (auth.uid() = user_id);
