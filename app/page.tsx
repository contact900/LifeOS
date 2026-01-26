import { ChatInterface } from '@/components/chat/chat-interface'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MessageSquare, FileText, Mic, Database, CheckSquare } from 'lucide-react'
import { GlobalSearch } from '@/components/search/global-search'

export default function Home() {
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
        <ChatInterface />
      </main>
    </div>
  )
}
