'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, FileText, Mic, MessageSquare, TrendingUp } from 'lucide-react'

interface Stats {
  memories: number
  notes: number
  recordings: number
  total: number
  recentActivity: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    memories: 0,
    notes: 0,
    recordings: 0,
    total: 0,
    recentActivity: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [memoriesRes, notesRes, recordingsRes] = await Promise.all([
        fetch('/api/admin/stats?type=memories'),
        fetch('/api/admin/stats?type=notes'),
        fetch('/api/admin/stats?type=recordings'),
      ])

      const [memories, notes, recordings] = await Promise.all([
        memoriesRes.json(),
        notesRes.json(),
        recordingsRes.json(),
      ])

      const total = (memories.count || 0) + (notes.count || 0) + (recordings.count || 0)
      
      setStats({
        memories: memories.count || 0,
        notes: notes.count || 0,
        recordings: recordings.count || 0,
        total,
        recentActivity: memories.recent || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">All data types</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memories</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.memories}</div>
          <p className="text-xs text-muted-foreground">Vector memories</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.notes}</div>
          <p className="text-xs text-muted-foreground">Written notes</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recordings</CardTitle>
          <Mic className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recordings}</div>
          <p className="text-xs text-muted-foreground">Audio files</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recentActivity}</div>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </CardContent>
      </Card>
    </div>
  )
}
