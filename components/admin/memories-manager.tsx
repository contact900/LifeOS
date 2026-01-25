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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Search, Plus, Edit, Trash2, Download, Filter } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Memory {
  id: string
  content: string
  category: 'finance' | 'work' | 'health' | 'general'
  source_type: 'chat' | 'note' | 'recording'
  created_at: string
  updated_at: string
}

export function MemoriesManager() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [formData, setFormData] = useState({
    content: '',
    category: 'general' as Memory['category'],
    source_type: 'chat' as Memory['source_type']
  })

  useEffect(() => {
    loadMemories()
  }, [])

  const loadMemories = async () => {
    try {
      const response = await fetch('/api/admin/memories')
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
      }
    } catch (error) {
      console.error('Error loading memories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.content.trim()) {
      alert('Please enter memory content')
      return
    }

    try {
      const url = editingMemory 
        ? `/api/admin/memories/${editingMemory.id}`
        : '/api/admin/memories'
      
      const method = editingMemory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsDialogOpen(false)
        setEditingMemory(null)
        setFormData({ content: '', category: 'general', source_type: 'chat' })
        loadMemories()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save memory')
      }
    } catch (error) {
      console.error('Error saving memory:', error)
      alert('Failed to save memory. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/memories/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadMemories()
      } else {
        alert('Failed to delete memory')
      }
    } catch (error) {
      console.error('Error deleting memory:', error)
      alert('Failed to delete memory. Please try again.')
    }
  }

  const handleEdit = (memory: Memory) => {
    setEditingMemory(memory)
    setFormData({
      content: memory.content,
      category: memory.category,
      source_type: memory.source_type
    })
    setIsDialogOpen(true)
  }

  const handleExport = () => {
    const csv = [
      ['Content', 'Category', 'Source Type', 'Created At'].join(','),
      ...memories.map(m => [
        `"${m.content.replace(/"/g, '""')}"`,
        m.category,
        m.source_type,
        new Date(m.created_at).toISOString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memories-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = memory.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || memory.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading memories...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Memories</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingMemory(null)
                  setFormData({ content: '', category: 'general', source_type: 'chat' })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Memory
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMemory ? 'Edit Memory' : 'Create New Memory'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter memory content..."
                      rows={6}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is the text that will be stored and searchable
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value as Memory['category'] })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="source_type">Source Type *</Label>
                      <Select
                        value={formData.source_type}
                        onValueChange={(value) => setFormData({ ...formData, source_type: value as Memory['source_type'] })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chat">Chat</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="recording">Recording</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!formData.content.trim()}>
                      {editingMemory ? 'Update' : 'Create'} Memory
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={handleExport} disabled={memories.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        <div className="flex gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="health">Health</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredMemories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || categoryFilter !== 'all' 
              ? 'No memories match your filters' 
              : 'No memories yet. Create your first memory!'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMemories.map((memory) => (
                  <TableRow key={memory.id}>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2">{memory.content}</p>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-secondary">
                        {memory.category}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">{memory.source_type}</TableCell>
                    <TableCell>
                      {new Date(memory.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(memory)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(memory.id)}
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
        
        {filteredMemories.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredMemories.length} of {memories.length} memories
          </div>
        )}
      </CardContent>
    </Card>
  )
}
