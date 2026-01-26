-- Create insights table for storing AI-generated insights
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('weekly_summary', 'monthly_summary', 'pattern', 'productivity', 'custom')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  insights_data JSONB DEFAULT '{}'::jsonb, -- Structured insights data
  patterns JSONB DEFAULT '[]'::jsonb, -- Detected patterns
  metrics JSONB DEFAULT '{}'::jsonb, -- Calculated metrics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create insight_patterns table for storing detected patterns
CREATE TABLE IF NOT EXISTS insight_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('task_completion', 'note_frequency', 'recording_habits', 'goal_progress', 'time_usage', 'category_distribution', 'productivity_trend')),
  pattern_name TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_points JSONB DEFAULT '[]'::jsonb,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create productivity_metrics table for tracking productivity insights
CREATE TABLE IF NOT EXISTS productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  notes_created INTEGER DEFAULT 0,
  recordings_created INTEGER DEFAULT 0,
  goals_progress DECIMAL(5,2) DEFAULT 0.0, -- Percentage of goals progressed
  active_time_minutes INTEGER DEFAULT 0, -- Estimated active time
  category_distribution JSONB DEFAULT '{}'::jsonb, -- Distribution across categories
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_period ON insights(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_insight_patterns_user_id ON insight_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_patterns_type ON insight_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_insight_patterns_active ON insight_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_user_id ON productivity_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_date ON productivity_metrics(metric_date);

-- Create trigger for updated_at
CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insights
CREATE POLICY "Users can view their own insights"
  ON insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insights"
  ON insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
  ON insights FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for insight_patterns
CREATE POLICY "Users can view their own patterns"
  ON insight_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patterns"
  ON insight_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns"
  ON insight_patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patterns"
  ON insight_patterns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for productivity_metrics
CREATE POLICY "Users can view their own productivity metrics"
  ON productivity_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own productivity metrics"
  ON productivity_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own productivity metrics"
  ON productivity_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own productivity metrics"
  ON productivity_metrics FOR DELETE
  USING (auth.uid() = user_id);
