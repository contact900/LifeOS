'use client'

import { GlobalSearch } from '@/components/search/global-search'
import { ShortcutsCheatsheet } from '@/components/shortcuts/shortcuts-cheatsheet'
import { KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'

interface SidebarHeaderWithShortcutsProps {
  shortcuts: KeyboardShortcut[]
}

export function SidebarHeaderWithShortcuts({ shortcuts }: SidebarHeaderWithShortcutsProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold">LifeOS</h1>
      <div className="flex items-center gap-1">
        <GlobalSearch />
        <ShortcutsCheatsheet shortcuts={shortcuts} />
      </div>
    </div>
  )
}
