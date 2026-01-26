'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import {
  MessageSquare,
  FileText,
  Mic,
  Database,
  CheckSquare,
  Target,
  Bell,
  Calendar as CalendarIcon,
  Plug,
  Sparkles,
  Star,
  Pin,
} from 'lucide-react'
import Link from 'next/link'
import { GlobalSearch } from '@/components/search/global-search'
import { ReminderNotificationProvider } from '@/components/reminders/reminder-notification-provider'
import { FavoritesSidebar } from '@/components/favorites/favorites-sidebar'
import { format } from 'date-fns'
import { SidebarHeaderWithShortcuts } from '@/components/sidebar/sidebar-header-with-shortcuts'
import { useKeyboardShortcuts, defaultNavigationShortcuts, KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'
import { useRouter } from 'next/navigation'

interface FavoriteItem {
  id: string
  favorite_id?: string
  title: string
  item_type: 'note' | 'recording' | 'task' | 'goal' | 'event'
  is_pinned?: boolean
  pinned_at?: string
  created_at: string
  content?: string
  summary?: string
  content_json?: any
  transcript?: string
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [pinnedItems, setPinnedItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const shortcuts: KeyboardShortcut[] = [
    ...defaultNavigationShortcuts(router),
  ]

  useKeyboardShortcuts(shortcuts)

  useEffect(() => {
    fetchFavorites()
  }, [activeTab])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const url = activeTab === 'pinned'
        ? '/api/favorites?pinned_only=true'
        : '/api/favorites'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const items = data.favorites || []
        setFavorites(items)
        setPinnedItems(items.filter((item: FavoriteItem) => item.is_pinned))
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <FileText className="h-5 w-5" />
      case 'recording':
        return <Mic className="h-5 w-5" />
      case 'task':
        return <CheckSquare className="h-5 w-5" />
      case 'goal':
        return <Target className="h-5 w-5" />
      case 'event':
        return <CalendarIcon className="h-5 w-5" />
      default:
        return <Star className="h-5 w-5" />
    }
  }

  const getItemUrl = (item: FavoriteItem) => {
    switch (item.item_type) {
      case 'note':
        return '/notes'
      case 'recording':
        return '/recordings'
      case 'task':
        return '/tasks'
      case 'goal':
        return '/goals'
      case 'event':
        return '/calendar'
      default:
        return '/'
    }
  }

  const getItemColor = (type: string) => {
    switch (type) {
      case 'note':
        return 'bg-blue-100 text-blue-800'
      case 'recording':
        return 'bg-purple-100 text-purple-800'
      case 'task':
        return 'bg-orange-100 text-orange-800'
      case 'goal':
        return 'bg-green-100 text-green-800'
      case 'event':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Sort: pinned first, then by creation date
  const sortedFavorites = [...favorites].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

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
              <Button variant="default" className="w-full justify-start">
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
      <main className="flex-1 overflow-y-auto p-6">
        <ReminderNotificationProvider />
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-500 fill-current" />
              Favorites & Bookmarks
            </h1>
            <p className="text-muted-foreground mt-2">
              Quick access to your starred and pinned items
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">
                <Star className="mr-2 h-4 w-4" />
                All Favorites
              </TabsTrigger>
              <TabsTrigger value="pinned">
                <Pin className="mr-2 h-4 w-4" />
                Pinned ({pinnedItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : sortedFavorites.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No favorites yet. Star items to add them here!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {sortedFavorites.map((item) => (
                    <Link
                      key={`${item.item_type}-${item.id}`}
                      href={getItemUrl(item)}
                      className="block"
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${getItemColor(item.item_type)}`}>
                                {getItemIcon(item.item_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg mb-1 flex items-center gap-2">
                                  {item.title || 'Untitled'}
                                  {item.is_pinned && (
                                    <Pin className="h-4 w-4 text-blue-500 fill-current" />
                                  )}
                                </CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getItemColor(item.item_type)}`}>
                                    {item.item_type}
                                  </span>
                                  <span>•</span>
                                  <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {(item.summary || item.content || item.transcript) && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.summary || item.content || item.transcript}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pinned" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : pinnedItems.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Pin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pinned items yet. Pin favorites to keep them at the top!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pinnedItems.map((item) => (
                    <Link
                      key={`${item.item_type}-${item.id}`}
                      href={getItemUrl(item)}
                      className="block"
                    >
                      <Card className="hover:shadow-lg transition-shadow border-blue-200">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${getItemColor(item.item_type)}`}>
                                {getItemIcon(item.item_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg mb-1 flex items-center gap-2">
                                  {item.title || 'Untitled'}
                                  <Pin className="h-4 w-4 text-blue-500 fill-current" />
                                </CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getItemColor(item.item_type)}`}>
                                    {item.item_type}
                                  </span>
                                  <span>•</span>
                                  <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {(item.summary || item.content || item.transcript) && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.summary || item.content || item.transcript}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
