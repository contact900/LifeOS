-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'google_calendar', 'slack')),
  provider_account_id TEXT, -- External account ID from the provider
  access_token TEXT NOT NULL, -- Encrypted access token
  refresh_token TEXT, -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  scope TEXT, -- OAuth scopes granted
  email TEXT, -- User's email for this integration
  name TEXT, -- Display name for the integration
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_settings JSONB DEFAULT '{}'::jsonb, -- Custom sync settings per provider
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create integration_sync_log table for tracking sync history
CREATE TABLE IF NOT EXISTS integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'email', 'calendar', 'slack'
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create synced_emails table for storing synced emails
CREATE TABLE IF NOT EXISTS synced_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL, -- External message ID
  thread_id TEXT,
  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[],
  cc_emails TEXT[],
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  labels TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integration_id, provider_message_id)
);

-- Create synced_calendar_events table for storing synced calendar events
CREATE TABLE IF NOT EXISTS synced_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL, -- External event ID
  calendar_id TEXT, -- Calendar ID from provider
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  attendees JSONB, -- Array of attendee objects
  is_all_day BOOLEAN DEFAULT false,
  status TEXT, -- 'confirmed', 'tentative', 'cancelled'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integration_id, provider_event_id)
);

-- Create synced_slack_messages table for storing synced Slack messages
CREATE TABLE IF NOT EXISTS synced_slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL, -- Slack message timestamp
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  user_id_slack TEXT, -- Slack user ID
  user_name TEXT,
  text TEXT NOT NULL,
  thread_ts TEXT, -- Thread timestamp if this is a reply
  is_thread BOOLEAN DEFAULT false,
  reactions JSONB, -- Array of reaction objects
  attachments JSONB, -- Array of attachment objects
  posted_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integration_id, provider_message_id, channel_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_integration_id ON integration_sync_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_started_at ON integration_sync_log(started_at);
CREATE INDEX IF NOT EXISTS idx_synced_emails_user_id ON synced_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_integration_id ON synced_emails(integration_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_received_at ON synced_emails(received_at);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_user_id ON synced_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_integration_id ON synced_calendar_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_start_time ON synced_calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_synced_slack_messages_user_id ON synced_slack_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_slack_messages_integration_id ON synced_slack_messages(integration_id);
CREATE INDEX IF NOT EXISTS idx_synced_slack_messages_channel_id ON synced_slack_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_synced_slack_messages_posted_at ON synced_slack_messages(posted_at);

-- Create trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synced_emails_updated_at
  BEFORE UPDATE ON synced_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synced_calendar_events_updated_at
  BEFORE UPDATE ON synced_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_slack_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations
CREATE POLICY "Users can view their own integrations"
  ON integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
  ON integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON integrations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for integration_sync_log
CREATE POLICY "Users can view sync logs for their integrations"
  ON integration_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = integration_sync_log.integration_id
      AND integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sync logs for their integrations"
  ON integration_sync_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = integration_sync_log.integration_id
      AND integrations.user_id = auth.uid()
    )
  );

-- RLS Policies for synced_emails
CREATE POLICY "Users can view their own synced emails"
  ON synced_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own synced emails"
  ON synced_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own synced emails"
  ON synced_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced emails"
  ON synced_emails FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for synced_calendar_events
CREATE POLICY "Users can view their own synced calendar events"
  ON synced_calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own synced calendar events"
  ON synced_calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own synced calendar events"
  ON synced_calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced calendar events"
  ON synced_calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for synced_slack_messages
CREATE POLICY "Users can view their own synced Slack messages"
  ON synced_slack_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own synced Slack messages"
  ON synced_slack_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own synced Slack messages"
  ON synced_slack_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced Slack messages"
  ON synced_slack_messages FOR DELETE
  USING (auth.uid() = user_id);
