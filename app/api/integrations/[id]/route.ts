import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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
        console.error('Auth error:', authError)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError' || authErr?.message?.includes('aborted')) {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      console.error('Error getting user:', authErr)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching integration:', error)
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Don't return sensitive tokens
    const safeIntegration = {
      id: integration.id,
      provider: integration.provider,
      email: integration.email,
      name: integration.name,
      is_active: integration.is_active,
      last_sync_at: integration.last_sync_at,
      sync_settings: integration.sync_settings,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
    }

    return NextResponse.json({ integration: safeIntegration })
  } catch (error) {
    console.error('Integrations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
        console.error('Auth error:', authError)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError' || authErr?.message?.includes('aborted')) {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      console.error('Error getting user:', authErr)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { is_active, sync_settings } = body

    const updateData: any = {}
    if (is_active !== undefined) updateData.is_active = is_active
    if (sync_settings !== undefined) updateData.sync_settings = sync_settings

    const { data: integration, error } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating integration:', error)
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 }
      )
    }

    // Don't return sensitive tokens
    const safeIntegration = {
      id: integration.id,
      provider: integration.provider,
      email: integration.email,
      name: integration.name,
      is_active: integration.is_active,
      last_sync_at: integration.last_sync_at,
      sync_settings: integration.sync_settings,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
    }

    return NextResponse.json({ integration: safeIntegration })
  } catch (error) {
    console.error('Integrations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
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
        console.error('Auth error:', authError)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError' || authErr?.message?.includes('aborted')) {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      console.error('Error getting user:', authErr)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting integration:', error)
      return NextResponse.json(
        { error: 'Failed to delete integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Integrations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
