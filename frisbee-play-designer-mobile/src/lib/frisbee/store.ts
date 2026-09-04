'use client'

import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Arrow, Cone, Keyframe, Play, Player, Stroke, Team, Tool, Vec2 } from './types'

const STORAGE_KEY = 'frisbee-plays-v2'
const HISTORY_LIMIT = 50

// Default colors for new players (cycle through these)
const OFFENSE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899']
// Defenders are all red X's — no color cycling needed, but we keep the field for compatibility
const DEFENSE_COLOR = '#ef4444'

// Default color for new cones (orange)
const DEFAULT_CONE_COLOR = '#f97316'
// Default stroke color (white)
const DEFAULT_STROKE_COLOR = '#ffffff'
const DEFAULT_STROKE_WIDTH = 4

interface Marquee {
  start: Vec2
  end: Vec2
  additive: boolean // shift was held — add to existing selection
}

interface FrisbeeState {
  // Play being edited
  play: Play

  // UI state
  tool: Tool
  // Multi-select: array of player ids. Empty = nothing selected.
  selectedPlayerIds: string[]
  // Multi-select for cones (drill markers). Independent from player selection.
  selectedConeIds: string[]
  // Index of the keyframe currently being edited/viewed
  currentFrameIndex: number
  // Animation progress 0..1 within current frame transition
  animProgress: number
  isPlaying: boolean
  playSpeed: number // 0.5, 1, 2
  // arrows currently being drawn (transient)
  drawingArrow: { kind: 'cut' | 'throw'; start: Vec2; end: Vec2 } | null
  // marquee selection box in progress (transient)
  marquee: Marquee | null
  // freehand stroke currently being drawn (transient)
  drawingStroke: { color: string; width: number; points: Vec2[] } | null

  // Active color for drawing (cones, pen, arrows)
  activeColor: string
  // Active stroke width for the pen tool
  activeStrokeWidth: number

  // Stylus-only mode: when true, ignore touch pointers so palm doesn't draw
  stylusOnly: boolean

  // Undo / redo history — each entry snapshots the play AND the current frame index
  past: { play: Play; frameIndex: number }[]
  future: { play: Play; frameIndex: number }[]

  // Saved plays in localStorage
  savedPlays: { id: string; name: string; updatedAt: number }[]

  // Actions
  setTool: (t: Tool) => void
  selectPlayer: (id: string, opts?: { additive?: boolean }) => void
  setSelection: (ids: string[]) => void
  togglePlayerInSelection: (id: string) => void
  clearSelection: () => void
  selectAll: () => void
  // Cone selection (independent from players)
  selectCone: (id: string, opts?: { additive?: boolean }) => void
  setConeSelection: (ids: string[]) => void
  moveCone: (id: string, pos: Vec2) => void
  moveSelectedConesByDelta: (delta: Vec2) => void
  setCurrentFrame: (i: number) => void
  setAnimProgress: (p: number) => void
  setPlaying: (p: boolean) => void
  setPlaySpeed: (s: number) => void
  setDrawingArrow: (a: FrisbeeState['drawingArrow']) => void
  setDrawingStroke: (s: FrisbeeState['drawingStroke']) => void
  setMarquee: (m: Marquee | null) => void
  setActiveColor: (c: string) => void
  setActiveStrokeWidth: (w: number) => void
  setStylusOnly: (b: boolean) => void

  // History
  pushHistory: () => void
  beginInteraction: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Player actions
  addPlayer: (team: Team) => void
  addPlayerAt: (team: Team, pos: Vec2) => void
  removePlayer: (id: string) => void
  removeSelected: () => void
  updatePlayerLabel: (id: string, label: string) => void
  movePlayer: (id: string, pos: Vec2) => void
  moveSelectedByDelta: (delta: Vec2) => void

  // Keyframe actions
  addKeyframe: () => void
  updateKeyframeNote: (id: string, note: string) => void
  removeKeyframe: (index: number) => void
  setDiscHolder: (playerId: string | null) => void

  // Arrow actions
  commitArrow: (kind: 'cut' | 'throw', start: Vec2, end: Vec2) => void
  removeArrowsForFrame: (frameIndex: number) => void
  removeArrow: (id: string) => void

  // Cone actions
  addCone: (pos: Vec2) => void
  removeCone: (id: string) => void
  coneAt: (vec: Vec2) => string | null

  // Stroke actions
  startStroke: (pos: Vec2) => void
  appendStrokePoint: (pos: Vec2) => void
  commitStroke: () => void
  cancelStroke: () => void
  removeStroke: (id: string) => void
  strokeAt: (vec: Vec2) => string | null

  // Play management
  newPlay: () => void
  renamePlay: (name: string) => void
  savePlay: () => void
  loadPlay: (id: string) => void
  deletePlay: (id: string) => void
  exportPlay: () => string
  importPlay: (json: string) => void
  refreshSavedPlays: () => void
}

function makePlayer(team: Team, existing: Player[]): Player {
  const sameTeam = existing.filter((p) => p.team === team)
  const idx = sameTeam.length
  const color = team === 'offense'
    ? OFFENSE_COLORS[idx % OFFENSE_COLORS.length]
    : DEFENSE_COLOR
  return {
    id: uuid(),
    team,
    // Defense uses "X1", "X2", ... per user spec (rendered as an X shape + digit)
    label: team === 'offense' ? `${idx + 1}` : `X${idx + 1}`,
    color,
  }
}

// Empty starting play — user adds players, cones, etc. via toolbar buttons
function createEmptyPlay(): Play {
  const firstFrame: Keyframe = {
    id: uuid(),
    positions: {},
    discHolderId: null,
    note: 'Setup',
  }

  return {
    id: uuid(),
    name: 'Untitled Play',
    players: [],
    keyframes: [firstFrame],
    arrows: [],
    cones: [],
    strokes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function loadSavedPlaysList(): { id: string; name: string; updatedAt: number }[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, Play>
    return Object.values(all)
      .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function saveOnePlay(play: Play) {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEY)
  const all = raw ? (JSON.parse(raw) as Record<string, Play>) : {}
  all[play.id] = { ...play, updatedAt: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

function loadOnePlay(id: string): Play | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const all = JSON.parse(raw) as Record<string, Play>
  return all[id] ?? null
}

function deleteOnePlay(id: string) {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const all = JSON.parse(raw) as Record<string, Play>
  delete all[id]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// Deep clone a Play (snapshots for history)
function clonePlay(p: Play): Play {
  return JSON.parse(JSON.stringify(p))
}

// Hit-test helpers (used by canvas)
function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export const useFrisbee = create<FrisbeeState>((set, get) => ({
  play: createEmptyPlay(),
  tool: 'select',
  selectedPlayerIds: [],
  selectedConeIds: [],
  currentFrameIndex: 0,
  animProgress: 0,
  isPlaying: false,
  playSpeed: 1,
  drawingArrow: null,
  marquee: null,
  drawingStroke: null,
  activeColor: DEFAULT_STROKE_COLOR,
  activeStrokeWidth: DEFAULT_STROKE_WIDTH,
  stylusOnly: false,
  past: [],
  future: [],
  savedPlays: [],

  setTool: (t) =>
    set({
      tool: t,
      selectedPlayerIds: t === 'select' ? get().selectedPlayerIds : [],
      selectedConeIds: t === 'select' ? get().selectedConeIds : [],
      marquee: null,
      drawingStroke: null,
      drawingArrow: null,
    }),

  selectPlayer: (id, opts) => {
    const additive = opts?.additive
    const cur = get().selectedPlayerIds
    if (additive) {
      if (cur.includes(id)) {
        set({ selectedPlayerIds: cur.filter((x) => x !== id) })
      } else {
        set({ selectedPlayerIds: [...cur, id] })
      }
    } else {
      if (!cur.includes(id)) {
        // Replacing selection — also clear cone selection
        set({ selectedPlayerIds: [id], selectedConeIds: [] })
      }
    }
  },

  setSelection: (ids) => set({ selectedPlayerIds: ids, selectedConeIds: [] }),
  togglePlayerInSelection: (id) => {
    const cur = get().selectedPlayerIds
    if (cur.includes(id)) {
      set({ selectedPlayerIds: cur.filter((x) => x !== id) })
    } else {
      set({ selectedPlayerIds: [...cur, id] })
    }
  },
  clearSelection: () => set({ selectedPlayerIds: [], selectedConeIds: [] }),
  selectAll: () => {
    const play = get().play
    set({ selectedPlayerIds: play.players.map((p) => p.id), selectedConeIds: [] })
  },

  // Cone selection — when selecting a cone, clear player selection (and vice versa)
  selectCone: (id, opts) => {
    const additive = opts?.additive
    const cur = get().selectedConeIds
    if (additive) {
      if (cur.includes(id)) {
        set({ selectedConeIds: cur.filter((x) => x !== id) })
      } else {
        set({ selectedConeIds: [...cur, id] })
      }
    } else {
      if (!cur.includes(id)) {
        set({ selectedConeIds: [id], selectedPlayerIds: [] })
      }
    }
  },
  setConeSelection: (ids) => set({ selectedConeIds: ids, selectedPlayerIds: [] }),

  moveCone: (id, pos) => {
    // No history push — caller should call beginInteraction() at drag start
    const play = get().play
    const cones = play.cones.map((c) => (c.id === id ? { ...c, pos } : c))
    set({ play: { ...play, cones, updatedAt: Date.now() } })
  },

  moveSelectedConesByDelta: (delta) => {
    const play = get().play
    const ids = get().selectedConeIds
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const cones = play.cones.map((c) => {
      if (!idSet.has(c.id)) return c
      return {
        ...c,
        pos: {
          x: Math.max(2, Math.min(98, c.pos.x + delta.x)),
          y: Math.max(2, Math.min(98, c.pos.y + delta.y)),
        },
      }
    })
    set({ play: { ...play, cones, updatedAt: Date.now() } })
  },

  setCurrentFrame: (i) => set({ currentFrameIndex: i, animProgress: 0 }),
  setAnimProgress: (p) => set({ animProgress: Math.max(0, Math.min(1, p)) }),
  setPlaying: (p) => set({ isPlaying: p }),
  setPlaySpeed: (s) => set({ playSpeed: s }),
  setDrawingArrow: (a) => set({ drawingArrow: a }),
  setDrawingStroke: (s) => set({ drawingStroke: s }),
  setMarquee: (m) => set({ marquee: m }),
  setActiveColor: (c) => set({ activeColor: c }),
  setActiveStrokeWidth: (w) => set({ activeStrokeWidth: w }),
  setStylusOnly: (b) => set({ stylusOnly: b }),

  pushHistory: () => {
    const { play, past, currentFrameIndex } = get()
    const newPast = [...past, { play: clonePlay(play), frameIndex: currentFrameIndex }]
    if (newPast.length > HISTORY_LIMIT) newPast.shift()
    set({ past: newPast, future: [] })
  },
  beginInteraction: () => get().pushHistory(),

  undo: () => {
    const { past, future, play, currentFrameIndex } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      future: [{ play: clonePlay(play), frameIndex: currentFrameIndex }, ...future].slice(0, HISTORY_LIMIT),
      play: previous.play,
      currentFrameIndex: Math.min(previous.frameIndex, previous.play.keyframes.length - 1),
      selectedPlayerIds: get().selectedPlayerIds.filter((id) =>
        previous.play.players.some((p) => p.id === id),
      ),
      isPlaying: false,
      animProgress: 0,
    })
  },

  redo: () => {
    const { past, future, play, currentFrameIndex } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      past: [...past, { play: clonePlay(play), frameIndex: currentFrameIndex }].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      play: next.play,
      currentFrameIndex: Math.min(next.frameIndex, next.play.keyframes.length - 1),
      selectedPlayerIds: get().selectedPlayerIds.filter((id) =>
        next.play.players.some((p) => p.id === id),
      ),
      isPlaying: false,
      animProgress: 0,
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addPlayer: (team) => {
    get().pushHistory()
    const play = get().play
    const player = makePlayer(team, play.players)
    // Add to all keyframes at a default position (near center for offense, opposite side for defense)
    const keyframes = play.keyframes.map((kf) => {
      const newPos = { ...kf.positions }
      // Stagger new players vertically so they don't overlap
      const teamPlayers = play.players.filter((p) => p.team === team)
      const idx = teamPlayers.length
      const yBase = 20 + (idx % 5) * 15
      newPos[player.id] =
        team === 'offense'
          ? { x: 35, y: yBase }
          : { x: 65, y: yBase }
      return { ...kf, positions: newPos }
    })
    set({
      play: { ...play, players: [...play.players, player], keyframes, updatedAt: Date.now() },
      selectedPlayerIds: [player.id],
    })
  },

  // Place a new player at a specific position — used by the place-offense / place-defense tools.
  // Player is added to the current keyframe at the tapped location.
  // Does NOT switch the tool, so the user can keep placing more players.
  addPlayerAt: (team, pos) => {
    get().pushHistory()
    const play = get().play
    const player = makePlayer(team, play.players)
    // Clamp position to canvas bounds (with margin so the player isn't half-off-screen)
    const clampedPos = {
      x: Math.max(3, Math.min(97, pos.x)),
      y: Math.max(3, Math.min(97, pos.y)),
    }
    // Add to all keyframes so the player exists across the entire animation timeline
    const keyframes = play.keyframes.map((kf) => ({
      ...kf,
      positions: { ...kf.positions, [player.id]: clampedPos },
    }))
    set({
      play: { ...play, players: [...play.players, player], keyframes, updatedAt: Date.now() },
      selectedPlayerIds: [player.id],
      selectedConeIds: [],
    })
  },

  removePlayer: (id) => {
    get().pushHistory()
    const play = get().play
    const players = play.players.filter((p) => p.id !== id)
    const keyframes = play.keyframes.map((kf) => {
      const positions = { ...kf.positions }
      delete positions[id]
      const discHolderId = kf.discHolderId === id ? null : kf.discHolderId
      return { ...kf, positions, discHolderId }
    })
    set({
      play: { ...play, players, keyframes, updatedAt: Date.now() },
      selectedPlayerIds: [],
    })
  },

  removeSelected: () => {
    const ids = get().selectedPlayerIds
    const coneIds = get().selectedConeIds
    if (ids.length === 0 && coneIds.length === 0) return
    get().pushHistory()
    const play = get().play
    const idSet = new Set(ids)
    const coneSet = new Set(coneIds)
    const players = play.players.filter((p) => !idSet.has(p.id))
    const cones = play.cones.filter((c) => !coneSet.has(c.id))
    const keyframes = play.keyframes.map((kf) => {
      const positions: Record<string, Vec2> = {}
      for (const [pid, pos] of Object.entries(kf.positions)) {
        if (!idSet.has(pid)) positions[pid] = pos
      }
      const discHolderId = kf.discHolderId && idSet.has(kf.discHolderId) ? null : kf.discHolderId
      return { ...kf, positions, discHolderId }
    })
    set({
      play: { ...play, players, cones, keyframes, updatedAt: Date.now() },
      selectedPlayerIds: [],
      selectedConeIds: [],
    })
  },

  updatePlayerLabel: (id, label) => {
    get().pushHistory()
    const play = get().play
    const players = play.players.map((p) =>
      p.id === id ? { ...p, label } : p,
    )
    set({ play: { ...play, players, updatedAt: Date.now() } })
  },

  movePlayer: (id, pos) => {
    const play = get().play
    const frameIdx = get().currentFrameIndex
    const keyframes = play.keyframes.map((kf, i) => {
      if (i !== frameIdx) return kf
      return { ...kf, positions: { ...kf.positions, [id]: pos } }
    })
    set({ play: { ...play, keyframes, updatedAt: Date.now() } })
  },

  moveSelectedByDelta: (delta) => {
    const play = get().play
    const frameIdx = get().currentFrameIndex
    const ids = get().selectedPlayerIds
    if (ids.length === 0) return
    const keyframes = play.keyframes.map((kf, i) => {
      if (i !== frameIdx) return kf
      const positions: Record<string, Vec2> = { ...kf.positions }
      for (const id of ids) {
        const cur = positions[id]
        if (cur) {
          positions[id] = {
            x: Math.max(2, Math.min(98, cur.x + delta.x)),
            y: Math.max(2, Math.min(98, cur.y + delta.y)),
          }
        }
      }
      return { ...kf, positions }
    })
    set({ play: { ...play, keyframes, updatedAt: Date.now() } })
  },

  addKeyframe: () => {
    get().pushHistory()
    const play = get().play
    const current = play.keyframes[get().currentFrameIndex]
    if (!current) return
    const newFrame: Keyframe = {
      id: uuid(),
      positions: JSON.parse(JSON.stringify(current.positions)),
      discHolderId: current.discHolderId,
      note: `Frame ${play.keyframes.length + 1}`,
    }
    const keyframes = [...play.keyframes, newFrame]
    set({
      play: { ...play, keyframes, updatedAt: Date.now() },
      currentFrameIndex: keyframes.length - 1,
      animProgress: 0,
      isPlaying: false,
    })
  },

  updateKeyframeNote: (id, note) => {
    const play = get().play
    const keyframes = play.keyframes.map((kf) =>
      kf.id === id ? { ...kf, note } : kf,
    )
    set({ play: { ...play, keyframes, updatedAt: Date.now() } })
  },

  removeKeyframe: (index) => {
    const play = get().play
    if (play.keyframes.length <= 1) return
    get().pushHistory()
    const keyframes = play.keyframes.filter((_, i) => i !== index)
    const arrows = play.arrows.filter((a) => a.frameIndex !== index)
    const reindexed = arrows.map((a) => ({
      ...a,
      frameIndex: a.frameIndex > index ? a.frameIndex - 1 : a.frameIndex,
    }))
    const newIdx = Math.min(get().currentFrameIndex, keyframes.length - 1)
    set({
      play: { ...play, keyframes, arrows: reindexed, updatedAt: Date.now() },
      currentFrameIndex: newIdx,
      animProgress: 0,
      isPlaying: false,
    })
  },

  setDiscHolder: (playerId) => {
    get().pushHistory()
    const play = get().play
    const frameIdx = get().currentFrameIndex
    const keyframes = play.keyframes.map((kf, i) =>
      i === frameIdx ? { ...kf, discHolderId: playerId } : kf,
    )
    set({ play: { ...play, keyframes, updatedAt: Date.now() } })
  },

  commitArrow: (kind, start, end) => {
    get().pushHistory()
    const play = get().play
    const frameIdx = get().currentFrameIndex
    const arrow: Arrow = {
      id: uuid(),
      frameIndex: frameIdx,
      kind,
      start,
      end,
      color: get().activeColor,
    }
    set({
      play: { ...play, arrows: [...play.arrows, arrow], updatedAt: Date.now() },
      drawingArrow: null,
    })
  },

  removeArrowsForFrame: (frameIndex) => {
    get().pushHistory()
    const play = get().play
    set({
      play: { ...play, arrows: play.arrows.filter((a) => a.frameIndex !== frameIndex), updatedAt: Date.now() },
    })
  },

  removeArrow: (id) => {
    get().pushHistory()
    const play = get().play
    set({
      play: { ...play, arrows: play.arrows.filter((a) => a.id !== id), updatedAt: Date.now() },
    })
  },

  addCone: (pos) => {
    get().pushHistory()
    const play = get().play
    const cone: Cone = {
      id: uuid(),
      pos,
      color: get().activeColor === '#ffffff' ? DEFAULT_CONE_COLOR : get().activeColor,
    }
    set({
      play: { ...play, cones: [...play.cones, cone], updatedAt: Date.now() },
    })
  },

  removeCone: (id) => {
    get().pushHistory()
    const play = get().play
    set({
      play: { ...play, cones: play.cones.filter((c) => c.id !== id), updatedAt: Date.now() },
    })
  },

  coneAt: (vec) => {
    const play = get().play
    // Hit radius ~3% of canvas
    for (const c of play.cones) {
      if (dist(c.pos, vec) < 3) return c.id
    }
    return null
  },

  startStroke: (pos) => {
    set({
      drawingStroke: {
        color: get().activeColor,
        width: get().activeStrokeWidth,
        points: [pos],
      },
    })
  },

  appendStrokePoint: (pos) => {
    const cur = get().drawingStroke
    if (!cur) return
    // Throttle: don't add points too close to the last one (< 0.5% of canvas)
    const last = cur.points[cur.points.length - 1]
    if (last && dist(last, pos) < 0.5) return
    set({ drawingStroke: { ...cur, points: [...cur.points, pos] } })
  },

  commitStroke: () => {
    const cur = get().drawingStroke
    if (!cur || cur.points.length < 2) {
      set({ drawingStroke: null })
      return
    }
    get().pushHistory()
    const play = get().play
    const stroke: Stroke = {
      id: uuid(),
      color: cur.color,
      width: cur.width,
      points: cur.points,
    }
    set({
      play: { ...play, strokes: [...play.strokes, stroke], updatedAt: Date.now() },
      drawingStroke: null,
    })
  },

  cancelStroke: () => set({ drawingStroke: null }),

  removeStroke: (id) => {
    get().pushHistory()
    const play = get().play
    set({
      play: { ...play, strokes: play.strokes.filter((s) => s.id !== id), updatedAt: Date.now() },
    })
  },

  strokeAt: (vec) => {
    const play = get().play
    // Hit-test: distance from tap to any point in any stroke (< 2.5% of canvas)
    for (const s of play.strokes) {
      for (const p of s.points) {
        if (dist(p, vec) < 2.5) return s.id
      }
    }
    return null
  },

  newPlay: () => {
    set({
      play: createEmptyPlay(),
      tool: 'select',
      selectedPlayerIds: [],
      selectedConeIds: [],
      currentFrameIndex: 0,
      animProgress: 0,
      isPlaying: false,
      drawingArrow: null,
      marquee: null,
      drawingStroke: null,
      past: [],
      future: [],
    })
  },

  renamePlay: (name) => {
    const play = get().play
    set({ play: { ...play, name, updatedAt: Date.now() } })
  },

  savePlay: () => {
    const play = get().play
    saveOnePlay(play)
    set({ savedPlays: loadSavedPlaysList() })
  },

  loadPlay: (id) => {
    const loaded = loadOnePlay(id)
    if (!loaded) return
    set({
      play: loaded,
      currentFrameIndex: 0,
      animProgress: 0,
      isPlaying: false,
      selectedPlayerIds: [],
      selectedConeIds: [],
      drawingArrow: null,
      marquee: null,
      drawingStroke: null,
      tool: 'select',
      past: [],
      future: [],
    })
  },

  deletePlay: (id) => {
    deleteOnePlay(id)
    set({ savedPlays: loadSavedPlaysList() })
  },

  exportPlay: () => {
    return JSON.stringify(get().play, null, 2)
  },

  importPlay: (json) => {
    try {
      const parsed = JSON.parse(json) as Play
      if (!parsed.players || !parsed.keyframes) throw new Error('Invalid play JSON')
      // Backfill new fields for older exports
      if (!parsed.cones) parsed.cones = []
      if (!parsed.strokes) parsed.strokes = []
      set({
        play: { ...parsed, updatedAt: Date.now() },
        currentFrameIndex: 0,
        animProgress: 0,
        isPlaying: false,
        selectedPlayerIds: [],
        selectedConeIds: [],
        drawingArrow: null,
        marquee: null,
        drawingStroke: null,
        tool: 'select',
        past: [],
        future: [],
      })
    } catch (e) {
      console.error('Failed to import play', e)
    }
  },

  refreshSavedPlays: () => {
    set({ savedPlays: loadSavedPlaysList() })
  },
}))
