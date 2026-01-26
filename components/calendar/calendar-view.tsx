'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, startOfDay, addDays, subDays } from 'date-fns'

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
}

interface CalendarViewProps {
  events: Event[]
  onEventClick: (event: Event) => void
  onDateClick: (date: Date) => void
  view: 'month' | 'week' | 'day'
}

export function CalendarView({ events, onEventClick, onDateClick, view }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start_date)
      const eventEnd = event.end_date ? new Date(event.end_date) : eventStart
      const dateStart = startOfDay(date)
      const dateEnd = addDays(dateStart, 1)

      return (
        (eventStart >= dateStart && eventStart < dateEnd) ||
        (eventEnd >= dateStart && eventEnd < dateEnd) ||
        (eventStart <= dateStart && eventEnd >= dateEnd)
      )
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    } else if (view === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  if (view === 'month') {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center font-semibold text-sm border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = getEventsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border-r border-b last:border-r-0 p-2 ${
                      !isCurrentMonth ? 'bg-muted/50' : ''
                    } ${isToday ? 'bg-blue-50' : ''} cursor-pointer hover:bg-muted/30 transition-colors`}
                    onClick={() => onDateClick(day)}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-blue-600 font-bold' : isCurrentMonth ? '' : 'text-muted-foreground'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: event.color || '#3b82f6',
                            color: 'white',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                          title={event.title}
                        >
                          {event.all_day ? '📅' : format(new Date(event.start_date), 'HH:mm')} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'week') {
    const weekStart = startOfWeek(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {format(weekStart, 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                const dayDate = weekDays[idx]
                const isToday = isSameDay(dayDate, new Date())
                return (
                  <div
                    key={day}
                    className={`p-2 text-center border-r last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div className="text-xs text-muted-foreground">{day}</div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                      {format(dayDate, 'd')}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((day, idx) => {
                const dayEvents = getEventsForDate(day)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={idx}
                    className={`border-r last:border-r-0 p-2 ${isToday ? 'bg-blue-50/50' : ''} cursor-pointer hover:bg-muted/30 transition-colors`}
                    onClick={() => onDateClick(day)}
                  >
                    <div className="space-y-1">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-2 rounded cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: event.color || '#3b82f6',
                            color: 'white',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                          title={event.title}
                        >
                          {!event.all_day && format(new Date(event.start_date), 'HH:mm')} {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Day view
  const dayEvents = getEventsForDate(currentDate)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex">
            <div className="w-16 border-r">
              {hours.map((hour) => (
                <div key={hour} className="h-16 border-b p-1 text-xs text-muted-foreground">
                  {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                </div>
              ))}
            </div>
            <div className="flex-1 relative">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    const date = new Date(currentDate)
                    date.setHours(hour, 0, 0, 0)
                    onDateClick(date)
                  }}
                />
              ))}
              {dayEvents.map((event) => {
                const start = new Date(event.start_date)
                const end = event.end_date ? new Date(event.end_date) : addDays(start, 1)
                const startHour = start.getHours() + start.getMinutes() / 60
                const endHour = end.getHours() + end.getMinutes() / 60
                const duration = endHour - startHour
                const top = (startHour / 24) * 100

                if (event.all_day) {
                  return (
                    <div
                      key={event.id}
                      className="absolute top-0 left-0 right-0 p-2 rounded cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: event.color || '#3b82f6',
                        color: 'white',
                      }}
                      onClick={() => onEventClick(event)}
                      title={event.title}
                    >
                      📅 {event.title}
                    </div>
                  )
                }

                return (
                  <div
                    key={event.id}
                    className="absolute left-0 right-0 p-2 rounded cursor-pointer hover:opacity-80"
                    style={{
                      top: `${top}%`,
                      height: `${(duration / 24) * 100}%`,
                      backgroundColor: event.color || '#3b82f6',
                      color: 'white',
                      minHeight: '40px',
                    }}
                    onClick={() => onEventClick(event)}
                    title={event.title}
                  >
                    <div className="text-xs font-semibold">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</div>
                    <div className="text-sm">{event.title}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
