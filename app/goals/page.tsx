'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import {
  MessageSquare,
  FileText,
  Mic,
  Database,
  CheckSquare,
  Target,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Flag,
  Filter,
  TrendingUp,
  Bell,
  Calendar as CalendarIcon,
  Plug,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { GlobalSearch } from '@/components/search/global-search'
import { ReminderNotificationProvider } from '@/components/reminders/reminder-notification-provider'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'

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

interface Milestone {
  id: string
  goal_id: string
  title: string
  description: string | null
  target_date: string | null
  completed_at: string | null
  order_index: number
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'finance' | 'work' | 'health' | 'personal' | 'general'>('general')
  const [targetDate, setTargetDate] = useState('')
  const [status, setStatus] = useState<'active' | 'completed' | 'paused' | 'cancelled'>('active')
  const [progress, setProgress] = useState(0)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  // Milestone form state
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDescription, setMilestoneDescription] = useState('')
  const [milestoneTargetDate, setMilestoneTargetDate] = useState('')

  useEffect(() => {
    fetchGoals()
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [filterStatus, filterCategory, filterPriority])

  useEffect(() => {
    if (selectedGoal) {
      fetchMilestones(selectedGoal.id)
    }
  }, [selectedGoal])

  const fetchGoals = async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterCategory !== 'all') params.append('category', filterCategory)
      if (filterPriority !== 'all') params.append('priority', filterPriority)
      
      const url = `/api/goals${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMilestones = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}/milestones`)
      if (response.ok) {
        const data = await response.json()
        setMilestones(data.milestones || [])
      }
    } catch (error) {
      console.error('Error fetching milestones:', error)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('general')
    setTargetDate('')
    setStatus('active')
    setProgress(0)
    setPriority('medium')
    setEditingGoal(null)
  }

  const handleCreateGoal = async () => {
    if (!title.trim()) {
      alert('Please enter a goal title')
      return
    }

    try {
      // Format target_date properly if provided
      let formattedTargetDate = null
      if (targetDate) {
        // Convert date string to ISO format
        const date = new Date(targetDate)
        formattedTargetDate = date.toISOString()
      }

      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          target_date: formattedTargetDate,
          status,
          progress,
          priority,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGoals([data.goal, ...goals])
        resetForm()
        setIsDialogOpen(false)
        fetchGoals() // Refresh the list
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create goal' }))
        console.error('Error creating goal:', errorData)
        alert(errorData.error || 'Failed to create goal. Please try again.')
      }
    } catch (error) {
      console.error('Error creating goal:', error)
      alert('An error occurred while creating the goal. Please try again.')
    }
  }

  const handleUpdateGoal = async (goalId: string) => {
    if (!title.trim()) {
      alert('Please enter a goal title')
      return
    }

    try {
      // Format target_date properly if provided
      let formattedTargetDate = null
      if (targetDate) {
        const date = new Date(targetDate)
        formattedTargetDate = date.toISOString()
      }

      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          target_date: formattedTargetDate,
          status,
          progress,
          priority,
          progressNotes: 'Manual progress update',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGoals(goals.map((g) => (g.id === goalId ? data.goal : g)))
        resetForm()
        setIsDialogOpen(false)
        if (selectedGoal?.id === goalId) {
          setSelectedGoal(data.goal)
        }
        fetchGoals() // Refresh the list
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update goal' }))
        console.error('Error updating goal:', errorData)
        alert(errorData.error || 'Failed to update goal. Please try again.')
      }
    } catch (error) {
      console.error('Error updating goal:', error)
      alert('An error occurred while updating the goal. Please try again.')
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setGoals(goals.filter((g) => g.id !== goalId))
        if (selectedGoal?.id === goalId) {
          setSelectedGoal(null)
        }
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const handleCreateMilestone = async () => {
    if (!milestoneTitle.trim() || !selectedGoal) return

    try {
      const response = await fetch(`/api/goals/${selectedGoal.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: milestoneTitle,
          description: milestoneDescription || null,
          target_date: milestoneTargetDate || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMilestones([...milestones, data.milestone])
        setMilestoneTitle('')
        setMilestoneDescription('')
        setMilestoneTargetDate('')
        setIsMilestoneDialogOpen(false)
        fetchGoals() // Refresh to update progress
      }
    } catch (error) {
      console.error('Error creating milestone:', error)
    }
  }

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!selectedGoal) return

    try {
      const response = await fetch(
        `/api/goals/${selectedGoal.id}/milestones/${milestoneId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed_at: new Date().toISOString(),
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMilestones(
          milestones.map((m) => (m.id === milestoneId ? data.milestone : m))
        )
        fetchGoals() // Refresh to update progress
      }
    } catch (error) {
      console.error('Error completing milestone:', error)
    }
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedGoal || !confirm('Delete this milestone?')) return

    try {
      const response = await fetch(
        `/api/goals/${selectedGoal.id}/milestones/${milestoneId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setMilestones(milestones.filter((m) => m.id !== milestoneId))
        fetchGoals() // Refresh to update progress
      }
    } catch (error) {
      console.error('Error deleting milestone:', error)
    }
  }

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal)
    setTitle(goal.title)
    setDescription(goal.description || '')
    setCategory(goal.category)
    setTargetDate(goal.target_date ? goal.target_date.split('T')[0] : '')
    setStatus(goal.status)
    setProgress(goal.progress)
    setPriority(goal.priority)
    setIsDialogOpen(true)
  }

  const openGoalDetail = (goal: Goal) => {
    setSelectedGoal(goal)
  }

  const filteredGoals = goals.filter((goal) => {
    const matchesSearch =
      goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (goal.description &&
        goal.description.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesSearch
  })

  const activeGoals = filteredGoals.filter((g) => g.status === 'active')
  const completedGoals = filteredGoals.filter((g) => g.status === 'completed')

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
              <Button variant="default" className="w-full justify-start">
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
              <Button variant="ghost" className="w-full justify-start">
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Goals</h1>
              <p className="text-muted-foreground mt-2">
                Set goals, track progress, and achieve milestones
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Run a marathon"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your goal..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="targetDate">Target Date</Label>
                      <Input
                        id="targetDate"
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="progress">Progress: {progress}%</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="progress"
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={(e) => setProgress(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        editingGoal
                          ? handleUpdateGoal(editingGoal.id)
                          : handleCreateGoal()
                      }
                    >
                      {editingGoal ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Input
                placeholder="Search goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
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
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goals Grid */}
          {loading ? (
            <p className="text-muted-foreground">Loading goals...</p>
          ) : filteredGoals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No goals found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first goal to start tracking your progress
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map((goal) => (
                <Card
                  key={goal.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => openGoalDetail(goal)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(goal)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteGoal(goal.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-medium">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Flag className="h-3 w-3" />
                          <span className="capitalize">{goal.priority}</span>
                        </div>
                        <div
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{
                            backgroundColor: goal.color || '#6b7280',
                          }}
                        >
                          {goal.category}
                        </div>
                        {goal.target_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Goal Detail Dialog */}
          {selectedGoal && (
            <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedGoal.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {selectedGoal.description && (
                    <p className="text-muted-foreground">{selectedGoal.description}</p>
                  )}
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {selectedGoal.progress}%
                      </span>
                    </div>
                    <Progress value={selectedGoal.progress} className="h-3" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Milestones</h3>
                      <Button
                        size="sm"
                        onClick={() => setIsMilestoneDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Milestone
                      </Button>
                    </div>
                    {milestones.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No milestones yet. Add one to break down your goal into smaller steps.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {milestones.map((milestone) => (
                          <Card key={milestone.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={!!milestone.completed_at}
                                      onChange={() =>
                                        milestone.completed_at
                                          ? handleCompleteMilestone(milestone.id)
                                          : handleCompleteMilestone(milestone.id)
                                      }
                                      className="mt-1"
                                    />
                                    <div>
                                      <p
                                        className={
                                          milestone.completed_at
                                            ? 'line-through text-muted-foreground'
                                            : 'font-medium'
                                        }
                                      >
                                        {milestone.title}
                                      </p>
                                      {milestone.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {milestone.description}
                                        </p>
                                      )}
                                      {milestone.target_date && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Target: {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMilestone(milestone.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedGoal(null)}>
                      Close
                    </Button>
                    <Button onClick={() => openEditDialog(selectedGoal)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Goal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Milestone Creation Dialog */}
          <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Milestone</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="milestoneTitle">Title *</Label>
                  <Input
                    id="milestoneTitle"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    placeholder="e.g., Complete training plan"
                  />
                </div>
                <div>
                  <Label htmlFor="milestoneDescription">Description</Label>
                  <Textarea
                    id="milestoneDescription"
                    value={milestoneDescription}
                    onChange={(e) => setMilestoneDescription(e.target.value)}
                    placeholder="Describe this milestone..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="milestoneTargetDate">Target Date</Label>
                  <Input
                    id="milestoneTargetDate"
                    type="date"
                    value={milestoneTargetDate}
                    onChange={(e) => setMilestoneTargetDate(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsMilestoneDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMilestone}>Add Milestone</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
