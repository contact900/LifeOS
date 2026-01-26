'use client'

import { useState, useEffect } from 'react'
import { NoteEditor } from '@/components/notes/note-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, FileText, Trash2, MessageSquare, Mic, Database, CheckSquare, Bell, Calendar as CalendarIcon, Target, Plug, Sparkles, Star } from 'lucide-react'
import Link from 'next/link'
import { TagManager } from '@/components/tags/tag-manager'
import { NoteTagsPreview } from '@/components/tags/note-tags-preview'
import { TagFilter } from '@/components/tags/tag-filter'
import { TemplateSelector } from '@/components/templates/template-selector'
import { QuickTemplateButtons } from '@/components/templates/quick-template-buttons'
import { ReminderNotificationProvider } from '@/components/reminders/reminder-notification-provider'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import { useKeyboardShortcuts, defaultNavigationShortcuts, KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'
import { SidebarHeaderWithShortcuts } from '@/components/sidebar/sidebar-header-with-shortcuts'
import { useRouter } from 'next/navigation'
import { FavoriteButton } from '@/components/favorites/favorite-button'
import { BatchOperationsBar } from '@/components/batch-operations/batch-operations-bar'
import { Checkbox } from '@/components/ui/checkbox'

interface Note {
  id: string
  title: string
  content_json: any
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const shortcuts: KeyboardShortcut[] = [
    ...defaultNavigationShortcuts(router),
    {
      key: 'n',
      metaKey: true,
      action: () => setIsDialogOpen(true),
      description: 'Create New Note',
      category: 'power',
    },
    {
      key: 's',
      metaKey: true,
      action: () => {
        if (selectedNote) {
          const content = selectedNote.content_json
          handleSaveNote(JSON.stringify(content))
        }
      },
      description: 'Save Note',
      category: 'power',
    },
    {
      key: 'Delete',
      metaKey: true,
      action: () => {
        if (selectedNote) {
          handleDeleteNote(selectedNote.id)
        }
      },
      description: 'Delete Note',
      category: 'power',
    },
  ]

  useKeyboardShortcuts(shortcuts)

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const fetchNotes = async () => {
    try {
      const url = selectedTagFilter
        ? `/api/notes?tag_id=${selectedTagFilter}`
        : '/api/notes'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
    fetchTags()
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [selectedTagFilter])

  const handleToggleSelect = (noteId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notes.map((n) => n.id)))
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    const response = await fetch('/api/notes/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })

    if (response.ok) {
      await fetchNotes()
      setSelectedIds(new Set())
    } else {
      throw new Error('Failed to delete notes')
    }
  }

  const handleBulkTag = async (ids: string[], tagId: string) => {
    const response = await fetch('/api/notes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action: 'tag', tagId }),
    })

    if (response.ok) {
      await fetchNotes()
      setSelectedIds(new Set())
    } else {
      throw new Error('Failed to tag notes')
    }
  }

  const handleBulkExport = async (ids: string[]) => {
    const response = await fetch('/api/notes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action: 'export' }),
    })

    if (response.ok) {
      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      throw new Error('Failed to export notes')
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [selectedTagFilter])

  const handleCreateNote = async (templateContent?: any) => {
    const title = newNoteTitle.trim() || 'Untitled Note'
    const content = templateContent || { type: 'doc', content: [] }

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content_json: content,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNotes([data.note, ...notes])
        setSelectedNote(data.note)
        setNewNoteTitle('')
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  const handleTemplateSelect = (template: any) => {
    const title = template.name.replace(' Template', '')
    setNewNoteTitle(title)
    if (template.content_json) {
      handleCreateNote(template.content_json)
    }
  }

  const handleSaveNote = async (content: string) => {
    if (!selectedNote) return

    try {
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedNote.title,
          content_json: content,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedNote(data.note)
        setNotes(notes.map((n) => (n.id === data.note.id ? data.note : n)))
      }
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotes(notes.filter((n) => n.id !== noteId))
        if (selectedNote?.id === noteId) {
          setSelectedNote(null)
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const handleNoteChange = (content: string) => {
    // Update local state for real-time editing
    if (selectedNote) {
      setSelectedNote({
        ...selectedNote,
        content_json: JSON.parse(content),
      })
    }
  }

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
              <Button variant="default" className="w-full justify-start">
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
      <ReminderNotificationProvider />
      <div className="flex-1 flex">
        <div className="w-64 border-r p-4 flex flex-col">
          <div className="mb-4">
            <TagFilter
              resourceType="note"
              selectedTagId={selectedTagFilter}
              onTagChange={setSelectedTagFilter}
            />
          </div>
          <div className="space-y-2 mb-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Note title..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateNote()
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t"></div>
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="flex-1 border-t"></div>
                  </div>
                  <TemplateSelector
                    type="note"
                    onSelect={handleTemplateSelect}
                    trigger={
                      <Button variant="outline" className="w-full">
                        Use Template
                      </Button>
                    }
                  />
                  <Button onClick={() => handleCreateNote()} className="w-full">
                    Create Blank Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <QuickTemplateButtons
              type="note"
              onSelect={(template) => {
                if (template.content_json) {
                  const title = template.name.replace(' Template', '')
                  setNewNoteTitle(title)
                  handleCreateNote(template.content_json)
                }
              }}
            />
          </div>
          <BatchOperationsBar
            selectedIds={Array.from(selectedIds)}
            resourceType="note"
            onClearSelection={() => setSelectedIds(new Set())}
            onBulkDelete={handleBulkDelete}
            onBulkTag={handleBulkTag}
            onBulkExport={handleBulkExport}
          />
          <div className="flex-1 overflow-y-auto space-y-2 p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet</p>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === notes.length && notes.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Select all ({notes.length})
                  </span>
                </div>
                {notes.map((note) => (
                  <Card
                    key={note.id}
                    className={`cursor-pointer hover:bg-muted ${
                      selectedNote?.id === note.id ? 'bg-muted' : ''
                    }`}
                    onClick={(e) => {
                      // Don't select note if clicking checkbox
                      if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
                        return
                      }
                      setSelectedNote(note)
                    }}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(note.id)}
                          onCheckedChange={() => handleToggleSelect(note.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
                              {note.title}
                            </CardTitle>
                            <div className="flex items-center gap-1 ml-2">
                              <FavoriteButton
                                itemType="note"
                                itemId={note.id}
                                className="h-6"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteNote(note.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(note.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedNote ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={selectedNote.title}
                  onChange={(e) =>
                    setSelectedNote({ ...selectedNote, title: e.target.value })
                  }
                  onBlur={async () => {
                    await fetch(`/api/notes/${selectedNote.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: selectedNote.title,
                        content_json: selectedNote.content_json,
                      }),
                    })
                  }}
                  className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 flex-1"
                />
                <FavoriteButton
                  itemType="note"
                  itemId={selectedNote.id}
                  showPin={true}
                />
              </div>
              <TagManager
                resourceType="note"
                resourceId={selectedNote.id}
              />
              <NoteEditor
                content={JSON.stringify(selectedNote.content_json)}
                onChange={handleNoteChange}
                onSave={handleSaveNote}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a note to edit or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
