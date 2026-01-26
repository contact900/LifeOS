-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6', -- Default blue color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name) -- Each user can only have one tag with a given name
);

-- Create junction tables for many-to-many relationships
CREATE TABLE IF NOT EXISTS notes_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE IF NOT EXISTS recordings_tags (
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (recording_id, tag_id)
);

CREATE TABLE IF NOT EXISTS tasks_tags (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, tag_id)
);

-- Create indexes for tags
CREATE INDEX IF NOT EXISTS tags_user_id_idx ON tags(user_id);
CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);
CREATE INDEX IF NOT EXISTS tags_user_name_idx ON tags(user_id, name);

-- Create indexes for junction tables
CREATE INDEX IF NOT EXISTS notes_tags_note_id_idx ON notes_tags(note_id);
CREATE INDEX IF NOT EXISTS notes_tags_tag_id_idx ON notes_tags(tag_id);
CREATE INDEX IF NOT EXISTS recordings_tags_recording_id_idx ON recordings_tags(recording_id);
CREATE INDEX IF NOT EXISTS recordings_tags_tag_id_idx ON recordings_tags(tag_id);
CREATE INDEX IF NOT EXISTS tasks_tags_task_id_idx ON tasks_tags(task_id);
CREATE INDEX IF NOT EXISTS tasks_tags_tag_id_idx ON tasks_tags(tag_id);

-- Create trigger to automatically update updated_at for tags
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags
CREATE POLICY "Users can view their own tags"
    ON tags FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
    ON tags FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
    ON tags FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
    ON tags FOR DELETE
    USING (auth.uid() = user_id);

-- Create RLS policies for notes_tags
CREATE POLICY "Users can view their own note tags"
    ON notes_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = notes_tags.note_id
            AND notes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own note tags"
    ON notes_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = notes_tags.note_id
            AND notes.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id = notes_tags.tag_id
            AND tags.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own note tags"
    ON notes_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = notes_tags.note_id
            AND notes.user_id = auth.uid()
        )
    );

-- Create RLS policies for recordings_tags
CREATE POLICY "Users can view their own recording tags"
    ON recordings_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recordings
            WHERE recordings.id = recordings_tags.recording_id
            AND recordings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own recording tags"
    ON recordings_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recordings
            WHERE recordings.id = recordings_tags.recording_id
            AND recordings.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id = recordings_tags.tag_id
            AND tags.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own recording tags"
    ON recordings_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recordings
            WHERE recordings.id = recordings_tags.recording_id
            AND recordings.user_id = auth.uid()
        )
    );

-- Create RLS policies for tasks_tags
CREATE POLICY "Users can view their own task tags"
    ON tasks_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = tasks_tags.task_id
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own task tags"
    ON tasks_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = tasks_tags.task_id
            AND tasks.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id = tasks_tags.tag_id
            AND tags.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own task tags"
    ON tasks_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = tasks_tags.task_id
            AND tasks.user_id = auth.uid()
        )
    );
