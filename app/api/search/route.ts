import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchNotes } from '@/lib/agents/tools/notes-search'
import { searchRecordings } from '@/lib/agents/tools/recordings-search'
import { searchTasks } from '@/lib/agents/tools/tasks-search'
import { searchMemories } from '@/lib/rag/vector-search'

export interface SearchResult {
  id: string
  type: 'note' | 'recording' | 'memory' | 'task'
  title: string
  content?: string
  category?: string
  tags?: Array<{ id: string; name: string; color: string }>
  created_at: string
  updated_at?: string
  metadata?: any
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') // 'note' | 'recording' | 'memory' | 'task' | null (all)
    const category = searchParams.get('category')
    const tagId = searchParams.get('tag_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    if (!query.trim() && !type && !category && !tagId && !dateFrom && !dateTo) {
      return NextResponse.json({ results: [] })
    }

    const results: SearchResult[] = []

    // Search notes
    if (!type || type === 'note') {
      let notesQuery = supabase
        .from('notes')
        .select('*, notes_tags(tag_id, tags(*))')
        .eq('user_id', user.id)

      if (tagId) {
        notesQuery = notesQuery.eq('notes_tags.tag_id', tagId)
      }

      if (dateFrom) {
        notesQuery = notesQuery.gte('created_at', dateFrom)
      }

      if (dateTo) {
        notesQuery = notesQuery.lte('created_at', dateTo)
      }

      const { data: notes } = await notesQuery.order('created_at', { ascending: false })

      if (notes) {
        // Extract text from Tiptap JSON
        const extractText = (node: any): string => {
          if (typeof node === 'string') return node
          if (node.type === 'text') return node.text || ''
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join(' ')
          }
          return ''
        }

        for (const note of notes) {
          const contentText = extractText(note.content_json)
          const titleMatch = query
            ? note.title?.toLowerCase().includes(query.toLowerCase())
            : true
          const contentMatch = query
            ? contentText.toLowerCase().includes(query.toLowerCase())
            : true

          if (query && !titleMatch && !contentMatch) continue

          // Get tags
          const tags =
            note.notes_tags
              ?.map((nt: any) => nt.tags)
              .filter(Boolean)
              .map((tag: any) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color,
              })) || []

          results.push({
            id: note.id,
            type: 'note',
            title: note.title,
            content: contentText.substring(0, 300),
            tags,
            created_at: note.created_at,
            updated_at: note.updated_at,
            metadata: {
              content_length: contentText.length,
            },
          })
        }
      }
    }

    // Search recordings
    if (!type || type === 'recording') {
      let recordingsQuery = supabase
        .from('recordings')
        .select('*, recordings_tags(tag_id, tags(*))')
        .eq('user_id', user.id)

      if (tagId) {
        recordingsQuery = recordingsQuery.eq('recordings_tags.tag_id', tagId)
      }

      if (dateFrom) {
        recordingsQuery = recordingsQuery.gte('created_at', dateFrom)
      }

      if (dateTo) {
        recordingsQuery = recordingsQuery.lte('created_at', dateTo)
      }

      const { data: recordings } = await recordingsQuery.order('created_at', {
        ascending: false,
      })

      if (recordings) {
        for (const recording of recordings) {
          const searchableText = [
            recording.transcript || '',
            recording.summary || '',
          ]
            .join(' ')
            .toLowerCase()
          const matches = query
            ? searchableText.includes(query.toLowerCase())
            : true

          if (query && !matches) continue

          // Get tags
          const tags =
            recording.recordings_tags
              ?.map((rt: any) => rt.tags)
              .filter(Boolean)
              .map((tag: any) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color,
              })) || []

          results.push({
            id: recording.id,
            type: 'recording',
            title: new Date(recording.created_at).toLocaleString(),
            content: recording.summary || recording.transcript?.substring(0, 300) || '',
            tags,
            created_at: recording.created_at,
            metadata: {
              has_transcript: !!recording.transcript,
              has_summary: !!recording.summary,
            },
          })
        }
      }
    }

    // Search tasks
    if (!type || type === 'task') {
      let tasksQuery = supabase
        .from('tasks')
        .select('*, tasks_tags(tag_id, tags(*))')
        .eq('user_id', user.id)

      if (category) {
        tasksQuery = tasksQuery.eq('category', category)
      }

      if (tagId) {
        tasksQuery = tasksQuery.eq('tasks_tags.tag_id', tagId)
      }

      if (dateFrom) {
        tasksQuery = tasksQuery.gte('created_at', dateFrom)
      }

      if (dateTo) {
        tasksQuery = tasksQuery.lte('created_at', dateTo)
      }

      const { data: tasks } = await tasksQuery.order('created_at', {
        ascending: false,
      })

      if (tasks) {
        for (const task of tasks) {
          const searchableText = [task.title, task.description || '']
            .join(' ')
            .toLowerCase()
          const matches = query
            ? searchableText.includes(query.toLowerCase())
            : true

          if (query && !matches) continue

          // Get tags
          const tags =
            task.tasks_tags
              ?.map((tt: any) => tt.tags)
              .filter(Boolean)
              .map((tag: any) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color,
              })) || []

          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            content: task.description || '',
            category: task.category,
            tags,
            created_at: task.created_at,
            updated_at: task.updated_at,
            metadata: {
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
            },
          })
        }
      }
    }

    // Search memories (using vector search if query provided)
    if (!type || type === 'memory') {
      if (query) {
        const memories = await searchMemories(
          user.id,
          query,
          category as any,
          10
        )

        for (const memory of memories) {
          const matches = category ? memory.category === category : true

          if (!matches) continue

          results.push({
            id: memory.id,
            type: 'memory',
            title: `Memory: ${memory.category}`,
            content: memory.content.substring(0, 300),
            category: memory.category,
            created_at: memory.created_at,
            metadata: {
              source_type: memory.source_type,
            },
          })
        }
      } else {
        // If no query, just get recent memories with filters
        let memoriesQuery = supabase
          .from('memories')
          .select('*')
          .eq('user_id', user.id)

        if (category) {
          memoriesQuery = memoriesQuery.eq('category', category)
        }

        if (dateFrom) {
          memoriesQuery = memoriesQuery.gte('created_at', dateFrom)
        }

        if (dateTo) {
          memoriesQuery = memoriesQuery.lte('created_at', dateTo)
        }

        const { data: memories } = await memoriesQuery.order('created_at', {
          ascending: false,
        })

        if (memories) {
          for (const memory of memories) {
            results.push({
              id: memory.id,
              type: 'memory',
              title: `Memory: ${memory.category}`,
              content: memory.content.substring(0, 300),
              category: memory.category,
              created_at: memory.created_at,
              metadata: {
                source_type: memory.source_type,
              },
            })
          }
        }
      }
    }

    // Sort results by relevance (if query) or date
    if (query) {
      results.sort((a, b) => {
        const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase())
        const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase())
        if (aTitleMatch && !bTitleMatch) return -1
        if (!aTitleMatch && bTitleMatch) return 1
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      })
    } else {
      results.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
