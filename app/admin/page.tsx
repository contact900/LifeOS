'use client'

import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, FileText, Mic, Database } from 'lucide-react'
import Link from 'next/link'
import { DashboardStats } from '@/components/admin/dashboard-stats'
import { MemoriesManager } from '@/components/admin/memories-manager'
import { NotesManager } from '@/components/admin/notes-manager'
import { RecordingsManager } from '@/components/admin/recordings-manager'

export default function AdminPage() {
  return (
    <div className="flex h-screen">
      <Sidebar>
        <SidebarHeader>
          <h1 className="text-xl font-bold">LifeOS</h1>
          <p className="text-xs text-muted-foreground">Admin Dashboard</p>
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
            <Link href="/admin">
              <Button variant="default" className="w-full justify-start">
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
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage all your LifeOS data in one place
            </p>
          </div>

          <DashboardStats />

          <Tabs defaultValue="memories" className="space-y-4">
            <TabsList>
              <TabsTrigger value="memories">
                <MessageSquare className="mr-2 h-4 w-4" />
                Memories
              </TabsTrigger>
              <TabsTrigger value="notes">
                <FileText className="mr-2 h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="recordings">
                <Mic className="mr-2 h-4 w-4" />
                Recordings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="memories">
              <MemoriesManager />
            </TabsContent>

            <TabsContent value="notes">
              <NotesManager />
            </TabsContent>

            <TabsContent value="recordings">
              <RecordingsManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
