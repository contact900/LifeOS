'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, FileText, Mic, Loader2 } from 'lucide-react'
import { NoteEditor } from '@/components/notes/note-editor'

interface Template {
  id: string
  name: string
  description: string | null
  type: 'note' | 'recording'
  content_json: any | null
  content_text: string | null
  category: string
  icon: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'note' | 'recording'>('note')
  const [category, setCategory] = useState<string>('general')
  const [contentJson, setContentJson] = useState<any>(null)
  const [contentText, setContentText] = useState('')
  const [icon, setIcon] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [typeFilter])

  const fetchTemplates = async () => {
    try {
      const url = typeFilter !== 'all' ? `/api/templates?type=${typeFilter}` : '/api/templates'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setType('note')
    setCategory('general')
    setContentJson(null)
    setContentText('')
    setIcon('')
    setEditingTemplate(null)
  }

  const handleEdit = (template: Template) => {
    if (template.is_system) {
      alert('System templates cannot be edited')
      return
    }
    setEditingTemplate(template)
    setName(template.name)
    setDescription(template.description || '')
    setType(template.type)
    setCategory(template.category)
    setContentJson(template.content_json)
    setContentText(template.content_text || '')
    setIcon(template.icon || '')
    setIsDialogOpen(true)
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== templateId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Template name is required')
      return
    }

    if (type === 'note' && !contentJson) {
      alert('Note template content is required')
      return
    }

    if (type === 'recording' && !contentText.trim()) {
      alert('Recording template content is required')
      return
    }

    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates'
      const method = editingTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type,
          category,
          content_json: type === 'note' ? contentJson : null,
          content_text: type === 'recording' ? contentText : null,
          icon: icon || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (editingTemplate) {
          setTemplates(
            templates.map((t) => (t.id === editingTemplate.id ? data.template : t))
          )
        } else {
          setTemplates([...templates, data.template])
        }
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Templates</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="recording">Recordings</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Template name..."
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Template description..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type *</Label>
                      <Select
                        value={type}
                        onValueChange={(value: any) => setType(value)}
                        disabled={!!editingTemplate}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="recording">Recording</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={category}
                        onValueChange={(value: any) => setCategory(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {type === 'note' ? (
                    <div>
                      <Label>Note Content *</Label>
                      <div className="mt-2 border rounded-md">
                        <NoteEditor
                          content={contentJson ? JSON.stringify(contentJson) : '{"type":"doc","content":[]}'}
                          onChange={(json) => {
                            try {
                              setContentJson(JSON.parse(json))
                            } catch (e) {
                              // Invalid JSON, ignore
                            }
                          }}
                          onSave={() => {}}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Recording Instructions *</Label>
                      <Textarea
                        value={contentText}
                        onChange={(e) => setContentText(e.target.value)}
                        placeholder="Instructions or prompts for this recording template..."
                        rows={6}
                      />
                    </div>
                  )}
                  <Button onClick={handleSubmit} className="w-full">
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>System</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.type === 'note' ? (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mic className="h-4 w-4 text-muted-foreground" />
                        )}
                        {template.type}
                      </div>
                    </TableCell>
                    <TableCell>{template.category}</TableCell>
                    <TableCell>
                      {template.is_system ? (
                        <span className="text-xs bg-muted px-2 py-1 rounded">System</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Custom</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!template.is_system && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
