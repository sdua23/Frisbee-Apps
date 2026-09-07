'use client'

import { useFrisbee } from '@/lib/frisbee/store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PALETTE_COLORS } from '@/lib/frisbee/types'
import {
  MousePointer2,
  Shield,
  Swords,
  ArrowRight,
  Disc3,
  Trash2,
  Undo2,
  Redo2,
  Cone,
  Pen,
  Eraser,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toolbar() {
  const tool = useFrisbee((s) => s.tool)
  const setTool = useFrisbee((s) => s.setTool)
  const selectedCount = useFrisbee((s) => s.selectedPlayerIds.length + s.selectedConeIds.length)
  const removeSelected = useFrisbee((s) => s.removeSelected)
  const undo = useFrisbee((s) => s.undo)
  const redo = useFrisbee((s) => s.redo)
  const canUndo = useFrisbee((s) => s.past.length > 0)
  const canRedo = useFrisbee((s) => s.future.length > 0)
  const activeColor = useFrisbee((s) => s.activeColor)
  const setActiveColor = useFrisbee((s) => s.setActiveColor)

  // All tools including multi-place offense/defense. Delete is in this row too, so after
  // you multi-select items (via Select tool with shift-tap or marquee), one tap on Delete
  // removes them all.
  const tools = [
    { id: 'select' as const, label: 'Select & Move', icon: MousePointer2, kind: 'tool' as const },
    { id: 'arrow' as const, label: 'Draw Cut (Player Run)', icon: ArrowRight, kind: 'tool' as const },
    { id: 'disc' as const, label: 'Throw Disc / Assign Holder', icon: Disc3, kind: 'tool' as const },
    { id: 'cone' as const, label: 'Place Cone (drill marker) — tap field repeatedly', icon: Cone, kind: 'tool' as const },
    { id: 'place-offense' as const, label: 'Place Offense Players — tap field repeatedly', icon: Swords, color: 'text-sky-400', kind: 'tool' as const },
    { id: 'place-defense' as const, label: 'Place Defense X — tap field repeatedly', icon: Shield, color: 'text-red-400', kind: 'tool' as const },
    { id: 'pen' as const, label: 'Freehand Draw', icon: Pen, kind: 'tool' as const },
    { id: 'erase' as const, label: 'Erase strokes, cones, arrows', icon: Eraser, kind: 'tool' as const },
    { id: '__delete' as const, label: 'Delete selected items', icon: Trash2, kind: 'action' as const, color: 'text-destructive' },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-2 p-2 bg-card border-r border-border h-full overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Tools
        </div>
        {tools.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Button
                variant={tool === t.id ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-12 w-12',
                  tool === t.id && 'ring-2 ring-primary/40',
                  t.kind === 'action' && 'hover:bg-destructive/15',
                  t.kind === 'action' && selectedCount === 0 && 'opacity-30',
                )}
                disabled={t.kind === 'action' && selectedCount === 0}
                onClick={() => {
                  if (t.kind === 'action' && t.id === '__delete') {
                    removeSelected()
                  } else {
                    setTool(t.id as never)
                  }
                }}
              >
                <t.icon className={cn('h-5 w-5', t.color)} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t.label}
              {t.kind === 'action' && selectedCount > 0 ? ` (${selectedCount})` : ''}
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Selection count badge below the Delete button */}
        {selectedCount > 0 && (
          <div className="text-[10px] text-center text-muted-foreground -mt-1">
            {selectedCount} selected
          </div>
        )}

        <div className="my-1 border-t border-border" />

        {/* Color palette */}
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Color
        </div>
        <div className="grid grid-cols-2 gap-1.5 px-1">
          {PALETTE_COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Select color ${c}`}
              onClick={() => setActiveColor(c)}
              className={cn(
                'h-6 w-6 rounded-md border-2 transition-transform',
                activeColor === c
                  ? 'border-white scale-110 ring-2 ring-yellow-400'
                  : 'border-white/30 hover:border-white/60',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="my-1 border-t border-border" />

        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          History
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 disabled:opacity-30"
          disabled={!canUndo}
          onClick={() => undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 disabled:opacity-30"
          disabled={!canRedo}
          onClick={() => redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-5 w-5" />
        </Button>
      </div>
    </TooltipProvider>
  )
}
