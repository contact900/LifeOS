'use client'

import { ChatInterface } from '@/components/chat/chat-interface'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MessageSquare, FileText, Mic, Database, CheckSquare, Bell, Calendar as CalendarIcon, Target, Plug, Sparkles, Star } from 'lucide-react'
import { ReminderNotificationProvider } from '@/components/reminders/reminder-notification-provider'
import { useKeyboardShortcuts, defaultNavigationShortcuts, KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'
import { SidebarHeaderWithShortcuts } from '@/components/sidebar/sidebar-header-with-shortcuts'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  const shortcuts: KeyboardShortcut[] = [
    ...defaultNavigationShortcuts(router),
    {
      key: 'n',
      metaKey: true,
      action: () => router.push('/notes?new=true'),
      description: 'Create New Note',
      category: 'power',
    },
    {
      key: 't',
      metaKey: true,
      action: () => router.push('/tasks?new=true'),
      description: 'Create New Task',
      category: 'power',
    },
  ]

  useKeyboardShortcuts(shortcuts)

  return (
    <div className="flex h-screen">
      <Sidebar>
        <SidebarHeader>
          <SidebarHeaderWithShortcuts shortcuts={shortcuts} />
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
              <Button variant="ghost" className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" />
                Insights
              </Button>
            </Link>
            <Link href="/favorites">
              <Button variant="ghost" className="w-full justify-start">
                <Star className="mr-2 h-4 w-4" />
                Favorites
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
      <main className="flex-1 overflow-hidden p-6">
        <ReminderNotificationProvider />
        <ChatInterface />
      </main>
    </div>
  )
}
