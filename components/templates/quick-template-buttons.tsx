'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface Template {
  id: string
  name: string
  type: 'note' | 'recording'
  content_json: any | null
  content_text: string | null
  icon: string | null
  is_system: boolean
}

interface QuickTemplateButtonsProps {
  type: 'note' | 'recording'
  onSelect: (template: Template) => void
  limit?: number
}

export function QuickTemplateButtons({ type, onSelect, limit = 3 }: QuickTemplateButtonsProps) {
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    fetchTemplates()
  }, [type])

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/templates?type=${type}`)
      if (response.ok) {
        const data = await response.json()
        // Get system templates first, then user templates, limit to specified number
        const systemTemplates = (data.templates || []).filter((t: Template) => t.is_system).slice(0, limit)
        setTemplates(systemTemplates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  if (templates.length === 0) return null

  return (
    <div className="space-y-1">
      {templates.map((template) => (
        <Button
          key={template.id}
          variant="outline"
          className="w-full justify-start text-xs"
          size="sm"
          onClick={() => onSelect(template)}
        >
          <Sparkles className="mr-2 h-3 w-3" />
          {template.name}
        </Button>
      ))}
    </div>
  )
}
