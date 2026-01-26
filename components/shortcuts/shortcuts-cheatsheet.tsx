'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KeyboardShortcut, formatShortcut } from '@/lib/hooks/use-keyboard-shortcuts'
import { Keyboard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShortcutsCheatsheetProps {
  shortcuts: KeyboardShortcut[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ShortcutsCheatsheet({
  shortcuts,
  open: controlledOpen,
  onOpenChange,
}: ShortcutsCheatsheetProps) {
  const [isOpen, setIsOpen] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : isOpen
  const setOpen = onOpenChange || setIsOpen

  // Keyboard shortcut to open cheatsheet (Cmd+? or Ctrl+?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '?') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  const navigationShortcuts = shortcuts.filter((s) => s.category === 'navigation')
  const powerShortcuts = shortcuts.filter((s) => s.category === 'power')
  const generalShortcuts = shortcuts.filter((s) => s.category === 'general')

  const groupByCategory = (shortcuts: KeyboardShortcut[]) => {
    const grouped: Record<string, KeyboardShortcut[]> = {}
    shortcuts.forEach((shortcut) => {
      const category = shortcut.category
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(shortcut)
    })
    return grouped
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="Keyboard Shortcuts (⌘?)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Keyboard className="h-5 w-5" />
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="navigation" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="navigation">Navigation</TabsTrigger>
              <TabsTrigger value="power">Power User</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="navigation" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Quick Navigation</h3>
                    <div className="space-y-2">
                      {navigationShortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {shortcut.description}
                            </div>
                          </div>
                          <kbd className="inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
                            {formatShortcut(shortcut)}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="power" className="space-y-4">
                <div className="space-y-4">
                  {powerShortcuts.length > 0 ? (
                    <div>
                      <h3 className="font-semibold mb-3">Power User Features</h3>
                      <div className="space-y-2">
                        {powerShortcuts.map((shortcut, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {shortcut.description}
                              </div>
                            </div>
                            <kbd className="inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
                              {formatShortcut(shortcut)}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No power user shortcuts available</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="general" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">General Shortcuts</h3>
                    <div className="space-y-2">
                      {generalShortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {shortcut.description}
                            </div>
                          </div>
                          <kbd className="inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
                            {formatShortcut(shortcut)}
                          </kbd>
                        </div>
                      ))}
                      {/* Always show search shortcut */}
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-sm">Open Search</div>
                        </div>
                        <kbd className="inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
                          ⌘K
                        </kbd>
                      </div>
                      {/* Always show shortcuts cheatsheet shortcut */}
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-sm">Show Keyboard Shortcuts</div>
                        </div>
                        <kbd className="inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
                          ⌘?
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
