'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface Event {
  id?: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  location: string | null
  category: string
  color: string | null
  reminder_minutes: number[] | null
}

interface EventFormProps {
  event?: Event | null
  initialDate?: Date
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: Event) => Promise<void>
}

const CATEGORY_COLORS: Record<string, string> = {
  finance: '#ef4444',
  work: '#3b82f6',
  health: '#10b981',
  general: '#6b7280',
}

export function EventForm({ event, initialDate, open, onOpenChange, onSave }: EventFormProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState<string>('general')
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([])

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      const start = new Date(event.start_date)
      setStartDate(start.toISOString().split('T')[0])
      setStartTime(start.toTimeString().slice(0, 5))
      if (event.end_date) {
        const end = new Date(event.end_date)
        setEndDate(end.toISOString().split('T')[0])
        setEndTime(end.toTimeString().slice(0, 5))
      } else {
        setEndDate('')
        setEndTime('')
      }
      setAllDay(event.all_day)
      setLocation(event.location || '')
      setCategory(event.category)
      setReminderMinutes(event.reminder_minutes || [])
    } else if (initialDate) {
      const date = initialDate.toISOString().split('T')[0]
      const time = initialDate.toTimeString().slice(0, 5)
      setStartDate(date)
      setStartTime(time)
      setEndDate(date)
      setEndTime('')
      setAllDay(false)
      setTitle('')
      setDescription('')
      setLocation('')
      setCategory('general')
      setReminderMinutes([])
    }
  }, [event, initialDate, open])

  const handleSubmit = async () => {
    if (!title.trim() || !startDate) {
      alert('Title and start date are required')
      return
    }

    setLoading(true)
    try {
      const startDateTime = allDay
        ? new Date(startDate).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString()

      const endDateTime = endDate
        ? allDay
          ? new Date(endDate).toISOString()
          : new Date(`${endDate}T${endTime || startTime}`).toISOString()
        : null

      await onSave({
        id: event?.id,
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDateTime,
        end_date: endDateTime,
        all_day: allDay,
        location: location.trim() || null,
        category,
        color: CATEGORY_COLORS[category] || null,
        reminder_minutes: reminderMinutes.length > 0 ? reminderMinutes : null,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const toggleReminder = (minutes: number) => {
    setReminderMinutes((prev) =>
      prev.includes(minutes)
        ? prev.filter((m) => m !== minutes)
        : [...prev, minutes].sort((a, b) => a - b)
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title..."
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description..."
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="all-day"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="all-day" className="cursor-pointer">
              All Day
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(value: any) => setCategory(value)}>
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
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <button
                    key={cat}
                    type="button"
                    className={`w-8 h-8 rounded border-2 ${
                      category === cat ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCategory(cat)}
                    title={cat}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>Reminders</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[5, 15, 30, 60, 1440].map((minutes) => {
                const label =
                  minutes < 60
                    ? `${minutes} min`
                    : minutes === 60
                    ? '1 hour'
                    : `${minutes / 60} hours`
                return (
                  <Button
                    key={minutes}
                    type="button"
                    variant={reminderMinutes.includes(minutes) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleReminder(minutes)}
                  >
                    {label} before
                  </Button>
                )
              })}
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              event ? 'Update Event' : 'Create Event'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
