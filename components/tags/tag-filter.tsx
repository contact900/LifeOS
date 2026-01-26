'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagFilterProps {
  resourceType: 'note' | 'recording' | 'task'
  selectedTagId: string | null
  onTagChange: (tagId: string | null) => void
}

export function TagFilter({ resourceType, selectedTagId, onTagChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || tags.length === 0) return null

  const selectedTag = tags.find((t) => t.id === selectedTagId)

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm">Filter by Tag:</Label>
      {selectedTagId && selectedTag ? (
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white"
            style={{ backgroundColor: selectedTag.color }}
          >
            {selectedTag.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onTagChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Select value={selectedTagId || 'all'} onValueChange={(value) => onTagChange(value === 'all' ? null : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
