'use client'

import { useEffect } from 'react'
import { useFrisbee } from '@/lib/frisbee/store'

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable
}

export function useKeyboardShortcuts() {
  const undo = useFrisbee((s) => s.undo)
  const redo = useFrisbee((s) => s.redo)
  const removeSelected = useFrisbee((s) => s.removeSelected)
  const clearSelection = useFrisbee((s) => s.clearSelection)
  const selectAll = useFrisbee((s) => s.selectAll)
  const selectedCount = useFrisbee((s) => s.selectedPlayerIds.length)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if user is typing in an input/textarea
      if (isEditableTarget(e.target)) return

      const mod = e.ctrlKey || e.metaKey

      // Undo: Ctrl/Cmd+Z (no shift)
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      // Redo: Ctrl/Cmd+Shift+Z OR Ctrl/Cmd+Y
      if ((mod && e.key.toLowerCase() === 'z' && e.shiftKey) ||
          (mod && e.key.toLowerCase() === 'y')) {
        e.preventDefault()
        redo()
        return
      }
      // Select all: Ctrl/Cmd+A
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        selectAll()
        return
      }
      // Delete selected: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCount > 0) {
        e.preventDefault()
        removeSelected()
        return
      }
      // Escape: clear selection
      if (e.key === 'Escape') {
        e.preventDefault()
        clearSelection()
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, removeSelected, clearSelection, selectAll, selectedCount])
}
