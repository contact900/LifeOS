'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Search, Plus, Edit, Trash2, Download } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface Note {
  id: string
  title: string
  content_json: any
  created_at: string
  updated_at: string
}

export function NotesManager() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [formData, setFormData] = useState({
    title: ''
  })

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/admin/notes')
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a note title')
      return
    }

    try {
      const url = editingNote 
        ? `/api/admin/notes/${editingNote.id}`
        : '/api/admin/notes'
      
      const method = editingNote ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content_json: editingNote?.content_json || { type: 'doc', content: [] }
        })
      })

      if (response.ok) {
        setIsDialogOpen(false)
        setEditingNote(null)
        setFormData({ title: '' })
        loadNotes()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save note')
      }
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/notes/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadNotes()
      } else {
        alert('Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note. Please try again.')
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setFormData({
      title: note.title
    })
    setIsDialogOpen(true)
  }

  const handleExport = () => {
    const csv = [
      ['Title', 'Created At', 'Updated At'].join(','),
      ...notes.map(n => [
        `"${n.title.replace(/"/g, '""')}"`,
        new Date(n.created_at).toISOString(),
        new Date(n.updated_at).toISOString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Notes</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingNote(null)
                  setFormData({ title: '' })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingNote ? 'Edit Note' : 'Create New Note'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter note title..."
                      className="mt-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSave()
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {editingNote 
                        ? 'Note: To edit content, go to the Notes page' 
                        : 'You can add content after creating the note'}
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!formData.title.trim()}>
                      {editingNote ? 'Update' : 'Create'} Note
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={handleExport} disabled={notes.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm 
              ? 'No notes match your search' 
              : 'No notes yet. Create your first note!'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.title}</TableCell>
                    <TableCell>
                      {new Date(note.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(note.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(note)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {filteredNotes.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredNotes.length} of {notes.length} notes
          </div>
        )}
      </CardContent>
    </Card>
  )
}
