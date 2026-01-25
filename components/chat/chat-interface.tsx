'use client'

import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Send, Bot, User, Paperclip, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface AttachedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  extractedText?: string
  processing?: boolean
}

export function ChatInterface() {
  const [inputValue, setInputValue] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { messages, sendMessage, isLoading, error } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error)
    },
    onFinish: (message) => {
      // Message finished
    },
  })


  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newFiles: AttachedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      processing: true,
    }))

    setAttachedFiles((prev) => [...prev, ...newFiles])

    // Process each file to extract text
    for (const newFile of newFiles) {
      try {
        const formData = new FormData()
        formData.append('file', newFile.file)

        const response = await fetch('/api/chat/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to process file')
        }

        const data = await response.json()
        
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id
              ? { ...f, extractedText: data.text, processing: false }
              : f
          )
        )
      } catch (error) {
        console.error('Error processing file:', error)
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id ? { ...f, processing: false } : f
          )
        )
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            LifeOS Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
              <p className="font-semibold">Error:</p>
              <p className="text-sm">{error.message || 'An error occurred'}</p>
            </div>
          )}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-lg mb-2">Welcome to LifeOS</p>
              <p className="text-sm mb-2">
                Your personal Chief of Staff is ready to help. Ask me anything about
                finance, work, health, or general topics.
              </p>
              <p className="text-xs">
                💡 Tip: You can attach files (PDF, images, text files) to ask questions about them!
              </p>
            </div>
          )}
          {messages.map((message) => {
            // Handle new message format with parts array
            let messageContent = message.content || ''
            
            // If message has parts array (new format), extract text from it
            if ((message as any).parts && Array.isArray((message as any).parts)) {
              const textParts = (message as any).parts
                .filter((part: any) => part.type === 'text' && part.text)
                .map((part: any) => part.text)
              messageContent = textParts.join(' ')
            }
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'user' && (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 whitespace-pre-wrap break-words">
                      {messageContent}
                    </div>
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 justify-start"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        {attachedFiles.length > 0 && (
          <div className="border-t p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Attached files:</p>
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-sm"
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="max-w-[200px] truncate">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({formatFileSize(file.size)})
                  </span>
                  {file.processing && (
                    <span className="text-xs text-muted-foreground">
                      Processing...
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if ((inputValue.trim() || attachedFiles.length > 0) && !isLoading) {
              // Build message content with file context
              let messageContent = inputValue
              
              if (attachedFiles.length > 0) {
                const fileContexts = attachedFiles
                  .filter((f) => f.extractedText && !f.processing)
                  .map((f) => `[File: ${f.name}]\n${f.extractedText}`)
                  .join('\n\n')
                
                if (fileContexts) {
                  messageContent = messageContent
                    ? `${messageContent}\n\n${fileContexts}`
                    : `Please analyze these files:\n\n${fileContexts}`
                }
              }

              if (messageContent.trim()) {
                sendMessage({ content: messageContent })
                setInputValue('')
                setAttachedFiles([])
              }
            }
          }}
          className="border-t p-4 flex gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx,.md,.csv,.json,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}
