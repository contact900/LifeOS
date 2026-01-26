'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Mic, Sparkles, Loader2 } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

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
}

interface TemplateSelectorProps {
  type: 'note' | 'recording'
  onSelect: (template: Template) => void
  trigger?: React.ReactNode
}

export function TemplateSelector({ type, onSelect, trigger }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen, type])

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/templates?type=${type}`)
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

  const handleSelect = (template: Template) => {
    onSelect(template)
    setIsOpen(false)
  }

  const getIcon = (iconName: string | null) => {
    if (!iconName) return type === 'note' ? <FileText className="h-5 w-5" /> : <Mic className="h-5 w-5" />
    const IconComponent = (LucideIcons as any)[iconName] || (type === 'note' ? FileText : Mic)
    return <IconComponent className="h-5 w-5" />
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Sparkles className="mr-2 h-4 w-4" />
      Use Template
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select {type === 'note' ? 'Note' : 'Recording'} Template</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSelect(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        {getIcon(template.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.is_system && (
                          <span className="text-xs text-muted-foreground">System</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {template.description && (
                    <CardDescription className="mt-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
