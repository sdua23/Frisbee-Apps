'use client'

import { useFrisbee } from '@/lib/frisbee/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Plus,
  Trash2,
  Gauge,
  Save,
  FolderOpen,
  FilePlus2,
  Download,
  Upload,
  Film,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRef, useState } from 'react'
import { exportPlayToGif, downloadBlob, type GifProgress } from '@/lib/frisbee/exportGif'

export function Timeline() {
  const play = useFrisbee((s) => s.play)
  const currentFrameIndex = useFrisbee((s) => s.currentFrameIndex)
  const animProgress = useFrisbee((s) => s.animProgress)
  const isPlaying = useFrisbee((s) => s.isPlaying)
  const playSpeed = useFrisbee((s) => s.playSpeed)

  const setCurrentFrame = useFrisbee((s) => s.setCurrentFrame)
  const setAnimProgress = useFrisbee((s) => s.setAnimProgress)
  const setPlaying = useFrisbee((s) => s.setPlaying)
  const setPlaySpeed = useFrisbee((s) => s.setPlaySpeed)
  const addKeyframe = useFrisbee((s) => s.addKeyframe)
  const removeKeyframe = useFrisbee((s) => s.removeKeyframe)
  const updateKeyframeNote = useFrisbee((s) => s.updateKeyframeNote)
  const removeArrowsForFrame = useFrisbee((s) => s.removeArrowsForFrame)

  const totalFrames = play.keyframes.length
  const isLastFrame = currentFrameIndex >= totalFrames - 1

  // Total scrub progress across all frames (0..1)
  const totalProgress =
    totalFrames <= 1
      ? 0
      : (currentFrameIndex + animProgress) / (totalFrames - 1)

  function onScrub(value: number) {
    // value is 0..1
    if (totalFrames <= 1) return
    const scaled = value * (totalFrames - 1)
    const frame = Math.floor(scaled)
    const within = scaled - frame
    setCurrentFrame(frame)
    setAnimProgress(within)
  }

  return (
    <div className="flex flex-col gap-3 p-3 bg-card border-l border-border h-full overflow-y-auto">
      {/* Animation controls */}
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Playback
          </span>
          <Badge variant="secondary" className="text-[10px]">
            Frame {currentFrameIndex + 1} / {totalFrames}
          </Badge>
        </div>

        <div className="flex items-center justify-center gap-1 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentFrame(0)}
            disabled={isPlaying}
            title="Jump to start"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentFrame(Math.max(0, currentFrameIndex - 1))}
            disabled={isPlaying || currentFrameIndex === 0}
            title="Previous frame"
          >
            <Square className="h-3.5 w-3.5 rotate-180" />
          </Button>
          <Button
            variant={isPlaying ? 'default' : 'default'}
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => {
              if (isLastFrame && !isPlaying) {
                // Restart from beginning
                setCurrentFrame(0)
                setAnimProgress(0)
                setPlaying(true)
              } else {
                setPlaying(!isPlaying)
              }
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))}
            disabled={isPlaying || isLastFrame}
            title="Next frame"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              setPlaying(false)
              setCurrentFrame(totalFrames - 1)
            }}
            disabled={isLastFrame}
            title="Jump to end"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Total scrubber */}
        <div className="px-1 mb-3">
          <Slider
            value={[totalProgress * 100]}
            max={100}
            step={0.5}
            onValueChange={(v) => onScrub(v[0] / 100)}
            disabled={isPlaying}
          />
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span>Speed</span>
          </div>
          <div className="flex gap-1">
            {[0.5, 1, 2].map((s) => (
              <Button
                key={s}
                variant={playSpeed === s ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPlaySpeed(s)}
              >
                {s}×
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframes list */}
      <div className="rounded-lg border border-border bg-background/40 p-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Keyframes
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addKeyframe}
            title="Capture current positions as a new keyframe"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5 min-h-0">
          {play.keyframes.map((kf, i) => {
            const isActive = i === currentFrameIndex
            const arrowCount = play.arrows.filter((a) => a.frameIndex === i).length
            return (
              <div
                key={kf.id}
                className={cn(
                  'group rounded-md border p-2 cursor-pointer transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40 hover:bg-accent/40',
                )}
                onClick={() => {
                  setPlaying(false)
                  setCurrentFrame(i)
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </div>
                  <Input
                    value={kf.note ?? ''}
                    placeholder={`Frame ${i + 1}`}
                    onChange={(e) => updateKeyframeNote(kf.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary/30 px-1"
                  />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {arrowCount > 0 && (
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeArrowsForFrame(i)
                        }}
                        title="Clear arrows on this frame"
                      >
                        {arrowCount} arrows ✕
                      </button>
                    )}
                    {play.keyframes.length > 1 && (
                      <button
                        className="text-muted-foreground hover:text-destructive p-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeKeyframe(i)
                        }}
                        title="Delete keyframe"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {kf.discHolderId && (
                  <div className="mt-1 ml-8 text-[10px] text-orange-400">
                    disc → {play.players.find((p) => p.id === kf.discHolderId)?.label ?? '?'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <PlayManager />
    </div>
  )
}

function PlayManager() {
  const play = useFrisbee((s) => s.play)
  const savedPlays = useFrisbee((s) => s.savedPlays)
  const renamePlay = useFrisbee((s) => s.renamePlay)
  const savePlay = useFrisbee((s) => s.savePlay)
  const loadPlay = useFrisbee((s) => s.loadPlay)
  const deletePlay = useFrisbee((s) => s.deletePlay)
  const newPlay = useFrisbee((s) => s.newPlay)
  const exportPlay = useFrisbee((s) => s.exportPlay)
  const importPlay = useFrisbee((s) => s.importPlay)
  const refreshSavedPlays = useFrisbee((s) => s.refreshSavedPlays)

  const [showSaved, setShowSaved] = useState(false)
  const [gifProgress, setGifProgress] = useState<GifProgress | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Snapshot the play object at the start of GIF export so user edits during
  // encoding don't bleed into the output
  const handleExportGif = async () => {
    if (gifProgress) return
    const snapshot = JSON.parse(JSON.stringify(play)) as typeof play
    try {
      const blob = await exportPlayToGif(snapshot, setGifProgress)
      const safeName = play.name.replace(/[^a-z0-9_-]+/gi, '_') || 'play'
      downloadBlob(blob, `${safeName}.gif`)
    } catch (e) {
      console.error('GIF export failed', e)
      alert('Sorry, GIF export failed. Please try again.')
    } finally {
      // Brief delay so user sees 100% before clearing
      setTimeout(() => setGifProgress(null), 600)
    }
  }

  const gifEncoding = gifProgress?.phase === 'encoding'
  const gifPct =
    gifProgress && gifProgress.total > 0
      ? Math.round((gifProgress.current / gifProgress.total) * 100)
      : 0

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Play
        </span>
      </div>

      <Input
        value={play.name}
        onChange={(e) => renamePlay(e.target.value)}
        placeholder="Play name"
        className="h-8 text-sm mb-2"
      />

      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => newPlay()}>
          <FilePlus2 className="h-3.5 w-3.5 mr-1" /> New
        </Button>
        <Button variant="default" size="sm" className="h-8 text-xs" onClick={() => savePlay()}>
          <Save className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            refreshSavedPlays()
            setShowSaved((v) => !v)
          }}
        >
          <FolderOpen className="h-3.5 w-3.5 mr-1" /> Load
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            const json = exportPlay()
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${play.name.replace(/[^a-z0-9_-]+/gi, '_')}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> JSON
        </Button>
      </div>

      {/* Export GIF — full animated render */}
      <Button
        variant="default"
        size="sm"
        className="h-9 text-xs w-full mt-1.5 bg-orange-500 hover:bg-orange-600 text-white"
        onClick={handleExportGif}
        disabled={gifEncoding}
      >
        {gifEncoding ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            Rendering… {gifPct}%
          </>
        ) : (
          <>
            <Film className="h-3.5 w-3.5 mr-1.5" />
            Export Animated GIF
          </>
        )}
      </Button>
      {gifEncoding && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-orange-500 transition-all duration-100"
            style={{ width: `${gifPct}%` }}
          />
        </div>
      )}
      {!gifEncoding && (
        <p className="mt-1 text-[10px] text-muted-foreground leading-snug">
          Renders the full play at 1× speed as a looping GIF (15 fps). Disc flight &amp; movement animate automatically.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            importPlay(String(reader.result))
          }
          reader.readAsText(file)
          e.target.value = ''
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs w-full mt-1.5"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5 mr-1" /> Import JSON
      </Button>

      {showSaved && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border bg-background">
          {savedPlays.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground text-center">
              No saved plays yet
            </div>
          )}
          {savedPlays.map((p) => (
            <div
              key={p.id}
              className="group flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-accent/40 border-b border-border last:border-0"
            >
              <button
                className="flex-1 text-left text-xs truncate"
                onClick={() => {
                  loadPlay(p.id)
                  setShowSaved(false)
                }}
              >
                {p.name}
              </button>
              <button
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => deletePlay(p.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
