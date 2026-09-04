'use client'

import { useFrisbee } from '@/lib/frisbee/store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Disc3, Trash2, Users, Cone as ConeIcon } from 'lucide-react'

export function SelectedPlayerCard() {
  const play = useFrisbee((s) => s.play)
  const selectedPlayerIds = useFrisbee((s) => s.selectedPlayerIds)
  const selectedConeIds = useFrisbee((s) => s.selectedConeIds)
  const updatePlayerLabel = useFrisbee((s) => s.updatePlayerLabel)
  const removeSelected = useFrisbee((s) => s.removeSelected)
  const setDiscHolder = useFrisbee((s) => s.setDiscHolder)
  const currentFrameIndex = useFrisbee((s) => s.currentFrameIndex)

  // Cone selection summary (when cones are selected, players are cleared)
  if (selectedConeIds.length > 0) {
    const selectedCones = play.cones.filter((c) => selectedConeIds.includes(c.id))
    return (
      <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-orange-400/20 flex items-center justify-center border border-orange-400/50">
            <ConeIcon className="h-4 w-4 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">
              {selectedCones.length} cone{selectedCones.length === 1 ? '' : 's'} selected
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Drag to move • Delete to remove
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedCones.slice(0, 12).map((c) => (
            <div
              key={c.id}
              className="h-5 w-5 rounded-sm border border-white/40"
              style={{ backgroundColor: c.color }}
              title="drill cone"
            />
          ))}
          {selectedCones.length > 12 && (
            <div className="h-5 px-1.5 rounded-sm bg-muted text-muted-foreground text-[10px] flex items-center">
              +{selectedCones.length - 12}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs w-full hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40"
          onClick={() => removeSelected()}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete {selectedCones.length} cone{selectedCones.length === 1 ? '' : 's'}
        </Button>
      </div>
    )
  }

  if (selectedPlayerIds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Click a player or cone, shift-click to add to selection, or drag a box on empty field to multi-select
      </div>
    )
  }

  if (selectedPlayerIds.length > 1) {
    // Multi-select summary
    const selected = play.players.filter((p) => selectedPlayerIds.includes(p.id))
    const offenseCount = selected.filter((p) => p.team === 'offense').length
    const defenseCount = selected.filter((p) => p.team === 'defense').length
    const currentFrame = play.keyframes[currentFrameIndex]
    const holdersInSelection = selected.filter((p) => p.id === currentFrame?.discHolderId).length

    return (
      <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-yellow-400/20 flex items-center justify-center border border-yellow-400/50">
            <Users className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{selected.length} players selected</div>
            <div className="flex gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-400">
                {offenseCount} offense
              </Badge>
              <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">
                {defenseCount} defense
              </Badge>
              {holdersInSelection > 0 && (
                <Badge variant="outline" className="text-[10px] border-orange-500/40 text-orange-400">
                  {holdersInSelection} w/ disc
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {selected.slice(0, 12).map((p) => (
            <div
              key={p.id}
              className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-white/40"
              style={{ backgroundColor: p.color }}
              title={p.label}
            >
              {p.label}
            </div>
          ))}
          {selected.length > 12 && (
            <div className="h-6 px-1.5 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center">
              +{selected.length - 12}
            </div>
          )}
        </div>

        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs flex-1 hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40"
            onClick={() => removeSelected()}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete All
          </Button>
        </div>
      </div>
    )
  }

  // Single selection - existing editor
  const playerId = selectedPlayerIds[0]
  const player = play.players.find((p) => p.id === playerId)
  if (!player) return null

  const currentFrame = play.keyframes[currentFrameIndex]
  const isHolder = currentFrame?.discHolderId === player.id

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/80"
          style={{ backgroundColor: player.color }}
        >
          {player.label}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{player.label}</div>
          <Badge
            variant="outline"
            className={
              player.team === 'offense'
                ? 'text-[10px] border-sky-500/40 text-sky-400'
                : 'text-[10px] border-red-500/40 text-red-400'
            }
          >
            {player.team}
          </Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="player-label" className="text-xs">Label</Label>
        <Input
          id="player-label"
          value={player.label}
          onChange={(e) => updatePlayerLabel(player.id, e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex gap-1.5">
        <button
          className={`flex-1 rounded-md border px-2 py-1.5 text-xs flex items-center justify-center gap-1.5 transition-colors ${
            isHolder
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
              : 'border-border hover:bg-accent/40 text-muted-foreground'
          }`}
          onClick={() => setDiscHolder(isHolder ? null : player.id)}
        >
          <Disc3 className="h-3.5 w-3.5" />
          {isHolder ? 'Has Disc' : 'Give Disc'}
        </button>
        <button
          className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40"
          onClick={() => removeSelected()}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
