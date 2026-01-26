-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system templates
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('note', 'recording')),
    content_json JSONB, -- For note templates (Tiptap JSON structure)
    content_text TEXT, -- For recording templates (prompts/instructions)
    category memory_category NOT NULL DEFAULT 'general',
    is_system BOOLEAN NOT NULL DEFAULT false, -- System templates vs user-created
    icon TEXT, -- Optional icon identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name) -- Each user can only have one template with a given name (NULL user_id means system template)
);

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS templates_user_id_idx ON templates(user_id);
CREATE INDEX IF NOT EXISTS templates_type_idx ON templates(type);
CREATE INDEX IF NOT EXISTS templates_category_idx ON templates(category);
CREATE INDEX IF NOT EXISTS templates_user_type_idx ON templates(user_id, type);
CREATE INDEX IF NOT EXISTS templates_is_system_idx ON templates(is_system);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for templates
CREATE POLICY "Users can view their own templates and system templates"
    ON templates FOR SELECT
    USING (auth.uid() = user_id OR (is_system = true AND user_id IS NULL));

CREATE POLICY "Users can insert their own templates"
    ON templates FOR INSERT
    WITH CHECK (auth.uid() = user_id AND is_system = false AND user_id IS NOT NULL);

CREATE POLICY "Users can update their own templates"
    ON templates FOR UPDATE
    USING (auth.uid() = user_id AND is_system = false AND user_id IS NOT NULL);

CREATE POLICY "Users can delete their own templates"
    ON templates FOR DELETE
    USING (auth.uid() = user_id AND is_system = false AND user_id IS NOT NULL);

-- Insert some default system templates
-- Note: Using jsonb_build_object for safer JSON construction
-- System templates have NULL user_id
INSERT INTO templates (user_id, name, description, type, content_json, is_system, icon, content_text) VALUES
-- Note templates
(
    NULL, -- System templates have NULL user_id
    'Meeting Notes',
    'Template for structured meeting notes',
    'note',
    jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 1), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Meeting Notes'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Date:'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Attendees:'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Agenda:'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Notes:'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Action Items:'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph')))))
        )
    ),
    true,
    'users',
    NULL
),
(
    NULL,
    'Journal Entry',
    'Template for daily journal entries',
    'note',
    jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 1), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Journal Entry'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Date:'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'What happened today?'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'How do I feel?'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'What am I grateful for?'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Reflection:'))),
            jsonb_build_object('type', 'paragraph')
        )
    ),
    true,
    'book-open',
    NULL
),
(
    NULL,
    'Project Planning',
    'Template for project planning and brainstorming',
    'note',
    jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 1), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Project: [Project Name]'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Overview:'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Goals:'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Tasks:'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Timeline:'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Resources:'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Notes:'))),
            jsonb_build_object('type', 'paragraph')
        )
    ),
    true,
    'folder-kanban',
    NULL
),
(
    NULL,
    'Daily Standup',
    'Template for daily standup notes',
    'note',
    jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 1), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Daily Standup'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Date:'))),
            jsonb_build_object('type', 'paragraph'),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'What did I accomplish yesterday?'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'What will I work on today?'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))))),
            jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Blockers or concerns:'))),
            jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph')))))
        )
    ),
    true,
    'calendar',
    NULL
),
-- Recording templates (note: these use content_text, not content_json)
(
    NULL,
    'Voice Memo',
    'Quick voice memo template',
    'recording',
    NULL, -- content_json is NULL for recording templates
    true,
    'mic',
    'Record your thoughts, ideas, or reminders. Speak naturally and the AI will transcribe and summarize your recording.'
),
(
    NULL,
    'Meeting Recording',
    'Template for recording meetings',
    'recording',
    NULL, -- content_json is NULL for recording templates
    true,
    'users',
    'Record your meeting discussion. The AI will transcribe and create a summary with key points and action items.'
),
(
    NULL,
    'Interview Notes',
    'Template for interview recordings',
    'recording',
    NULL, -- content_json is NULL for recording templates
    true,
    'message-circle',
    'Record your interview. The AI will transcribe and help organize key responses and insights.'
);
