'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlock from '@tiptap/extension-code-block'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Iframe } from '@/lib/tiptap/extensions/iframe'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  Table as TableIcon,
  Upload,
  X,
  Film,
} from 'lucide-react'
import { useCallback, useEffect, useState, useRef } from 'react'

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
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // We'll use the standalone extension
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-border',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-border',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-muted font-semibold text-left p-2 border border-border',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'p-2 border border-border',
        },
      }),
      Iframe.configure({
        HTMLAttributes: {
          class: 'w-full border rounded-lg',
        },
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

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/notes/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        editor?.chain().focus().setImage({ src: data.url }).run()
        setImageDialogOpen(false)
        setImageUrl('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageUrl = () => {
    if (imageUrl.trim()) {
      editor?.chain().focus().setImage({ src: imageUrl.trim() }).run()
      setImageDialogOpen(false)
      setImageUrl('')
    }
  }

  const handleSetLink = () => {
    if (linkUrl.trim()) {
      editor?.chain().focus().setLink({ href: linkUrl.trim() }).run()
      setLinkDialogOpen(false)
      setLinkUrl('')
    }
  }

  const handleUnsetLink = () => {
    editor?.chain().focus().unsetLink().run()
    setLinkDialogOpen(false)
    setLinkUrl('')
  }

  const handleSetEmbed = () => {
    if (embedUrl.trim()) {
      // Convert common embed URLs to iframe format
      let iframeSrc = embedUrl.trim()
      
      // YouTube
      if (iframeSrc.includes('youtube.com/watch') || iframeSrc.includes('youtu.be/')) {
        const videoId = iframeSrc.includes('youtu.be/')
          ? iframeSrc.split('youtu.be/')[1].split('?')[0]
          : iframeSrc.split('v=')[1]?.split('&')[0]
        if (videoId) {
          iframeSrc = `https://www.youtube.com/embed/${videoId}`
        }
      }
      // Vimeo
      else if (iframeSrc.includes('vimeo.com/')) {
        const videoId = iframeSrc.split('vimeo.com/')[1]?.split('?')[0]
        if (videoId) {
          iframeSrc = `https://player.vimeo.com/video/${videoId}`
        }
      }
      // Twitter/X (basic support)
      else if (iframeSrc.includes('twitter.com/') || iframeSrc.includes('x.com/')) {
        // Twitter embeds require special handling, for now just use the URL
        // In production, you'd use Twitter's embed API
      }

      editor?.chain().focus().setIframe({ src: iframeSrc }).run()
      setEmbedDialogOpen(false)
      setEmbedUrl('')
    }
  }

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
        <Button
          variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
          size="icon"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="h-4 w-4" />
        </Button>
        <div className="w-px bg-border mx-1" />
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant={editor.isActive('image') ? 'default' : 'ghost'}
              size="icon"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Image URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleImageUrl()
                      }
                    }}
                  />
                  <Button onClick={handleImageUrl} disabled={!imageUrl.trim()}>
                    Insert
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="mt-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleImageUpload(file)
                    }
                  }}
                  disabled={uploadingImage}
                />
                {uploadingImage && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant={editor.isActive('link') ? 'default' : 'ghost'}
              size="icon"
              onClick={() => {
                const url = editor.getAttributes('link').href
                setLinkUrl(url || '')
                setLinkDialogOpen(true)
              }}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editor.isActive('link') ? 'Edit Link' : 'Insert Link'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>URL</Label>
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSetLink()
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSetLink} disabled={!linkUrl.trim()}>
                  {editor.isActive('link') ? 'Update' : 'Insert'}
                </Button>
                {editor.isActive('link') && (
                  <Button variant="destructive" onClick={handleUnsetLink}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
            >
              <Film className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Embed Content</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Embed URL (YouTube, Vimeo, etc.)</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSetEmbed()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports YouTube, Vimeo, and other embeddable content
                </p>
              </div>
              <Button onClick={handleSetEmbed} disabled={!embedUrl.trim()}>
                Insert Embed
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant={editor.isActive('table') ? 'default' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }}
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        {editor.isActive('table') && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!editor.can().addColumnBefore()}
            >
              <span className="text-xs">+Col</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
            >
              <span className="text-xs">Col+</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
            >
              <span className="text-xs">-Col</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              disabled={!editor.can().addRowBefore()}
            >
              <span className="text-xs">+Row</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
            >
              <span className="text-xs">Row+</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
            >
              <span className="text-xs">-Row</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().deleteTable().run()}
              disabled={!editor.can().deleteTable()}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
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
      <style jsx global>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1rem 0;
          table-layout: fixed;
          width: 100%;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror table th {
          font-weight: bold;
          text-align: left;
          background-color: hsl(var(--muted));
        }
        .ProseMirror table .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }
        .ProseMirror table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #adf;
          pointer-events: none;
        }
        .ProseMirror code {
          background-color: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .ProseMirror pre {
          background: hsl(var(--muted));
          border-radius: 0.5rem;
          color: hsl(var(--foreground));
          font-family: 'JetBrainsMono', 'Courier New', monospace;
          padding: 0.75rem 1rem;
          margin: 1rem 0;
        }
        .ProseMirror pre code {
          background: none;
          color: inherit;
          font-size: 0.8rem;
          padding: 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror a:hover {
          color: hsl(var(--primary) / 0.8);
        }
        .ProseMirror iframe {
          width: 100%;
          min-height: 400px;
          border: none;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
      `}</style>
    </Card>
  )
}
