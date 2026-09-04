// Frisbee play designer types — Android / stylus edition

export type Team = 'offense' | 'defense'

// Tools available in the toolbar
// - select: drag players / marquee
// - arrow: dashed cut arrow (player movement)
// - disc: throw arrow + tap to assign disc holder
// - cone: tap to place a drill cone (multi-place)
// - pen: freehand drawing
// - erase: tap strokes/cones/arrows to delete
// - place-offense: tap field to place offense players (multi-place)
// - place-defense: tap field to place defense X's (multi-place)
export type Tool = 'select' | 'arrow' | 'disc' | 'cone' | 'pen' | 'erase' | 'place-offense' | 'place-defense'

export interface Player {
  id: string
  team: Team
  label: string
  color: string
}

export interface Vec2 {
  x: number // 0-100 (percentage of canvas width)
  y: number // 0-100 (percentage of canvas height)
}

export interface Keyframe {
  id: string
  // positions of all players at this frame, keyed by playerId
  positions: Record<string, Vec2>
  // which player holds the disc at this frame (null = disc in transition)
  discHolderId: string | null
  // optional label/notes
  note?: string
}

// An arrow annotation - drawn at a specific keyframe transition (from frame i to i+1)
// Path stays visible while this frame is active during animation
export interface Arrow {
  id: string
  // which keyframe this arrow belongs to (visually shows when that frame is active)
  frameIndex: number
  // 'cut' = player movement (dashed), 'throw' = disc path (solid orange)
  kind: 'cut' | 'throw'
  start: Vec2
  end: Vec2
  color: string
}

// A drill cone — static marker, always visible (not tied to a keyframe)
export interface Cone {
  id: string
  pos: Vec2
  color: string
}

// A freehand stroke — always visible (not tied to a keyframe)
export interface Stroke {
  id: string
  color: string
  width: number // in canvas pixels (e.g. 3)
  points: Vec2[]  // 0..100 percentage coordinates
}

export interface Play {
  id: string
  name: string
  players: Player[]
  keyframes: Keyframe[]
  arrows: Arrow[]
  cones: Cone[]
  strokes: Stroke[]
  createdAt: number
  updatedAt: number
}

// Color palette options for drawing
export const PALETTE_COLORS = [
  '#ffffff', // white
  '#fde047', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#0f172a', // near-black
] as const

export type PaletteColor = (typeof PALETTE_COLORS)[number]
