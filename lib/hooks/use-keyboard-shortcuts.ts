import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category: 'navigation' | 'power' | 'general'
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const router = useRouter()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')
      ) {
        // Allow Escape and some special shortcuts even in inputs
        if (e.key !== 'Escape' && !(e.metaKey || e.ctrlKey)) {
          return
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase()
        
        // Check modifier keys
        const needsModifier = shortcut.ctrlKey || shortcut.metaKey
        const hasModifier = e.ctrlKey || e.metaKey
        
        // For shortcuts that need ctrl/meta, check if either is pressed
        // For shortcuts that don't need it, make sure neither is pressed
        const modifierMatch = needsModifier
          ? hasModifier && ((shortcut.ctrlKey && e.ctrlKey) || (shortcut.metaKey && e.metaKey))
          : !hasModifier
        
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey

        if (keyMatch && modifierMatch && shiftMatch && altMatch) {
          e.preventDefault()
          shortcut.action()
          break
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Default navigation shortcuts
export const defaultNavigationShortcuts = (router: ReturnType<typeof useRouter>): KeyboardShortcut[] => [
  {
    key: '1',
    metaKey: true,
    action: () => router.push('/'),
    description: 'Go to Chat',
    category: 'navigation',
  },
  {
    key: '2',
    metaKey: true,
    action: () => router.push('/notes'),
    description: 'Go to Notes',
    category: 'navigation',
  },
  {
    key: '3',
    metaKey: true,
    action: () => router.push('/recordings'),
    description: 'Go to Recordings',
    category: 'navigation',
  },
  {
    key: '4',
    metaKey: true,
    action: () => router.push('/tasks'),
    description: 'Go to Tasks',
    category: 'navigation',
  },
  {
    key: '5',
    metaKey: true,
    action: () => router.push('/goals'),
    description: 'Go to Goals',
    category: 'navigation',
  },
  {
    key: '6',
    metaKey: true,
    action: () => router.push('/reminders'),
    description: 'Go to Reminders',
    category: 'navigation',
  },
  {
    key: '7',
    metaKey: true,
    action: () => router.push('/calendar'),
    description: 'Go to Calendar',
    category: 'navigation',
  },
  {
    key: '8',
    metaKey: true,
    action: () => router.push('/integrations'),
    description: 'Go to Integrations',
    category: 'navigation',
  },
  {
    key: '9',
    metaKey: true,
    action: () => router.push('/insights'),
    description: 'Go to Insights',
    category: 'navigation',
  },
  {
    key: '0',
    metaKey: true,
    action: () => router.push('/admin'),
    description: 'Go to Admin',
    category: 'navigation',
  },
]

// Helper to format shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  if (shortcut.metaKey) parts.push('⌘')
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  parts.push(shortcut.key.toUpperCase())
  return parts.join(' + ')
}
