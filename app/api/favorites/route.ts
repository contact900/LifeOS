import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    let user
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError') {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const itemType = searchParams.get('type')
    const pinnedOnly = searchParams.get('pinned_only') === 'true'

    let query = supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('pinned_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })

    if (itemType) {
      query = query.eq('item_type', itemType)
    }

    if (pinnedOnly) {
      query = query.eq('is_pinned', true)
    }

    const { data: favorites, error } = await query

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      )
    }

    // Fetch the actual items
    const items = []
    if (favorites && favorites.length > 0) {
      for (const favorite of favorites) {
        let item = null
        const tableName = favorite.item_type === 'note' ? 'notes' :
                         favorite.item_type === 'recording' ? 'recordings' :
                         favorite.item_type === 'task' ? 'tasks' :
                         favorite.item_type === 'goal' ? 'goals' :
                         favorite.item_type === 'event' ? 'events' : null

        if (tableName) {
          const { data } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', favorite.item_id)
            .eq('user_id', user.id)
            .single()

          if (data) {
            item = {
              ...data,
              favorite_id: favorite.id,
              is_pinned: favorite.is_pinned,
              pinned_at: favorite.pinned_at,
            }
          }
        }

        if (item) {
          items.push(item)
        }
      }
    }

    return NextResponse.json({ favorites: items })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    let user
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError') {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { item_type, item_id, is_pinned } = body

    if (!item_type || !item_id) {
      return NextResponse.json(
        { error: 'item_type and item_id are required' },
        { status: 400 }
      )
    }

    // Check if favorite already exists
    const { data: existing } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', item_type)
      .eq('item_id', item_id)
      .single()

    let favorite
    if (existing) {
      // Update existing favorite
      const updateData: any = {}
      if (is_pinned !== undefined) {
        updateData.is_pinned = is_pinned
      }

      const { data, error } = await supabase
        .from('favorites')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating favorite:', error)
        return NextResponse.json(
          { error: 'Failed to update favorite' },
          { status: 500 }
        )
      }

      favorite = data
    } else {
      // Create new favorite
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          item_type,
          item_id,
          is_pinned: is_pinned || false,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating favorite:', error)
        return NextResponse.json(
          { error: 'Failed to create favorite' },
          { status: 500 }
        )
      }

      favorite = data
    }

    return NextResponse.json({ favorite })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    let user
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError') {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const itemType = searchParams.get('item_type')
    const itemId = searchParams.get('item_id')

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: 'item_type and item_id are required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)

    if (error) {
      console.error('Error deleting favorite:', error)
      return NextResponse.json(
        { error: 'Failed to delete favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
