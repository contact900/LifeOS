'use client'

import { useState, useEffect } from 'react'
import { AudioRecorder } from '@/components/recorder/audio-recorder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import { MessageSquare, FileText, Mic, Play, Trash2, Database } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Recording {
  id: string
  file_path: string
  transcript: string | null
  summary: string | null
  created_at: string
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchRecordings()
  }, [])

  const fetchRecordings = async () => {
    try {
      const response = await fetch('/api/recordings')
      if (response.ok) {
        const data = await response.json()
        setRecordings(data.recordings || [])
      }
    } catch (error) {
      console.error('Error fetching recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh recordings list
        await fetchRecordings()
        setIsDialogOpen(false)
        // Optionally show success message
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to upload recording'}`)
      }
    } catch (error) {
      console.error('Error uploading recording:', error)
      alert('Failed to upload recording')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return

    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setRecordings(recordings.filter((r) => r.id !== recordingId))
        if (selectedRecording?.id === recordingId) {
          setSelectedRecording(null)
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
            setAudioUrl(null)
          }
        }
      }
    } catch (error) {
      console.error('Error deleting recording:', error)
    }
  }

  const loadAudioUrl = async (recording: Recording) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('recordings')
      .createSignedUrl(recording.file_path, 3600) // 1 hour expiry

    if (error || !data) {
      console.error('Error loading audio:', error)
      return
    }

    setAudioUrl(data.signedUrl)
  }

  useEffect(() => {
    if (selectedRecording) {
      loadAudioUrl(selectedRecording)
    }
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [selectedRecording])

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
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Notes
              </Button>
            </Link>
            <Link href="/recordings">
              <Button variant="default" className="w-full justify-start">
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
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recordings</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mic className="mr-2 h-4 w-4" />
                New Recording
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Audio</DialogTitle>
              </DialogHeader>
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
              {uploading && (
                <p className="text-sm text-muted-foreground text-center">
                  Uploading and transcribing...
                </p>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 border-r p-4 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading recordings...</p>
            ) : recordings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recordings yet</p>
            ) : (
              <div className="space-y-2">
                {recordings.map((recording) => (
                  <Card
                    key={recording.id}
                    className={`cursor-pointer hover:bg-muted ${
                      selectedRecording?.id === recording.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedRecording(recording)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                          {new Date(recording.created_at).toLocaleString()}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRecording(recording.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {recording.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {recording.summary}
                        </p>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedRecording ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    {new Date(selectedRecording.created_at).toLocaleString()}
                  </h3>
                </div>
                {audioUrl && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Audio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <audio src={audioUrl} controls className="w-full" />
                    </CardContent>
                  </Card>
                )}
                {selectedRecording.summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{selectedRecording.summary}</p>
                    </CardContent>
                  </Card>
                )}
                {selectedRecording.transcript && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Transcript</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">
                        {selectedRecording.transcript}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a recording to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
