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
  const stylusOnly = useFrisbee((s) => s.stylusOnly)
  const setStylusOnly = useFrisbee((s) => s.setStylusOnly)

  // All tools including the multi-place offense/defense tools.
  // Tapping the icon activates the tool; tapping the field places a player at the tapped spot.
  // The tool stays active so you can keep tapping to place more.
  const tools = [
    { id: 'select' as const, label: 'Select & Move', icon: MousePointer2 },
    { id: 'arrow' as const, label: 'Draw Cut (Player Run)', icon: ArrowRight },
    { id: 'disc' as const, label: 'Throw Disc / Assign Holder', icon: Disc3 },
    { id: 'cone' as const, label: 'Place Cone (drill marker) — tap field repeatedly', icon: Cone },
    { id: 'place-offense' as const, label: 'Place Offense Players — tap field repeatedly', icon: Swords, color: 'text-sky-400' },
    { id: 'place-defense' as const, label: 'Place Defense X — tap field repeatedly', icon: Shield, color: 'text-red-400' },
    { id: 'pen' as const, label: 'Freehand Draw', icon: Pen },
    { id: 'erase' as const, label: 'Erase strokes, cones, arrows', icon: Eraser },
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
                )}
                onClick={() => setTool(t.id)}
              >
                <t.icon className={cn('h-5 w-5', t.color)} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t.label}</TooltipContent>
          </Tooltip>
        ))}

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

        <div className="my-1 border-t border-border" />

        {/* Stylus-only toggle */}
        <button
          onClick={() => setStylusOnly(!stylusOnly)}
          className={cn(
            'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-[10px] font-medium',
            stylusOnly
              ? 'bg-primary/15 border-primary/50 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent/40',
          )}
          title="When ON, touch is ignored so your palm doesn't draw while using the stylus"
        >
          <span>Stylus only</span>
          <span className={cn('h-2 w-2 rounded-full', stylusOnly ? 'bg-primary' : 'bg-muted-foreground/40')} />
        </button>

        <div className="my-1 border-t border-border" />

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 hover:bg-destructive/15 hover:text-destructive disabled:opacity-30"
          disabled={selectedCount === 0}
          onClick={() => removeSelected()}
          title="Delete Selected"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        {selectedCount > 0 && (
          <div className="text-[10px] text-center text-muted-foreground -mt-1">
            {selectedCount} selected
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
