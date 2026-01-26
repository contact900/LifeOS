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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, Bell, BellOff, Check, Loader2, AlertCircle } from 'lucide-react'
import { requestNotificationPermission, testNotification, getNotificationPermission } from '@/lib/notifications/browser-notifications'

interface Reminder {
  id: string
  title: string
  description: string | null
  due_date: string
  completed_at: string | null
  email_notification: boolean
  browser_notification: boolean
  category: string
  priority: string
  context: string | null
  created_at: string
}

export function ReminderManager() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [emailNotification, setEmailNotification] = useState(false)
  const [browserNotification, setBrowserNotification] = useState(true)
  const [category, setCategory] = useState<string>('general')
  const [priority, setPriority] = useState<string>('medium')
  const [context, setContext] = useState('')

  useEffect(() => {
    fetchReminders()
    checkNotificationPermission()
  }, [filter])

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission()
    if (result.success) {
      setNotificationPermission('granted')
      alert('Notification permission granted! You will now receive browser notifications for your reminders.')
    } else {
      alert(`Failed to enable notifications: ${result.error}\n\nPlease check your browser settings and allow notifications for this site.`)
    }
    // Refresh permission status
    checkNotificationPermission()
  }

  const handleTestNotification = async () => {
    console.log('[ReminderManager] Testing notification...')
    const result = await testNotification()
    
    if (result.success) {
      alert('Test notification sent! Check your system notifications.')
    } else {
      alert(`Test notification failed: ${result.error}\n\nPlease check your browser settings.`)
    }
  }

  const fetchReminders = async () => {
    try {
      const params = new URLSearchParams()
      if (filter === 'upcoming') params.append('upcoming', 'true')
      if (filter === 'completed') params.append('completed', 'true')

      const url = `/api/reminders${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setReminders(data.reminders || [])
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setDueTime('')
    setEmailNotification(false)
    setBrowserNotification(true)
    setCategory('general')
    setPriority('medium')
    setContext('')
    setEditingReminder(null)
  }

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setTitle(reminder.title)
    setDescription(reminder.description || '')
    const dueDateObj = new Date(reminder.due_date)
    setDueDate(dueDateObj.toISOString().split('T')[0])
    setDueTime(dueDateObj.toTimeString().slice(0, 5))
    setEmailNotification(reminder.email_notification)
    setBrowserNotification(reminder.browser_notification)
    setCategory(reminder.category)
    setPriority(reminder.priority)
    setContext(reminder.context || '')
    setIsDialogOpen(true)
  }

  const handleDelete = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return

    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setReminders(reminders.filter((r) => r.id !== reminderId))
      }
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  }

  const handleComplete = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        await fetchReminders()
      }
    } catch (error) {
      console.error('Error completing reminder:', error)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate || !dueTime) {
      alert('Title, date, and time are required')
      return
    }

    const dueDateTime = new Date(`${dueDate}T${dueTime}`).toISOString()

    try {
      const url = editingReminder
        ? `/api/reminders/${editingReminder.id}`
        : '/api/reminders'
      const method = editingReminder ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDateTime,
          email_notification: emailNotification,
          browser_notification: browserNotification,
          category,
          priority,
          context: context.trim() || null,
        }),
      })

      if (response.ok) {
        await fetchReminders()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save reminder')
      }
    } catch (error) {
      console.error('Error saving reminder:', error)
      alert('Failed to save reminder')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reminders</CardTitle>
          <div className="flex items-center gap-2">
            {notificationPermission !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestPermission}
                title="Enable browser notifications"
              >
                <Bell className="mr-2 h-4 w-4" />
                Enable Notifications
              </Button>
            )}
            {notificationPermission === 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                title="Test browser notification"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Test Notification
              </Button>
            )}
            {notificationPermission === 'denied' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  alert('Notifications are blocked. Please:\n1. Click the lock icon in your browser address bar\n2. Find "Notifications"\n3. Change it to "Allow"\n4. Refresh this page')
                }}
                title="Notifications are blocked - click for instructions"
              >
                <BellOff className="mr-2 h-4 w-4" />
                Notifications Blocked
              </Button>
            )}
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Reminder
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Reminder title..."
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Reminder description..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Due Time *</Label>
                      <Input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={category}
                        onValueChange={(value: any) => setCategory(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={priority}
                        onValueChange={(value: any) => setPriority(value)}
                      >
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
                  <div>
                    <Label>Context (for smart reminders)</Label>
                    <Textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Additional context that might help with smart reminders..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="browser-notification"
                        checked={browserNotification}
                        onChange={(e) => setBrowserNotification(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="browser-notification" className="cursor-pointer">
                        Browser Notification
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="email-notification"
                        checked={emailNotification}
                        onChange={(e) => setEmailNotification(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="email-notification" className="cursor-pointer">
                        Email Notification (optional)
                      </Label>
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingReminder ? 'Update Reminder' : 'Create Reminder'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Notifications</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No reminders found
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">{reminder.title}</TableCell>
                    <TableCell>
                      {new Date(reminder.due_date).toLocaleString()}
                      {new Date(reminder.due_date) < new Date() && !reminder.completed_at && (
                        <span className="text-red-600 ml-2 text-xs">(Overdue)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                        {reminder.priority}
                      </span>
                    </TableCell>
                    <TableCell>{reminder.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {reminder.browser_notification && (
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        )}
                        {reminder.email_notification && (
                          <span className="text-xs text-muted-foreground">Email</span>
                        )}
                        {!reminder.browser_notification && !reminder.email_notification && (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!reminder.completed_at && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleComplete(reminder.id)}
                            title="Mark as completed"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reminder)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reminder.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
