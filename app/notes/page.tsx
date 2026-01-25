'use client'

import { useState, useEffect } from 'react'
import { NoteEditor } from '@/components/notes/note-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, FileText, Trash2, MessageSquare, Mic, Database } from 'lucide-react'
import Link from 'next/link'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'

interface Note {
  id: string
  title: string
  content_json: any
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes')
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

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle,
          content_json: { type: 'doc', content: [] },
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
          <h1 className="text-xl font-bold">LifeOS</h1>
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
      <div className="flex-1 flex">
        <div className="w-64 border-r p-4 flex flex-col">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mb-4">
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
                <Button onClick={handleCreateNote} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet</p>
            ) : (
              notes.map((note) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer hover:bg-muted ${
                    selectedNote?.id === note.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedNote(note)}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {note.title}
                      </CardTitle>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedNote ? (
            <div className="space-y-4">
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
                className="text-2xl font-bold border-none shadow-none focus-visible:ring-0"
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
