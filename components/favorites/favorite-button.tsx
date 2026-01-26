'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Star, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  itemType: 'note' | 'recording' | 'task' | 'goal' | 'event'
  itemId: string
  className?: string
  showPin?: boolean
  onToggle?: (isFavorite: boolean, isPinned: boolean) => void
}

export function FavoriteButton({
  itemType,
  itemId,
  className,
  showPin = false,
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    checkFavoriteStatus()
  }, [itemType, itemId])

  const checkFavoriteStatus = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true)
      }
      const response = await fetch(`/api/favorites?type=${itemType}`)
      if (response.ok) {
        const data = await response.json()
        // The API returns items with their original IDs, so we check if any favorite has this item's ID
        const favorite = data.favorites?.find(
          (f: any) => f.id === itemId
        )
        if (favorite) {
          setIsFavorite(true)
          setIsPinned(favorite.is_pinned || false)
        } else {
          setIsFavorite(false)
          setIsPinned(false)
        }
      }
    } catch (error) {
      console.error('Error checking favorite status:', error)
    } finally {
      if (!skipLoading) {
        setLoading(false)
      }
    }
  }

  const handleToggle = async (togglePin = false) => {
    if (toggling) return

    try {
      setToggling(true)

      if (isFavorite && !togglePin) {
        // Remove favorite
        const response = await fetch(
          `/api/favorites?item_type=${itemType}&item_id=${itemId}`,
          { method: 'DELETE' }
        )

        if (response.ok) {
          // Update state immediately for better UX
          setIsFavorite(false)
          setIsPinned(false)
          onToggle?.(false, false)
          // Refresh status to ensure UI is in sync (skip loading state)
          await checkFavoriteStatus(true)
        }
      } else {
        // Add or update favorite
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_type: itemType,
            item_id: itemId,
            is_pinned: togglePin ? !isPinned : isPinned,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          // Update state immediately for better UX
          setIsFavorite(true)
          setIsPinned(data.favorite.is_pinned || false)
          onToggle?.(true, data.favorite.is_pinned || false)
          // Refresh status to ensure UI is in sync (skip loading state)
          await checkFavoriteStatus(true)
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8',
          isFavorite && 'text-yellow-500 hover:text-yellow-600'
        )}
        onClick={() => handleToggle(false)}
        disabled={toggling}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={cn(
            'h-4 w-4',
            isFavorite && 'fill-current'
          )}
        />
      </Button>
      {showPin && isFavorite && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8',
            isPinned && 'text-blue-500 hover:text-blue-600'
          )}
          onClick={() => handleToggle(true)}
          disabled={toggling}
          title={isPinned ? 'Unpin' : 'Pin to top'}
        >
          <Pin
            className={cn(
              'h-4 w-4',
              isPinned && 'fill-current'
            )}
          />
        </Button>
      )}
    </div>
  )
}
