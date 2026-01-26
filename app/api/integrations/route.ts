import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    // Check if request is aborted
    if (req.signal?.aborted) {
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
    }

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
      // Handle abort errors gracefully
      if (authErr?.name === 'AbortError' || authErr?.message?.includes('aborted')) {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      console.error('Error getting user:', authErr)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching integrations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      )
    }

    // Don't return sensitive tokens
    const safeIntegrations = (integrations || []).map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      email: integration.email,
      name: integration.name,
      is_active: integration.is_active,
      last_sync_at: integration.last_sync_at,
      sync_settings: integration.sync_settings,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
      // Don't include access_token, refresh_token, etc.
    }))

    return NextResponse.json({ integrations: safeIntegrations })
  } catch (error) {
    console.error('Integrations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    // Check if request is aborted
    if (req.signal?.aborted) {
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
    }

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
      // Handle abort errors gracefully
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
    const { provider, access_token, refresh_token, token_expires_at, scope, email, name, sync_settings } = body

    if (!provider || !access_token) {
      return NextResponse.json(
        { error: 'Provider and access_token are required' },
        { status: 400 }
      )
    }

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    let integration
    if (existing) {
      // Update existing integration
      const { data, error } = await supabase
        .from('integrations')
        .update({
          access_token,
          refresh_token: refresh_token || null,
          token_expires_at: token_expires_at || null,
          scope: scope || null,
          email: email || null,
          name: name || null,
          is_active: true,
          sync_settings: sync_settings || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating integration:', error)
        return NextResponse.json(
          { error: 'Failed to update integration' },
          { status: 500 }
        )
      }
      integration = data
    } else {
      // Create new integration
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          user_id: user.id,
          provider,
          access_token,
          refresh_token: refresh_token || null,
          token_expires_at: token_expires_at || null,
          scope: scope || null,
          email: email || null,
          name: name || null,
          is_active: true,
          sync_settings: sync_settings || {},
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating integration:', error)
        return NextResponse.json(
          { error: 'Failed to create integration' },
          { status: 500 }
        )
      }
      integration = data
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
