'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { X, Plus, Tag } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

interface TagManagerProps {
  resourceType: 'note' | 'recording' | 'task'
  resourceId: string
  selectedTagIds?: string[]
  onTagsChange?: (tagIds: string[]) => void
}

// Predefined color palette
const TAG_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
]

export function TagManager({
  resourceType,
  resourceId,
  selectedTagIds = [],
  onTagsChange,
}: TagManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTags()
    fetchResourceTags()
  }, [resourceId])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchResourceTags = async () => {
    try {
      const response = await fetch(
        `/api/tags/associate?resource_type=${resourceType}&resource_id=${resourceId}`
      )
      if (response.ok) {
        const data = await response.json()
        setSelectedTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error fetching resource tags:', error)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAllTags([...allTags, data.tag])
        setNewTagName('')
        setNewTagColor(TAG_COLORS[0])
        setIsDialogOpen(false)
        // Automatically associate the new tag
        handleToggleTag(data.tag.id)
      }
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  const handleToggleTag = async (tagId: string) => {
    const isSelected = selectedTags.some((t) => t.id === tagId)
    const newSelectedTags = isSelected
      ? selectedTags.filter((t) => t.id !== tagId)
      : [...selectedTags, allTags.find((t) => t.id === tagId)!]

    setSelectedTags(newSelectedTags)

    // Update on server
    try {
      const response = await fetch('/api/tags/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
          tag_ids: newSelectedTags.map((t) => t.id),
        }),
      })

      if (response.ok && onTagsChange) {
        onTagsChange(newSelectedTags.map((t) => t.id))
      }
    } catch (error) {
      console.error('Error updating tag associations:', error)
      // Revert on error
      setSelectedTags(selectedTags)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    await handleToggleTag(tagId)
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tags...</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:bg-black/20 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              <Tag className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Existing tags */}
              <div>
                <Label>Select Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {allTags.map((tag) => {
                    const isSelected = selectedTags.some((t) => t.id === tag.id)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? 'ring-2 ring-offset-2'
                            : 'opacity-50 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected ? tag.color : `${tag.color}40`,
                          color: isSelected ? 'white' : 'inherit',
                          ringColor: tag.color,
                        }}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Create new tag */}
              <div className="border-t pt-4">
                <Label>Create New Tag</Label>
                <div className="space-y-2 mt-2">
                  <Input
                    placeholder="Tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTag()
                      }
                    }}
                  />
                  <div>
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-2 mt-1">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewTagColor(color)}
                          className={`w-8 h-8 rounded border-2 ${
                            newTagColor === color ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateTag} className="w-full" size="sm">
                    Create Tag
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
