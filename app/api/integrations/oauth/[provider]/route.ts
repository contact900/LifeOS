import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider
    const { searchParams } = new URL(req.url)
    const redirectUri = searchParams.get('redirect_uri') || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations/callback`

    // Generate OAuth URLs based on provider
    let authUrl = ''

    switch (provider) {
      case 'gmail': {
        const gmailClientId = process.env.GOOGLE_CLIENT_ID
        if (!gmailClientId) {
          return NextResponse.json(
            { error: 'GOOGLE_CLIENT_ID environment variable is not set' },
            { status: 500 }
          )
        }
        const gmailScopes = 'https://www.googleapis.com/auth/gmail.readonly'
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${gmailClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(gmailScopes)}&access_type=offline&prompt=consent`
        break
      }

      case 'outlook': {
        const outlookClientId = process.env.MICROSOFT_CLIENT_ID
        if (!outlookClientId) {
          return NextResponse.json(
            { error: 'MICROSOFT_CLIENT_ID environment variable is not set' },
            { status: 500 }
          )
        }
        const outlookScopes = 'https://graph.microsoft.com/Mail.Read offline_access'
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${outlookClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(outlookScopes)}`
        break
      }

      case 'google_calendar': {
        const calendarClientId = process.env.GOOGLE_CLIENT_ID
        if (!calendarClientId) {
          return NextResponse.json(
            { error: 'GOOGLE_CLIENT_ID environment variable is not set' },
            { status: 500 }
          )
        }
        const calendarScopes = 'https://www.googleapis.com/auth/calendar.readonly'
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${calendarClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(calendarScopes)}&access_type=offline&prompt=consent`
        break
      }

      case 'slack': {
        const slackClientId = process.env.SLACK_CLIENT_ID
        if (!slackClientId) {
          return NextResponse.json(
            { error: 'SLACK_CLIENT_ID environment variable is not set' },
            { status: 500 }
          )
        }
        const slackScopes = 'channels:history,channels:read,groups:history,im:history,mpim:history,users:read'
        authUrl = `https://slack.com/oauth/v2/authorize?client_id=${slackClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(slackScopes)}&response_type=code`
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid provider' },
          { status: 400 }
        )
    }

    if (!authUrl) {
      return NextResponse.json(
        { error: 'Failed to generate OAuth URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ auth_url: authUrl })
  } catch (error) {
    console.error('OAuth URL generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
