import { createClient } from '@/lib/supabase/server'

export interface RecordingSearchResult {
  id: string
  transcript: string
  summary: string | null
  created_at: string
  updated_at: string
}

/**
 * Search recordings by transcript or summary
 */
export async function searchRecordings(
  userId: string,
  query: string,
  limit: number = 10
): Promise<RecordingSearchResult[]> {
  const supabase = await createClient()

  // Get all recordings for the user
  const { data: recordings, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100) // Get more recordings to search through

  if (error) {
    console.error('Error fetching recordings:', error)
    return []
  }

  if (!recordings || recordings.length === 0) {
    return []
  }

  // Search through recordings
  const queryLower = query.toLowerCase()
  const results: RecordingSearchResult[] = []

  for (const recording of recordings) {
    const transcriptMatch =
      recording.transcript?.toLowerCase().includes(queryLower)
    const summaryMatch =
      recording.summary?.toLowerCase().includes(queryLower)

    if (transcriptMatch || summaryMatch) {
      results.push({
        id: recording.id,
        transcript: recording.transcript || '',
        summary: recording.summary,
        created_at: recording.created_at,
        updated_at: recording.updated_at,
      })
    }
  }

  // Sort by relevance (summary matches first, then transcript matches)
  results.sort((a, b) => {
    const aSummaryMatch = a.summary?.toLowerCase().includes(queryLower)
    const bSummaryMatch = b.summary?.toLowerCase().includes(queryLower)
    if (aSummaryMatch && !bSummaryMatch) return -1
    if (!aSummaryMatch && bSummaryMatch) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return results.slice(0, limit)
}

/**
 * Get a specific recording by ID
 */
export async function getRecordingById(
  userId: string,
  recordingId: string
): Promise<RecordingSearchResult | null> {
  const supabase = await createClient()

  const { data: recording, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .eq('id', recordingId)
    .single()

  if (error || !recording) {
    return null
  }

  return {
    id: recording.id,
    transcript: recording.transcript || '',
    summary: recording.summary,
    created_at: recording.created_at,
    updated_at: recording.updated_at,
  }
}
