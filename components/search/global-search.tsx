'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Search,
  FileText,
  Mic,
  Database,
  CheckSquare,
  X,
  Calendar,
  Tag as TagIcon,
  Filter,
} from 'lucide-react'
import Link from 'next/link'
import { SearchResult } from '@/app/api/search/route'

interface Tag {
  id: string
  name: string
  color: string
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [allTags, setAllTags] = useState<Tag[]>([])

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const performSearch = async () => {
    if (!query.trim() && typeFilter === 'all' && categoryFilter === 'all' && tagFilter === 'all' && !dateFrom && !dateTo) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.append('q', query.trim())
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (tagFilter !== 'all') params.append('tag_id', tagFilter)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const response = await fetch(`/api/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
      }
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch()
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [query, typeFilter, categoryFilter, tagFilter, dateFrom, dateTo])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <FileText className="h-4 w-4" />
      case 'recording':
        return <Mic className="h-4 w-4" />
      case 'memory':
        return <Database className="h-4 w-4" />
      case 'task':
        return <CheckSquare className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'note':
        return 'bg-blue-100 text-blue-800'
      case 'recording':
        return 'bg-purple-100 text-purple-800'
      case 'memory':
        return 'bg-green-100 text-green-800'
      case 'task':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getResultUrl = (result: SearchResult) => {
    switch (result.type) {
      case 'note':
        return `/notes`
      case 'recording':
        return `/recordings`
      case 'task':
        return `/tasks`
      case 'memory':
        return `/admin?tab=memories`
      default:
        return '/'
    }
  }

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false)
    // Store the result ID in sessionStorage so the target page can scroll to it
    sessionStorage.setItem(`selected_${result.type}`, result.id)
  }

  const clearFilters = () => {
    setTypeFilter('all')
    setCategoryFilter('all')
    setTagFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(true)}
        title="Search (⌘K)"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <DialogTitle className="text-lg">Search</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col px-6 pt-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search notes, recordings, memories, tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10 h-12 text-base"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>

            {/* Filters Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8"
              >
                <Filter className="mr-2 h-3.5 w-3.5" />
                <span className="text-sm">Filters</span>
                {(typeFilter !== 'all' ||
                  categoryFilter !== 'all' ||
                  tagFilter !== 'all' ||
                  dateFrom ||
                  dateTo) && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                    Active
                  </span>
                )}
              </Button>
              {showFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  Clear
                </Button>
              )}
            </div>

            {/* Filters */}
            {showFilters && (
              <Card className="border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="note">Notes</SelectItem>
                          <SelectItem value="recording">Recordings</SelectItem>
                          <SelectItem value="memory">Memories</SelectItem>
                          <SelectItem value="task">Tasks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Category</Label>
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tag</Label>
                      <Select value={tagFilter} onValueChange={setTagFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tags</SelectItem>
                          {allTags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Date From</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Date To</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2 pb-6">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-current mb-2"></div>
                  <p className="text-sm">Searching...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {query || showFilters
                      ? 'No results found'
                      : 'Start typing to search across all your content...'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-3 px-1">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </div>
                  {results.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={getResultUrl(result)}
                      onClick={() => handleResultClick(result)}
                    >
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-transparent hover:border-border">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-1.5 rounded-md ${getTypeColor(result.type)} shrink-0`}
                            >
                              {getTypeIcon(result.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium text-sm truncate">
                                  {result.title}
                                </h4>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${getTypeColor(result.type)} shrink-0`}
                                >
                                  {result.type}
                                </span>
                                {result.category && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground shrink-0">
                                    {result.category}
                                  </span>
                                )}
                              </div>
                              {result.content && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {result.content}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {result.tags && result.tags.length > 0 && (
                                  <>
                                    {result.tags.map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                        style={{ backgroundColor: tag.color }}
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  </>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(
                                    result.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
