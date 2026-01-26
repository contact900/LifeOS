'use client'

import { useEffect, useRef } from 'react'
import { showNotification } from '@/lib/notifications/browser-notifications'

interface Reminder {
  id: string
  title: string
  description: string | null
  due_date: string
  browser_notification: boolean
  email_notification: boolean
}

interface ReminderNotificationServiceProps {
  userId: string | null
  enabled?: boolean
}

export function ReminderNotificationService({
  userId,
  enabled = true,
}: ReminderNotificationServiceProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const notifiedRemindersRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || !userId) return

    const checkReminders = async () => {
      try {
        console.log('[ReminderService] Checking for due reminders...')
        const response = await fetch('/api/reminders/check')
        
        if (!response.ok) {
          console.error(`[ReminderService] Failed to check reminders: ${response.status} ${response.statusText}`)
          return
        }
        
        const data = await response.json()
        const reminders: Reminder[] = data.reminders || []
        
        console.log(`[ReminderService] Found ${reminders.length} due reminder(s)`)

        for (const reminder of reminders) {
            // Skip if already notified in this session
            if (notifiedRemindersRef.current.has(reminder.id)) {
              continue
            }

            // Send browser notification if enabled
            if (reminder.browser_notification) {
              console.log(`[ReminderService] Sending browser notification for reminder: ${reminder.id} - ${reminder.title}`)
              const result = await showNotification(reminder.title, {
                body: reminder.description || 'Reminder due now',
                data: { reminderId: reminder.id },
              })
              
              if (!result.success) {
                console.error(`[ReminderService] Failed to show notification for reminder ${reminder.id}:`, result.error)
                // Continue with email notification even if browser notification fails
              } else {
                console.log(`[ReminderService] Browser notification sent successfully for reminder: ${reminder.id}`)
              }
            }

            // Send email notification if enabled
            if (reminder.email_notification) {
              try {
                console.log(`[ReminderService] Sending email notification for reminder: ${reminder.id} - ${reminder.title}`)
                const emailResponse = await fetch('/api/reminders/email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reminderId: reminder.id,
                    reminderTitle: reminder.title,
                    reminderDescription: reminder.description,
                    dueDate: reminder.due_date,
                  }),
                })
                
                if (emailResponse.ok) {
                  console.log(`[ReminderService] Email notification sent successfully for reminder: ${reminder.id}`)
                } else {
                  const errorData = await emailResponse.json().catch(() => ({}))
                  console.error(`[ReminderService] Failed to send email notification for reminder ${reminder.id}:`, errorData)
                }
              } catch (error) {
                console.error(`[ReminderService] Error sending email notification for reminder ${reminder.id}:`, error)
              }
            }

            // Mark as notified
            notifiedRemindersRef.current.add(reminder.id)

            // Mark as notification sent in database
            await fetch(`/api/reminders/${reminder.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notification_sent: true }),
            })
          }
      } catch (error) {
        console.error('[ReminderService] Error checking reminders:', error)
        if (error instanceof Error) {
          console.error('[ReminderService] Error details:', {
            message: error.message,
            stack: error.stack,
          })
        }
      }
    }

    // Check immediately
    checkReminders()

    // Check every minute
    intervalRef.current = setInterval(checkReminders, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, userId])

  return null // This component doesn't render anything
}
