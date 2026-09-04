'use client'

import { Toolbar } from '@/components/frisbee/Toolbar'
import { FieldCanvas } from '@/components/frisbee/FieldCanvas'
import { Timeline } from '@/components/frisbee/Timeline'
import { SelectedPlayerCard } from '@/components/frisbee/SelectedPlayerCard'
import { usePlayback } from '@/components/frisbee/usePlayback'
import { useKeyboardShortcuts } from '@/components/frisbee/useKeyboardShortcuts'
import { useFrisbee } from '@/lib/frisbee/store'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'

type PanelKind = 'tools' | 'timeline' | null

export default function Home() {
  usePlayback()
  useKeyboardShortcuts()
  const refreshSavedPlays = useFrisbee((s) => s.refreshSavedPlays)
  const [panel, setPanel] = useState<PanelKind>(null)

  useEffect(() => {
    refreshSavedPlays()
  }, [refreshSavedPlays])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 text-foreground">
      {/* Compact header */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
            <div className="h-4 w-4 rounded-full bg-emerald-50/90 ring-2 ring-emerald-950/50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-none truncate">Frisbee Play Designer</h1>
            <p className="text-[9px] text-muted-foreground mt-0.5 hidden sm:block">
              Draw • Animate • Drill
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 px-2 text-xs"
            onClick={() => setPanel(panel === 'tools' ? null : 'tools')}
            aria-pressed={panel === 'tools'}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
            Tools
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 px-2 text-xs"
            onClick={() => setPanel(panel === 'timeline' ? null : 'timeline')}
            aria-pressed={panel === 'timeline'}
          >
            {panel === 'timeline' ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
            Panel
          </Button>
        </div>
      </header>

      {/* Main — single FieldCanvas + responsive overlays */}
      <main className="flex-1 min-h-0 relative">
        {/* Always-mounted field canvas (fills entire main on mobile, with side panels on desktop via padding) */}
        <div className="absolute inset-0 lg:inset-x-[68px] lg:right-[340px]">
          <FieldCanvas />
        </div>

        {/* Desktop left tools sidebar */}
        <aside className="hidden lg:flex absolute inset-y-0 left-0 z-10 w-[68px] border-r border-border bg-card">
          <Toolbar />
        </aside>

        {/* Desktop right timeline + selected player */}
        <aside className="hidden lg:flex absolute inset-y-0 right-0 z-10 w-[340px] flex-col border-l border-border bg-card">
          <div className="flex-1 min-h-0 overflow-hidden">
            <Timeline />
          </div>
          <div className="border-t border-border bg-card/40 p-3 max-h-[40vh] overflow-y-auto">
            <SelectedPlayerCard />
          </div>
        </aside>

        {/* Mobile overlay: tools */}
        {panel === 'tools' && (
          <div className="lg:hidden absolute inset-y-0 left-0 z-20 w-[280px] max-w-[85vw] bg-card border-r border-border shadow-2xl flex flex-col">
            <div className="h-full overflow-y-auto">
              <Toolbar />
            </div>
            <button
              onClick={() => setPanel(null)}
              className="absolute top-2 right-2 h-9 w-9 rounded-md bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:bg-background text-lg"
              aria-label="Close tools"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mobile overlay: timeline */}
        {panel === 'timeline' && (
          <div className="lg:hidden absolute inset-y-0 right-0 z-20 w-[320px] max-w-[85vw] bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <Timeline />
            </div>
            <div className="border-t border-border bg-card/40 p-3 max-h-[35vh] overflow-y-auto">
              <SelectedPlayerCard />
            </div>
            <button
              onClick={() => setPanel(null)}
              className="absolute top-2 left-2 h-9 w-9 rounded-md bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:bg-background text-lg"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mobile backdrop */}
        {panel && (
          <div
            className="lg:hidden absolute inset-0 bg-black/40 z-10"
            onClick={() => setPanel(null)}
          />
        )}
      </main>
    </div>
  )
}
