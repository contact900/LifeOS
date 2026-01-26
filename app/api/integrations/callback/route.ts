import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?error=unauthorized', req.url)
      )
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const provider = searchParams.get('provider') || searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, req.url)
      )
    }

    if (!code || !provider) {
      return NextResponse.redirect(
        new URL('/integrations?error=missing_params', req.url)
      )
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations/callback?provider=${provider}`

    let accessToken = ''
    let refreshToken = ''
    let expiresAt: Date | null = null
    let email = ''
    let name = ''
    let scope = ''

    // Exchange code for tokens based on provider
    switch (provider) {
      case 'gmail':
      case 'google_calendar': {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          redirectUri
        )

        const { tokens } = await oauth2Client.getToken(code)
        accessToken = tokens.access_token || ''
        refreshToken = tokens.refresh_token || ''
        expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null
        scope = tokens.scope || ''

        // Get user info
        oauth2Client.setCredentials(tokens)
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        const userInfo = await oauth2.userinfo.get()
        email = userInfo.data.email || ''
        name = userInfo.data.name || ''
        break
      }

      case 'outlook': {
        const tokenResponse = await fetch(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.MICROSOFT_CLIENT_ID || '',
              client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
              code,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            }),
          }
        )

        const tokenData = await tokenResponse.json()
        accessToken = tokenData.access_token || ''
        refreshToken = tokenData.refresh_token || ''
        expiresAt = tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null
        scope = tokenData.scope || ''

        // Get user info
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const userData = await userResponse.json()
        email = userData.mail || userData.userPrincipalName || ''
        name = userData.displayName || ''
        break
      }

      case 'slack': {
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.SLACK_CLIENT_ID || '',
            client_secret: process.env.SLACK_CLIENT_SECRET || '',
            code,
            redirect_uri: redirectUri,
          }),
        })

        const tokenData = await tokenResponse.json()
        if (!tokenData.ok) {
          throw new Error(tokenData.error || 'Slack OAuth failed')
        }
        accessToken = tokenData.access_token || ''
        refreshToken = '' // Slack doesn't use refresh tokens the same way
        expiresAt = null
        scope = tokenData.scope || ''
        email = tokenData.authed_user?.email || ''
        name = tokenData.authed_user?.name || tokenData.team?.name || ''
        break
      }

      default:
        return NextResponse.redirect(
          new URL('/integrations?error=invalid_provider', req.url)
        )
    }

    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/integrations?error=no_token', req.url)
      )
    }

    // Save integration to database
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .upsert(
        {
          user_id: user.id,
          provider,
          access_token: accessToken, // In production, encrypt this
          refresh_token: refreshToken || null, // In production, encrypt this
          token_expires_at: expiresAt?.toISOString() || null,
          scope,
          email,
          name,
          is_active: true,
        },
        {
          onConflict: 'user_id,provider',
        }
      )
      .select()
      .single()

    if (dbError) {
      console.error('Error saving integration:', dbError)
      return NextResponse.redirect(
        new URL('/integrations?error=save_failed', req.url)
      )
    }

    return NextResponse.redirect(
      new URL('/integrations?success=connected', req.url)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`,
        req.url
      )
    )
  }
}
