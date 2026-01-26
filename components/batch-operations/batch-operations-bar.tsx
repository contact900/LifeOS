'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Tag, Download, FolderOpen, X } from 'lucide-react'
import { TagFilter } from '@/components/tags/tag-filter'

interface BatchOperationsBarProps {
  selectedIds: string[]
  resourceType: 'note' | 'recording' | 'task' | 'goal' | 'event'
  onClearSelection: () => void
  onBulkDelete: (ids: string[]) => Promise<void>
  onBulkTag?: (ids: string[], tagId: string) => Promise<void>
  onBulkExport?: (ids: string[]) => Promise<void>
  onBulkCategoryChange?: (ids: string[], category: string) => Promise<void>
  availableCategories?: { id: string; name: string }[]
}

export function BatchOperationsBar({
  selectedIds,
  resourceType,
  onClearSelection,
  onBulkDelete,
  onBulkTag,
  onBulkExport,
  onBulkCategoryChange,
  availableCategories,
}: BatchOperationsBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [processing, setProcessing] = useState(false)

  if (selectedIds.length === 0) {
    return null
  }

  const handleBulkDelete = async () => {
    setProcessing(true)
    try {
      await onBulkDelete(selectedIds)
      setDeleteDialogOpen(false)
      onClearSelection()
    } catch (error) {
      console.error('Error deleting items:', error)
      alert('Failed to delete items. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkTag = async () => {
    if (!selectedTagId || !onBulkTag) return
    setProcessing(true)
    try {
      await onBulkTag(selectedIds, selectedTagId)
      setTagDialogOpen(false)
      setSelectedTagId(null)
      onClearSelection()
    } catch (error) {
      console.error('Error tagging items:', error)
      alert('Failed to tag items. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkCategoryChange = async () => {
    if (!selectedCategory || !onBulkCategoryChange) return
    setProcessing(true)
    try {
      await onBulkCategoryChange(selectedIds, selectedCategory)
      setCategoryDialogOpen(false)
      setSelectedCategory('')
      onClearSelection()
    } catch (error) {
      console.error('Error changing category:', error)
      alert('Failed to change category. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkExport = async () => {
    if (!onBulkExport) return
    setProcessing(true)
    try {
      await onBulkExport(selectedIds)
    } catch (error) {
      console.error('Error exporting items:', error)
      alert('Failed to export items. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="border-b bg-muted/50 p-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {onBulkDelete && (
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={processing}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''}?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Are you sure you want to delete {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''}?
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={processing}
                >
                  {processing ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {onBulkTag && (
          <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={processing}>
                <Tag className="h-4 w-4 mr-1" />
                Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Tag to {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Tag
                  </label>
                  <TagFilter
                    resourceType={resourceType}
                    selectedTagId={selectedTagId}
                    onTagChange={setSelectedTagId}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTagDialogOpen(false)}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkTag}
                    disabled={processing || !selectedTagId || selectedTagId === 'all'}
                  >
                    {processing ? 'Tagging...' : 'Add Tag'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {onBulkExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkExport}
            disabled={processing}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        )}
        {onBulkCategoryChange && availableCategories && (
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={processing}>
                <FolderOpen className="h-4 w-4 mr-1" />
                Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Category for {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Category
                  </label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCategoryDialogOpen(false)}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkCategoryChange}
                    disabled={processing || !selectedCategory}
                  >
                    {processing ? 'Updating...' : 'Change Category'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
