/**
 * Browser notification utilities
 */

export interface NotificationResult {
  success: boolean
  error?: string
  permission?: NotificationPermission
}

export async function requestNotificationPermission(): Promise<NotificationResult> {
  try {
    if (!('Notification' in window)) {
      const error = 'This browser does not support notifications'
      console.error('[Notifications]', error)
      return { success: false, error, permission: 'denied' }
    }

    const currentPermission = Notification.permission
    console.log('[Notifications] Current permission:', currentPermission)

    if (currentPermission === 'granted') {
      console.log('[Notifications] Permission already granted')
      return { success: true, permission: 'granted' }
    }

    if (currentPermission === 'denied') {
      const error = 'Notification permission was previously denied. Please enable it in your browser settings.'
      console.error('[Notifications]', error)
      return { success: false, error, permission: 'denied' }
    }

    // Permission is 'default', request it
    console.log('[Notifications] Requesting permission...')
    const permission = await Notification.requestPermission()
    console.log('[Notifications] Permission result:', permission)

    if (permission === 'granted') {
      console.log('[Notifications] Permission granted successfully')
      return { success: true, permission: 'granted' }
    } else {
      const error = `Permission ${permission}. User needs to allow notifications.`
      console.warn('[Notifications]', error)
      return { success: false, error, permission }
    }
  } catch (error) {
    const errorMessage = `Error requesting notification permission: ${error instanceof Error ? error.message : String(error)}`
    console.error('[Notifications]', errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<NotificationResult> {
  try {
    console.log('[Notifications] Attempting to show notification:', title)
    
    const permissionResult = await requestNotificationPermission()

    if (!permissionResult.success) {
      console.error('[Notifications] Cannot show notification:', permissionResult.error)
      return permissionResult
    }

    // Create notification with enhanced options
    const notificationOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'lifeos-reminder',
      requireInteraction: true, // Keep notification visible until user interacts
      silent: false, // Enable sound
      ...options,
    }

    console.log('[Notifications] Creating notification with options:', notificationOptions)
    const notification = new Notification(title, notificationOptions)

    // Play sound if available (browser may block this)
    try {
      // Create a simple beep sound using Web Audio API
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      if (AudioContextClass) {
        const audioContext = new AudioContextClass()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800 // Higher pitch
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
        
        console.log('[Notifications] Sound played successfully')
      }
    } catch (soundError) {
      console.warn('[Notifications] Could not play sound:', soundError)
      // Continue without sound - notification will still show
    }

    // Auto-close after 30 seconds (increased from 5)
    const timeoutId = setTimeout(() => {
      notification.close()
      console.log('[Notifications] Notification auto-closed after 30 seconds')
    }, 30000)

    notification.onclick = () => {
      console.log('[Notifications] Notification clicked')
      window.focus()
      notification.close()
      clearTimeout(timeoutId)
    }

    notification.onerror = (error) => {
      console.error('[Notifications] Notification error:', error)
    }

    notification.onshow = () => {
      console.log('[Notifications] Notification shown successfully')
    }

    notification.onclose = () => {
      console.log('[Notifications] Notification closed')
      clearTimeout(timeoutId)
    }

    return { success: true, permission: 'granted' }
  } catch (error) {
    const errorMessage = `Error showing notification: ${error instanceof Error ? error.message : String(error)}`
    console.error('[Notifications]', errorMessage, error)
    return { success: false, error: errorMessage }
  }
}

export function isNotificationSupported(): boolean {
  const supported = 'Notification' in window
  console.log('[Notifications] Browser support:', supported)
  return supported
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  const permission = Notification.permission
  console.log('[Notifications] Current permission status:', permission)
  return permission
}

/**
 * Test notification function for manual testing
 */
export async function testNotification(): Promise<NotificationResult> {
  console.log('[Notifications] Testing notification...')
  return await showNotification('Test Notification', {
    body: 'If you see this, browser notifications are working correctly!',
    tag: 'test-notification',
  })
}
