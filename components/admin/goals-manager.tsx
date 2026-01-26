'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2, Download, Search, Filter, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { Progress } from '@/components/ui/progress'

interface Goal {
  id: string
  title: string
  description: string | null
  category: 'finance' | 'work' | 'health' | 'personal' | 'general'
  target_date: string | null
  start_date: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  progress: number
  priority: 'low' | 'medium' | 'high'
  color: string | null
  created_at: string
  updated_at: string
}

export function GoalsManager() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/goals')
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Admin: Fetched goals:', data.goals?.length || 0)
        setGoals(data.goals || [])
      } else {
        console.error('Error fetching goals:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setGoals(goals.filter((g) => g.id !== goalId))
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Title', 'Category', 'Status', 'Progress', 'Priority', 'Target Date', 'Created'],
      ...filteredGoals.map((goal) => [
        goal.title,
        goal.category,
        goal.status,
        `${goal.progress}%`,
        goal.priority,
        goal.target_date ? format(new Date(goal.target_date), 'yyyy-MM-dd') : '',
        format(new Date(goal.created_at), 'yyyy-MM-dd'),
      ]),
    ].map((row) => row.map((cell) => `"${cell}"`).join(','))

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `goals-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredGoals = goals.filter((goal) => {
    const matchesSearch =
      goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (goal.description &&
        goal.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = filterCategory === 'all' || goal.category === filterCategory
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading goals...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Goals ({filteredGoals.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchGoals}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredGoals.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {goals.length === 0
              ? 'No goals found. Create one via chat or the goals page.'
              : 'No goals match your filters.'}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGoals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium">{goal.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-32">
                        <Progress value={goal.progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10">
                          {goal.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{goal.status}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="px-2 py-1 rounded text-xs text-white"
                        style={{
                          backgroundColor: goal.color || '#6b7280',
                        }}
                      >
                        {goal.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{goal.priority}</span>
                    </TableCell>
                    <TableCell>
                      {goal.target_date
                        ? format(new Date(goal.target_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
