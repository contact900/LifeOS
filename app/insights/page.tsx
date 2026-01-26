'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  FileText,
  Mic,
  Database,
  CheckSquare,
  Target,
  Bell,
  Calendar as CalendarIcon,
  Plug,
  TrendingUp,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { GlobalSearch } from '@/components/search/global-search'
import { ReminderNotificationProvider } from '@/components/reminders/reminder-notification-provider'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface Insight {
  id: string
  insight_type: string
  period_start: string
  period_end: string
  title: string
  content: string
  insights_data: any
  patterns: any[]
  metrics: any
  created_at: string
}

interface Pattern {
  id: string
  pattern_type: string
  pattern_name: string
  description: string
  confidence_score: number
  data_points: any
  detected_at: string
  is_active: boolean
}

interface ProductivityStats {
  period_days: number
  total_tasks_completed: number
  total_tasks_created: number
  task_completion_rate: number
  total_notes: number
  total_recordings: number
  avg_goal_progress: number
  daily_metrics: any[]
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [productivityStats, setProductivityStats] = useState<ProductivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('summaries')

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      if (activeTab === 'summaries') {
        const response = await fetch('/api/insights?type=weekly_summary,monthly_summary&limit=10')
        if (response.ok) {
          const data = await response.json()
          setInsights(data.insights || [])
        }
      } else if (activeTab === 'patterns') {
        const response = await fetch('/api/insights/patterns?active_only=true')
        if (response.ok) {
          const data = await response.json()
          setPatterns(data.patterns || [])
        }
      } else if (activeTab === 'productivity') {
        const response = await fetch('/api/insights/productivity?days=30')
        if (response.ok) {
          const data = await response.json()
          setProductivityStats(data.stats || null)
        }
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateWeeklySummary = async () => {
    try {
      setGenerating(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight_type: 'weekly_summary',
          period_start: startDate.toISOString(),
          period_end: endDate.toISOString(),
        }),
      })

      if (response.ok) {
        await fetchData()
      } else {
        alert('Failed to generate summary. Please try again.')
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const generateMonthlySummary = async () => {
    try {
      setGenerating(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight_type: 'monthly_summary',
          period_start: startDate.toISOString(),
          period_end: endDate.toISOString(),
        }),
      })

      if (response.ok) {
        await fetchData()
      } else {
        alert('Failed to generate summary. Please try again.')
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const detectPatterns = async () => {
    try {
      setGenerating(true)
      const response = await fetch('/api/insights/patterns', {
        method: 'POST',
      })

      if (response.ok) {
        await fetchData()
      } else {
        alert('Failed to detect patterns. Please try again.')
      }
    } catch (error) {
      console.error('Error detecting patterns:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">LifeOS</h1>
            <GlobalSearch />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav className="space-y-2">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </Button>
            </Link>
            <Link href="/notes">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Notes
              </Button>
            </Link>
            <Link href="/recordings">
              <Button variant="ghost" className="w-full justify-start">
                <Mic className="mr-2 h-4 w-4" />
                Recordings
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="ghost" className="w-full justify-start">
                <CheckSquare className="mr-2 h-4 w-4" />
                Tasks
              </Button>
            </Link>
            <Link href="/goals">
              <Button variant="ghost" className="w-full justify-start">
                <Target className="mr-2 h-4 w-4" />
                Goals
              </Button>
            </Link>
            <Link href="/reminders">
              <Button variant="ghost" className="w-full justify-start">
                <Bell className="mr-2 h-4 w-4" />
                Reminders
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="ghost" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendar
              </Button>
            </Link>
            <Link href="/integrations">
              <Button variant="ghost" className="w-full justify-start">
                <Plug className="mr-2 h-4 w-4" />
                Integrations
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="default" className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" />
                Insights
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <p className="text-xs text-muted-foreground px-4">
            Your Personal Chief of Staff
          </p>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 overflow-y-auto p-6">
        <ReminderNotificationProvider />
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">AI Insights & Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Discover patterns, track productivity, and get personalized insights
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summaries">
                <FileText className="mr-2 h-4 w-4" />
                Summaries
              </TabsTrigger>
              <TabsTrigger value="patterns">
                <Lightbulb className="mr-2 h-4 w-4" />
                Patterns
              </TabsTrigger>
              <TabsTrigger value="productivity">
                <TrendingUp className="mr-2 h-4 w-4" />
                Productivity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summaries" className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={generateWeeklySummary}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Weekly Summary
                    </>
                  )}
                </Button>
                <Button
                  onClick={generateMonthlySummary}
                  disabled={generating}
                  variant="outline"
                >
                  Generate Monthly Summary
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : insights.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No summaries yet. Generate your first summary to get started!
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {insights.map((insight) => (
                    <Card key={insight.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{insight.title}</CardTitle>
                            <CardDescription>
                              {format(new Date(insight.period_start), 'MMM d')} -{' '}
                              {format(new Date(insight.period_end), 'MMM d, yyyy')}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">
                            {insight.insight_type === 'weekly_summary' ? 'Weekly' : 'Monthly'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap mb-4">{insight.content}</p>
                        
                        {insight.insights_data?.key_achievements && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Key Achievements</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {insight.insights_data.key_achievements.map((achievement: string, idx: number) => (
                                <li key={idx}>{achievement}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {insight.insights_data?.areas_for_improvement && (
                          <div>
                            <h4 className="font-semibold mb-2">Areas for Improvement</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {insight.insights_data.areas_for_improvement.map((area: string, idx: number) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {insight.metrics && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Productivity</div>
                                <div className="font-semibold">
                                  {((insight.metrics.productivity_score || 0) * 100).toFixed(0)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Consistency</div>
                                <div className="font-semibold">
                                  {((insight.metrics.consistency_score || 0) * 100).toFixed(0)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Engagement</div>
                                <div className="font-semibold">
                                  {((insight.metrics.engagement_score || 0) * 100).toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={detectPatterns}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Detect Patterns
                    </>
                  )}
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : patterns.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No patterns detected yet. Click "Detect Patterns" to analyze your behavior!
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{pattern.pattern_name}</CardTitle>
                            <CardDescription>{pattern.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{pattern.pattern_type}</Badge>
                            <Badge variant="outline">
                              {((pattern.confidence_score || 0) * 100).toFixed(0)}% confidence
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Detected on {format(new Date(pattern.detected_at), 'MMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="productivity" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : !productivityStats ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No productivity data available yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{productivityStats.total_tasks_completed}</div>
                        <p className="text-xs text-muted-foreground">
                          {productivityStats.total_tasks_created} created
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {productivityStats.task_completion_rate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Task efficiency</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Notes Created</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{productivityStats.total_notes}</div>
                        <p className="text-xs text-muted-foreground">Last {productivityStats.period_days} days</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Goal Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {productivityStats.avg_goal_progress.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Average progress</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Overview</CardTitle>
                      <CardDescription>
                        Last {productivityStats.period_days} days
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Tasks Completed</span>
                          <span className="font-semibold">{productivityStats.total_tasks_completed}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Notes Created</span>
                          <span className="font-semibold">{productivityStats.total_notes}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Recordings Created</span>
                          <span className="font-semibold">{productivityStats.total_recordings}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Task Completion Rate</span>
                          <span className="font-semibold">
                            {productivityStats.task_completion_rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
