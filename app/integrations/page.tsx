'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
import {
  MessageSquare,
  FileText,
  Mic,
  Database,
  CheckSquare,
  Target,
  Bell,
  Calendar as CalendarIcon,
  Mail,
  Plug,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { GlobalSearch } from '@/components/search/global-search'
import { ReminderNotificationProvider } from '@/components/reminders/reminder-notification-provider'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface Integration {
  id: string
  provider: 'gmail' | 'outlook' | 'google_calendar' | 'slack'
  email: string | null
  name: string | null
  is_active: boolean
  last_sync_at: string | null
  sync_settings: any
  created_at: string
  updated_at: string
}

const PROVIDER_INFO = {
  gmail: {
    name: 'Gmail',
    icon: Mail,
    description: 'Sync your Gmail emails',
    color: 'bg-red-500',
  },
  outlook: {
    name: 'Outlook',
    icon: Mail,
    description: 'Sync your Outlook emails',
    color: 'bg-blue-500',
  },
  google_calendar: {
    name: 'Google Calendar',
    icon: CalendarIcon,
    description: 'Sync your Google Calendar events',
    color: 'bg-blue-600',
  },
  slack: {
    name: 'Slack',
    icon: MessageSquare,
    description: 'Sync your Slack messages',
    color: 'bg-purple-500',
  },
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [connecting, setConnecting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchIntegrations = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/integrations', {
          signal: abortController.signal,
        })
        if (response.ok) {
          const data = await response.json()
          setIntegrations(data.integrations || [])
        } else if (response.status === 401) {
          // User not authenticated, redirect to login
          window.location.href = '/login'
        }
      } catch (error: any) {
        // Ignore abort errors (they're expected when component unmounts)
        if (error.name === 'AbortError') {
          return
        }
        console.error('Error fetching integrations:', error)
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchIntegrations()

    return () => {
      abortController.abort()
    }
  }, [])

  const handleConnect = async (provider: string) => {
    if (connecting[provider]) {
      return // Prevent multiple clicks
    }

    try {
      setConnecting((prev) => ({ ...prev, [provider]: true }))
      console.log('Connecting to provider:', provider)
      
      // Get OAuth URL
      const redirectUri = `${window.location.origin}/integrations/callback?provider=${provider}`
      const url = `/api/integrations/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`
      console.log('Fetching OAuth URL from:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('OAuth response:', { status: response.status, data })
      
      if (response.ok && data.auth_url) {
        console.log('Redirecting to:', data.auth_url)
        // Redirect to OAuth provider
        window.location.href = data.auth_url
      } else {
        const errorMsg = data.error || 'Failed to initiate connection'
        console.error('OAuth error:', errorMsg)
        alert(`${errorMsg}. Please check your environment variables.`)
        setConnecting((prev) => ({ ...prev, [provider]: false }))
      }
    } catch (error) {
      console.error('Error connecting integration:', error)
      alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
      setConnecting((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const handleSync = async (integrationId: string) => {
    try {
      setSyncing((prev) => ({ ...prev, [integrationId]: true }))
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Sync completed! ${data.items_synced} items synced.`)
        fetchIntegrations() // Refresh to update last_sync_at
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || 'Sync failed. Please try again.')
      }
    } catch (error) {
      console.error('Error syncing:', error)
      alert('An error occurred during sync.')
    } finally {
      setSyncing((prev) => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setIntegrations(integrations.filter((i) => i.id !== integrationId))
      } else {
        alert('Failed to disconnect. Please try again.')
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('An error occurred. Please try again.')
    }
  }

  const handleToggleActive = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !integration.is_active,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIntegrations(
          integrations.map((i) => (i.id === integration.id ? data.integration : i))
        )
      }
    } catch (error) {
      console.error('Error toggling integration:', error)
    }
  }

  const connectedProviders = integrations.map((i) => i.provider)
  const availableProviders = Object.keys(PROVIDER_INFO) as Array<
    keyof typeof PROVIDER_INFO
  >

  return (
    <div className="flex h-screen">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">LifeOS</h1>
            <GlobalSearch />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav className="space-y-2">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </Button>
            </Link>
            <Link href="/notes">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Notes
              </Button>
            </Link>
            <Link href="/recordings">
              <Button variant="ghost" className="w-full justify-start">
                <Mic className="mr-2 h-4 w-4" />
                Recordings
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="ghost" className="w-full justify-start">
                <CheckSquare className="mr-2 h-4 w-4" />
                Tasks
              </Button>
            </Link>
            <Link href="/goals">
              <Button variant="ghost" className="w-full justify-start">
                <Target className="mr-2 h-4 w-4" />
                Goals
              </Button>
            </Link>
            <Link href="/reminders">
              <Button variant="ghost" className="w-full justify-start">
                <Bell className="mr-2 h-4 w-4" />
                Reminders
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="ghost" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendar
              </Button>
            </Link>
            <Link href="/integrations">
              <Button variant="default" className="w-full justify-start">
                <Plug className="mr-2 h-4 w-4" />
                Integrations
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="ghost" className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" />
                Insights
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <p className="text-xs text-muted-foreground px-4">
            Your Personal Chief of Staff
          </p>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 overflow-y-auto p-6">
        <ReminderNotificationProvider />
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-muted-foreground mt-2">
              Connect your email, calendar, and communication tools
            </p>
          </div>

          {/* Connected Integrations */}
          {integrations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Connected</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integration) => {
                  const providerInfo = PROVIDER_INFO[integration.provider]
                  const Icon = providerInfo.icon
                  const isSyncing = syncing[integration.id]

                  return (
                    <Card key={integration.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${providerInfo.color} text-white`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {providerInfo.name}
                              </CardTitle>
                              <CardDescription>
                                {integration.email || integration.name || 'Connected'}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {integration.is_active ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {integration.last_sync_at && (
                            <p className="text-sm text-muted-foreground">
                              Last synced:{' '}
                              {format(
                                new Date(integration.last_sync_at),
                                'MMM d, yyyy h:mm a'
                              )}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSync(integration.id)}
                              disabled={isSyncing}
                            >
                              <RefreshCw
                                className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`}
                              />
                              {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(integration)}
                            >
                              {integration.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisconnect(integration.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available Integrations */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {integrations.length > 0 ? 'Available' : 'Connect Your Services'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableProviders.map((provider) => {
                const providerInfo = PROVIDER_INFO[provider]
                const Icon = providerInfo.icon
                const isConnected = connectedProviders.includes(provider)

                return (
                  <Card
                    key={provider}
                    className={isConnected ? 'opacity-50' : 'cursor-pointer hover:shadow-lg transition-shadow'}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${providerInfo.color} text-white`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {providerInfo.name}
                          </CardTitle>
                          <CardDescription>
                            {providerInfo.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isConnected ? (
                        <Badge variant="secondary" className="w-full justify-center">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleConnect(provider)}
                          disabled={connecting[provider]}
                        >
                          {connecting[provider] ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Setup Instructions */}
          {integrations.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Connect your accounts to sync data into LifeOS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Environment Variables Required</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add these to your <code className="bg-muted px-1 rounded">.env.local</code> file:
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li><code>GOOGLE_CLIENT_ID</code> - For Gmail and Google Calendar</li>
                      <li><code>GOOGLE_CLIENT_SECRET</code> - For Gmail and Google Calendar</li>
                      <li><code>MICROSOFT_CLIENT_ID</code> - For Outlook</li>
                      <li><code>MICROSOFT_CLIENT_SECRET</code> - For Outlook</li>
                      <li><code>SLACK_CLIENT_ID</code> - For Slack</li>
                      <li><code>SLACK_CLIENT_SECRET</code> - For Slack</li>
                      <li><code>NEXT_PUBLIC_APP_URL</code> - Your app URL (e.g., http://localhost:3000)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">How It Works</h3>
                    <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                      <li>Click "Connect" on any service</li>
                      <li>Authorize LifeOS to access your account</li>
                      <li>Data will sync automatically</li>
                      <li>Use "Sync Now" to manually refresh</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
