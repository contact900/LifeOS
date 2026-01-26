'use client'

import { useState, useEffect } from 'react'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import {
  MessageSquare,
  FileText,
  Mic,
  Database,
  CheckSquare,
  Bell,
  Calendar as CalendarIcon,
  Target,
  Plug,
  Sparkles,
} from 'lucide-react'
import { GlobalSearch } from '@/components/search/global-search'
import { ReminderNotificationProvider } from '@/components/reminders/reminder-notification-provider'
import { CalendarView } from '@/components/calendar/calendar-view'
import { EventForm } from '@/components/calendar/event-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface Event {
  id: string
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

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    fetchEvents()
    
    // Refresh events every 5 seconds to catch newly created events
    const interval = setInterval(() => {
      fetchEvents()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      // Fetch events for a wider range (past 7 days to future 60 days)
      const now = new Date()
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7) // Include past week
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + 60) // Include next 60 days

      const response = await fetch(
        `/api/events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      )
      if (response.ok) {
        const data = await response.json()
        console.log('📅 Fetched events:', data.events?.length || 0, 'events')
        setEvents(data.events || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Error fetching events:', errorData)
      }
    } catch (error) {
      console.error('❌ Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEvent = async (eventData: Event) => {
    try {
      const url = eventData.id ? `/api/events/${eventData.id}` : '/api/events'
      const method = eventData.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })

      if (response.ok) {
        await fetchEvents()
        setSelectedEvent(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save event')
      }
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Failed to save event')
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchEvents()
        setSelectedEvent(null)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    }
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setIsFormOpen(true)
  }

  const handleNewEvent = () => {
    setSelectedEvent(null)
    setSelectedDate(new Date())
    setIsFormOpen(true)
  }

  return (
    <div className="flex h-screen">
      <ReminderNotificationProvider />
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
            <Link href="/reminders">
              <Button variant="ghost" className="w-full justify-start">
                <Bell className="mr-2 h-4 w-4" />
                Reminders
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="default" className="w-full justify-start">
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
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Calendar</h1>
              <p className="text-muted-foreground mt-2">
                Manage your events and schedule
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button onClick={handleNewEvent}>
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Loading events...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <CalendarView
                events={events}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                view={view}
              />

              {selectedEvent && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedEvent.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(null)
                            setIsFormOpen(true)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedEvent.description && (
                        <div>
                          <strong>Description:</strong> {selectedEvent.description}
                        </div>
                      )}
                      <div>
                        <strong>Start:</strong>{' '}
                        {format(new Date(selectedEvent.start_date), 'PPpp')}
                      </div>
                      {selectedEvent.end_date && (
                        <div>
                          <strong>End:</strong>{' '}
                          {format(new Date(selectedEvent.end_date), 'PPpp')}
                        </div>
                      )}
                      {selectedEvent.location && (
                        <div>
                          <strong>Location:</strong> {selectedEvent.location}
                        </div>
                      )}
                      <div>
                        <strong>Category:</strong> {selectedEvent.category}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <EventForm
            event={selectedEvent}
            initialDate={selectedDate || undefined}
            open={isFormOpen}
            onOpenChange={(open) => {
              setIsFormOpen(open)
              if (!open) {
                setSelectedEvent(null)
                setSelectedDate(null)
              }
            }}
            onSave={handleSaveEvent}
          />
        </div>
      </main>
    </div>
  )
}
