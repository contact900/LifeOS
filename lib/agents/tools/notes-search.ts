import { createClient } from '@/lib/supabase/server'

export interface NoteSearchResult {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

/**
 * Search notes by title or content
 */
export async function searchNotes(
  userId: string,
  query: string,
  limit: number = 10
): Promise<NoteSearchResult[]> {
  const supabase = await createClient()

  // Extract text from Tiptap JSON content
  const extractText = (node: any): string => {
    if (typeof node === 'string') return node
    if (node.type === 'text') return node.text || ''
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join(' ')
    }
    return ''
  }

  // Get all notes for the user
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100) // Get more notes to search through

  if (error) {
    console.error('Error fetching notes:', error)
    return []
  }

  if (!notes || notes.length === 0) {
    return []
  }

  // Search through notes
  const queryLower = query.toLowerCase()
  const results: NoteSearchResult[] = []
  const allNotes: NoteSearchResult[] = []

  for (const note of notes) {
    const contentText = extractText(note.content_json)
    const noteResult = {
      id: note.id,
      title: note.title,
      content: contentText,
      created_at: note.created_at,
      updated_at: note.updated_at,
    }
    
    allNotes.push(noteResult)
    
    const titleMatch = note.title?.toLowerCase().includes(queryLower)
    const contentMatch = contentText.toLowerCase().includes(queryLower)

    if (titleMatch || contentMatch) {
      results.push(noteResult)
    }
  }

  // If we have exact matches, return those sorted by relevance
  if (results.length > 0) {
    results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(queryLower)
      const bTitleMatch = b.title.toLowerCase().includes(queryLower)
      if (aTitleMatch && !bTitleMatch) return -1
      if (!aTitleMatch && bTitleMatch) return 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
    return results.slice(0, limit)
  }

  // If no exact matches, check if this is a general "notes" query
  // If query is very short or contains "note"/"wrote"/"written", return recent notes
  const isGeneralNotesQuery = 
    query.length < 5 || 
    queryLower.includes('note') || 
    queryLower.includes('wrote') || 
    queryLower.includes('written') ||
    queryLower.includes('what') ||
    queryLower.includes('tell')

  // If no exact matches but user is asking about notes generally, return recent notes
  // This helps the AI know notes exist and can access them
  if (isGeneralNotesQuery && allNotes.length > 0) {
    // Return most recent notes so AI knows they exist
    allNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return allNotes.slice(0, Math.min(limit, 10)) // Return up to 10 recent notes for general queries
  }

  // If query has some content but no matches, still return a few recent notes
  if (query && query.length > 0 && allNotes.length > 0) {
    allNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return allNotes.slice(0, Math.min(limit, 5)) // Return up to 5 recent notes
  }

  return []
}

/**
 * Get a specific note by ID
 */
export async function getNoteById(
  userId: string,
  noteId: string
): Promise<NoteSearchResult | null> {
  const supabase = await createClient()

  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('id', noteId)
    .single()

  if (error || !note) {
    return null
  }

  const extractText = (node: any): string => {
    if (typeof node === 'string') return node
    if (node.type === 'text') return node.text || ''
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join(' ')
    }
    return ''
  }

  return {
    id: note.id,
    title: note.title,
    content: extractText(note.content_json),
    created_at: note.created_at,
    updated_at: note.updated_at,
  }
}
