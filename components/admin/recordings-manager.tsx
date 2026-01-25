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
import { Search, Trash2, Download, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Recording {
  id: string
  file_path: string
  transcript: string | null
  summary: string | null
  created_at: string
  updated_at: string
}

export function RecordingsManager() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    try {
      const response = await fetch('/api/admin/recordings')
      if (response.ok) {
        const data = await response.json()
        setRecordings(data.recordings || [])
      }
    } catch (error) {
      console.error('Error loading recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/recordings/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadRecordings()
        if (playingId === id) {
          setPlayingId(null)
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
            setAudioUrl(null)
          }
        }
      } else {
        alert('Failed to delete recording')
      }
    } catch (error) {
      console.error('Error deleting recording:', error)
      alert('Failed to delete recording. Please try again.')
    }
  }

  const handlePlay = async (recording: Recording) => {
    if (playingId === recording.id && audioUrl) {
      // Stop playing
      setPlayingId(null)
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('recordings')
        .createSignedUrl(recording.file_path, 3600)

      if (error || !data) {
        alert('Failed to load audio file')
        return
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }

      setAudioUrl(data.signedUrl)
      setPlayingId(recording.id)
    } catch (error) {
      console.error('Error loading audio:', error)
      alert('Failed to load audio')
    }
  }

  const handleExport = () => {
    const csv = [
      ['File Path', 'Has Transcript', 'Has Summary', 'Created At'].join(','),
      ...recordings.map(r => [
        r.file_path,
        r.transcript ? 'Yes' : 'No',
        r.summary ? 'Yes' : 'No',
        new Date(r.created_at).toISOString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recordings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredRecordings = recordings.filter(recording => {
    const searchLower = searchTerm.toLowerCase()
    return (
      recording.file_path.toLowerCase().includes(searchLower) ||
      recording.transcript?.toLowerCase().includes(searchLower) ||
      recording.summary?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading recordings...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Recordings</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={recordings.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recordings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {playingId && audioUrl && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Now Playing</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlayingId(null)
                  URL.revokeObjectURL(audioUrl)
                  setAudioUrl(null)
                }}
              >
                Close
              </Button>
            </div>
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}

        {filteredRecordings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm 
              ? 'No recordings match your search' 
              : 'No recordings yet. Record audio from the Recordings page!'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Transcript</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecordings.map((recording) => (
                  <TableRow key={recording.id}>
                    <TableCell className="font-mono text-xs">
                      {recording.file_path.split('/').pop()}
                    </TableCell>
                    <TableCell>
                      {recording.transcript ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {recording.summary ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(recording.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlay(recording)}
                        >
                          <Play className={`h-4 w-4 ${playingId === recording.id ? 'text-green-600' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(recording.id)}
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
        
        {filteredRecordings.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredRecordings.length} of {recordings.length} recordings
          </div>
        )}
      </CardContent>
    </Card>
  )
}
