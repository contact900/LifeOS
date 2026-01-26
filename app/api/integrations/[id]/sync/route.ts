import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { WebClient } from '@slack/web-api'

export async function POST(
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

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    if (!integration.is_active) {
      return NextResponse.json(
        { error: 'Integration is not active' },
        { status: 400 }
      )
    }

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('integration_sync_log')
      .insert({
        integration_id: integration.id,
        sync_type: integration.provider,
        status: 'success',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    let itemsSynced = 0
    let errorMessage: string | null = null

    try {
      switch (integration.provider) {
        case 'gmail':
          itemsSynced = await syncGmail(supabase, user.id, integration)
          break
        case 'outlook':
          itemsSynced = await syncOutlook(supabase, user.id, integration)
          break
        case 'google_calendar':
          itemsSynced = await syncGoogleCalendar(supabase, user.id, integration)
          break
        case 'slack':
          itemsSynced = await syncSlack(supabase, user.id, integration)
          break
        default:
          throw new Error(`Unsupported provider: ${integration.provider}`)
      }

      // Update sync log
      await supabase
        .from('integration_sync_log')
        .update({
          status: 'success',
          items_synced: itemsSynced,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      // Update integration last_sync_at
      await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', integration.id)

      return NextResponse.json({
        success: true,
        items_synced: itemsSynced,
      })
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update sync log with error
      await supabase
        .from('integration_sync_log')
        .update({
          status: 'error',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function syncGmail(
  supabase: any,
  userId: string,
  integration: any
): Promise<number> {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  
  // Get recent messages
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 50,
    q: 'is:unread OR is:important',
  })

  const messages = response.data.messages || []
  let synced = 0

  for (const message of messages) {
    if (!message.id) continue

    try {
      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      })

      const msg = msgResponse.data
      const headers = msg.payload?.headers || []
      const subject = headers.find((h) => h.name === 'Subject')?.value || ''
      const from = headers.find((h) => h.name === 'From')?.value || ''
      const to = headers.find((h) => h.name === 'To')?.value || ''
      const date = headers.find((h) => h.name === 'Date')?.value || ''

      // Extract body
      let bodyText = ''
      let bodyHtml = ''
      if (msg.payload?.body?.data) {
        bodyText = Buffer.from(msg.payload.body.data, 'base64').toString()
      } else if (msg.payload?.parts) {
        for (const part of msg.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            bodyText = Buffer.from(part.body.data, 'base64').toString()
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            bodyHtml = Buffer.from(part.body.data, 'base64').toString()
          }
        }
      }

      await supabase.from('synced_emails').upsert(
        {
          user_id: userId,
          integration_id: integration.id,
          provider_message_id: message.id,
          thread_id: msg.threadId || null,
          subject,
          from_email: from,
          to_emails: to ? [to] : [],
          body_text: bodyText,
          body_html: bodyHtml,
          received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          is_read: !msg.labelIds?.includes('UNREAD'),
          is_starred: msg.labelIds?.includes('STARRED') || false,
          labels: msg.labelIds || [],
        },
        {
          onConflict: 'integration_id,provider_message_id',
        }
      )

      synced++
    } catch (error) {
      console.error(`Error syncing message ${message.id}:`, error)
    }
  }

  return synced
}

async function syncOutlook(
  supabase: any,
  userId: string,
  integration: any
): Promise<number> {
  // Get messages from Microsoft Graph API
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/messages?$top=50&$filter=isRead eq false or importance eq \'high\'',
    {
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch Outlook messages')
  }

  const data = await response.json()
  const messages = data.value || []
  let synced = 0

  for (const message of messages) {
    await supabase.from('synced_emails').upsert(
      {
        user_id: userId,
        integration_id: integration.id,
        provider_message_id: message.id,
        thread_id: message.conversationId || null,
        subject: message.subject || '',
        from_email: message.from?.emailAddress?.address || '',
        from_name: message.from?.emailAddress?.name || null,
        to_emails: message.toRecipients?.map((r: any) => r.emailAddress.address) || [],
        cc_emails: message.ccRecipients?.map((r: any) => r.emailAddress.address) || [],
        body_text: message.bodyPreview || '',
        body_html: message.body?.content || '',
        received_at: message.receivedDateTime || new Date().toISOString(),
        is_read: message.isRead || false,
        is_starred: message.flag?.isFlagged || false,
      },
      {
        onConflict: 'integration_id,provider_message_id',
      }
    )

    synced++
  }

  return synced
}

async function syncGoogleCalendar(
  supabase: any,
  userId: string,
  integration: any
): Promise<number> {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  // Get events from the next 30 days
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []
  let synced = 0

  for (const event of events) {
    if (!event.id) continue

    await supabase.from('synced_calendar_events').upsert(
      {
        user_id: userId,
        integration_id: integration.id,
        provider_event_id: event.id,
        calendar_id: 'primary',
        title: event.summary || 'Untitled Event',
        description: event.description || null,
        start_time: event.start?.dateTime || event.start?.date || new Date().toISOString(),
        end_time: event.end?.dateTime || event.end?.date || null,
        location: event.location || null,
        attendees: event.attendees || [],
        is_all_day: !event.start?.dateTime,
        status: event.status || 'confirmed',
      },
      {
        onConflict: 'integration_id,provider_event_id',
      }
    )

    synced++
  }

  return synced
}

async function syncSlack(
  supabase: any,
  userId: string,
  integration: any
): Promise<number> {
  const client = new WebClient(integration.access_token)
  
  // Get list of channels
  const channelsResponse = await client.conversations.list({
    types: 'public_channel,private_channel,im,mpim',
    limit: 100,
  })

  const channels = channelsResponse.channels || []
  let synced = 0

  for (const channel of channels) {
    if (!channel.id) continue

    try {
      // Get recent messages from channel
      const messagesResponse = await client.conversations.history({
        channel: channel.id,
        limit: 50,
      })

      const messages = messagesResponse.messages || []

      for (const message of messages) {
        if (!message.ts) continue

        await supabase.from('synced_slack_messages').upsert(
          {
            user_id: userId,
            integration_id: integration.id,
            provider_message_id: message.ts,
            channel_id: channel.id,
            channel_name: (channel as any).name || null,
            user_id_slack: message.user || null,
            user_name: null, // Would need to fetch user info separately
            text: (message.text as string) || '',
            thread_ts: (message.thread_ts as string) || null,
            is_thread: !!message.thread_ts,
            reactions: (message.reactions as any) || [],
            attachments: (message.attachments as any) || [],
            posted_at: new Date(parseFloat(message.ts) * 1000).toISOString(),
          },
          {
            onConflict: 'integration_id,provider_message_id,channel_id',
          }
        )

        synced++
      }
    } catch (error) {
      console.error(`Error syncing channel ${channel.id}:`, error)
    }
  }

  return synced
}
