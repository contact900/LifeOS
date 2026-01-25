'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface NoteEditorProps {
  content?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => void
  placeholder?: string
}

export function NoteEditor({
  content,
  onChange,
  onSave,
  placeholder = 'Start writing...',
}: NoteEditorProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange?.(JSON.stringify(json))
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
      },
    },
  })

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content && isMounted) {
      const currentContent = JSON.stringify(editor.getJSON())
      if (currentContent !== content) {
        try {
          const parsedContent = JSON.parse(content)
          editor.commands.setContent(parsedContent)
        } catch {
          // If content is not valid JSON, ignore
        }
      }
    }
  }, [content, editor, isMounted])

  const handleSave = useCallback(() => {
    if (editor && onSave) {
      const json = editor.getJSON()
      onSave(JSON.stringify(json))
    }
  }, [editor, onSave])

  if (!isMounted || !editor) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
            Loading editor...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="border-b p-2 flex gap-2 flex-wrap">
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px bg-border mx-1" />
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <div className="w-px bg-border mx-1" />
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <div className="w-px bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
        {onSave && (
          <>
            <div className="flex-1" />
            <Button onClick={handleSave}>Save</Button>
          </>
        )}
      </div>
      <CardContent className="p-0">
        <EditorContent editor={editor} />
      </CardContent>
    </Card>
  )
}
