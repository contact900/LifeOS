import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ memories: data || [] })
  } catch (error) {
    console.error('Memories API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, category, source_type } = await req.json()

    if (!content || !category || !source_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        content,
        category,
        source_type,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ memory: data })
  } catch (error) {
    console.error('Create memory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
