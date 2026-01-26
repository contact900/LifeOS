'use client'

import { useEffect, useState } from 'react'
import { ReminderNotificationService } from './reminder-notification-service'
import { createClient } from '@/lib/supabase/client'

export function ReminderNotificationProvider() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    fetchUser()
  }, [])

  return <ReminderNotificationService userId={userId} />
}
