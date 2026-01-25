'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Square, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleUpload = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob)
      // Reset state
      setAudioBlob(null)
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Recorder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          {!isRecording && !audioBlob && (
            <Button
              onClick={startRecording}
              size="lg"
              className="rounded-full h-20 w-20"
            >
              <Mic className="h-8 w-8" />
            </Button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="relative"
              >
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-20 w-20"
                >
                  <Square className="h-8 w-8" />
                </Button>
              </motion.div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Recording...</p>
                <p className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</p>
              </div>
            </div>
          )}

          {audioBlob && !isRecording && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Recording complete</p>
                <p className="text-lg font-mono">{formatTime(recordingTime)}</p>
              </div>
              {audioUrl && (
                <audio src={audioUrl} controls className="w-full" />
              )}
              <div className="flex gap-2">
                <Button onClick={handleUpload} className="flex-1">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Transcribe
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAudioBlob(null)
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl)
                      setAudioUrl(null)
                    }
                    setRecordingTime(0)
                  }}
                >
                  Record Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
