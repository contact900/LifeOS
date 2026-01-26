'use client'

import { useState, useEffect } from 'react'

interface Tag {
  id: string
  name: string
  color: string
}

interface NoteTagsPreviewProps {
  noteId: string
}

export function NoteTagsPreview({ noteId }: NoteTagsPreviewProps) {
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    fetchTags()
  }, [noteId])

  const fetchTags = async () => {
    try {
      const response = await fetch(
        `/api/tags/associate?resource_type=note&resource_id=${noteId}`
      )
      if (response.ok) {
        const data = await response.json()
        setTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  )
}
