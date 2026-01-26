'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Star,
  Pin,
  FileText,
  Mic,
  CheckSquare,
  Target,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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
}

export function FavoritesSidebar() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)

  useEffect(() => {
    fetchFavorites()
  }, [showPinnedOnly])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const url = showPinnedOnly
        ? '/api/favorites?pinned_only=true'
        : '/api/favorites'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.favorites || [])
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
        return <FileText className="h-4 w-4" />
      case 'recording':
        return <Mic className="h-4 w-4" />
      case 'task':
        return <CheckSquare className="h-4 w-4" />
      case 'goal':
        return <Target className="h-4 w-4" />
      case 'event':
        return <CalendarIcon className="h-4 w-4" />
      default:
        return <Star className="h-4 w-4" />
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

  const handleRemoveFavorite = async (item: FavoriteItem) => {
    try {
      const response = await fetch(
        `/api/favorites?item_type=${item.item_type}&item_id=${item.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setFavorites(favorites.filter((f) => f.id !== item.id))
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  // Sort: pinned first, then by creation date
  const sortedFavorites = [...favorites].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
            Favorites
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={cn(
                'h-7 px-2',
                showPinnedOnly && 'bg-muted'
              )}
            >
              <Pin className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : sortedFavorites.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {showPinnedOnly
              ? 'No pinned items'
              : 'No favorites yet. Star items to add them here.'}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {sortedFavorites.map((item) => (
                <Link
                  key={`${item.item_type}-${item.id}`}
                  href={getItemUrl(item)}
                  className="block"
                >
                  <div className="group relative p-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 text-muted-foreground">
                        {getItemIcon(item.item_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <h4 className="text-sm font-medium truncate">
                            {item.title}
                          </h4>
                          {item.is_pinned && (
                            <Pin className="h-3 w-3 text-blue-500 fill-current shrink-0" />
                          )}
                        </div>
                        {(item.content || item.summary) && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.summary || item.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.preventDefault()
                          handleRemoveFavorite(item)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
