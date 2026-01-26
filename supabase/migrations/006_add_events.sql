-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN NOT NULL DEFAULT false,
    location TEXT,
    category memory_category NOT NULL DEFAULT 'general',
    color TEXT, -- Hex color for calendar display
    reminder_minutes INTEGER[], -- Array of minutes before event to send reminders (e.g., [15, 60])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS events_user_id_idx ON events(user_id);
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events(start_date);
CREATE INDEX IF NOT EXISTS events_user_start_date_idx ON events(user_id, start_date);
CREATE INDEX IF NOT EXISTS events_category_idx ON events(category);
CREATE INDEX IF NOT EXISTS events_user_date_range_idx ON events(user_id, start_date, end_date);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for events
CREATE POLICY "Users can view their own events"
    ON events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
    ON events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
    ON events FOR DELETE
    USING (auth.uid() = user_id);

-- Junction table for events and notes
CREATE TABLE IF NOT EXISTS event_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, note_id)
);

CREATE INDEX IF NOT EXISTS event_notes_event_id_idx ON event_notes(event_id);
CREATE INDEX IF NOT EXISTS event_notes_note_id_idx ON event_notes(note_id);

ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event notes"
    ON event_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_notes.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own event notes"
    ON event_notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_notes.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own event notes"
    ON event_notes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_notes.event_id
            AND events.user_id = auth.uid()
        )
    );

-- Junction table for events and recordings
CREATE TABLE IF NOT EXISTS event_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, recording_id)
);

CREATE INDEX IF NOT EXISTS event_recordings_event_id_idx ON event_recordings(event_id);
CREATE INDEX IF NOT EXISTS event_recordings_recording_id_idx ON event_recordings(recording_id);

ALTER TABLE event_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event recordings"
    ON event_recordings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_recordings.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own event recordings"
    ON event_recordings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_recordings.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own event recordings"
    ON event_recordings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_recordings.event_id
            AND events.user_id = auth.uid()
        )
    );
