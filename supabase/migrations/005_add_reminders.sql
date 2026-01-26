-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    email_notification BOOLEAN NOT NULL DEFAULT false,
    browser_notification BOOLEAN NOT NULL DEFAULT true,
    category memory_category NOT NULL DEFAULT 'general',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) NOT NULL DEFAULT 'medium',
    context TEXT, -- Additional context for smart reminders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for reminders
CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders(user_id);
CREATE INDEX IF NOT EXISTS reminders_due_date_idx ON reminders(due_date);
CREATE INDEX IF NOT EXISTS reminders_user_due_date_idx ON reminders(user_id, due_date);
CREATE INDEX IF NOT EXISTS reminders_notification_sent_idx ON reminders(notification_sent);
CREATE INDEX IF NOT EXISTS reminders_category_idx ON reminders(category);
CREATE INDEX IF NOT EXISTS reminders_user_active_idx ON reminders(user_id, due_date) WHERE completed_at IS NULL;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reminders
CREATE POLICY "Users can view their own reminders"
    ON reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
    ON reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
    ON reminders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
    ON reminders FOR DELETE
    USING (auth.uid() = user_id);

-- Function to get upcoming reminders (for notification service)
CREATE OR REPLACE FUNCTION get_upcoming_reminders(
    check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    email_notification BOOLEAN,
    browser_notification BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.user_id,
        r.title,
        r.description,
        r.due_date,
        r.email_notification,
        r.browser_notification
    FROM reminders r
    WHERE r.completed_at IS NULL
        AND r.notification_sent = false
        AND r.due_date <= check_time
        AND r.due_date >= check_time - INTERVAL '1 hour'; -- Reminders within the last hour
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
