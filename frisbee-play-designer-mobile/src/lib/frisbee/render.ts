'use client'

import type { Arrow, Cone, Keyframe, Player, Stroke, Vec2 } from './types'

// VERTICAL FIELD — canvas is 600 wide x 900 tall (2:3 portrait)
// End zones are at the top (15%) and bottom (15%)
// Brick marks are near the top/bottom (30% / 70% from top)

export interface RenderState {
  players: Player[]
  positions: Record<string, Vec2>
  discHolderId: string | null
  discPos: Vec2 | null
  visibleArrows: Arrow[]
  cones: Cone[]
  strokes: Stroke[]
  drawingStroke: { color: string; width: number; points: Vec2[] } | null
  selectedPlayerIds: string[]
  isAnimating: boolean
}

// Vertical field dimensions (in canvas pixels)
export const FIELD_W = 600
export const FIELD_H = 900

const END_ZONE_HEIGHT_PCT = 0.15 // 15% of height top + 15% bottom = end zones

export function drawField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  // Grass background with subtle gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#15803d')
  grad.addColorStop(0.5, '#16a34a')
  grad.addColorStop(1, '#15803d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Mowing stripes (horizontal — since field is vertical)
  const stripes = 12
  const stripeH = h / stripes
  for (let i = 0; i < stripes; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
      ctx.fillRect(0, i * stripeH, w, stripeH)
    }
  }

  // End zones (top and bottom)
  const endZoneH = h * END_ZONE_HEIGHT_PCT
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.fillRect(0, 0, w, endZoneH)
  ctx.fillRect(0, h - endZoneH, w, endZoneH)

  // Field boundary
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, w - 4, h - 4)

  // End zone lines (horizontal)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, endZoneH)
  ctx.lineTo(w, endZoneH)
  ctx.moveTo(0, h - endZoneH)
  ctx.lineTo(w, h - endZoneH)
  ctx.stroke()

  // Brick marks (in each end zone area, ~30% / 70% from top, centered horizontally)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.lineWidth = 2
  const brickTop = h * 0.30
  const brickBot = h * 0.70
  ctx.beginPath()
  ctx.moveTo(w / 2 - 8, brickTop)
  ctx.lineTo(w / 2 + 8, brickTop)
  ctx.moveTo(w / 2 - 8, brickBot)
  ctx.lineTo(w / 2 + 8, brickBot)
  ctx.stroke()

  // Center horizontal line (half-field)
  ctx.setLineDash([6, 6])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.beginPath()
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // End zone labels (rotated to read top-down)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '600 13px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(w / 2, endZoneH / 2)
  ctx.fillText('END ZONE', 0, 0)
  ctx.restore()
  ctx.save()
  ctx.translate(w / 2, h - endZoneH / 2)
  ctx.fillText('END ZONE', 0, 0)
  ctx.restore()
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  headLen: number,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()
}

export function drawArrows(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  arrows: Arrow[],
  progress: number,
) {
  for (const a of arrows) {
    const sx = (a.start.x / 100) * w
    const sy = (a.start.y / 100) * h
    const ex = (a.end.x / 100) * w
    const ey = (a.end.y / 100) * h

    if (a.kind === 'cut') {
      // Dashed movement arrow — uses arrow color (defaults to white)
      ctx.strokeStyle = a.color
      ctx.fillStyle = a.color
      ctx.lineWidth = 2.5
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      ctx.setLineDash([])
      drawArrowHead(ctx, sx, sy, ex, ey, 10)
    } else {
      // Throw — STRAIGHT LINE (linear flight, not parabolic)
      const t = Math.max(0.001, Math.min(1, progress))
      const drawEx = sx + (ex - sx) * t
      const drawEy = sy + (ey - sy) * t
      ctx.strokeStyle = a.color === '#ffffff' ? '#f97316' : a.color
      ctx.fillStyle = ctx.strokeStyle
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(drawEx, drawEy)
      ctx.stroke()
      if (t > 0.95) {
        drawArrowHead(ctx, sx, sy, ex, ey, 11)
      }
    }
  }
}

export function drawCones(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cones: Cone[],
  selectedConeIds: string[] = [],
) {
  const selectedSet = new Set(selectedConeIds)
  for (const c of cones) {
    const px = (c.pos.x / 100) * w
    const py = (c.pos.y / 100) * h
    // Cone: orange triangle with small base
    const size = 14
    // Selection ring (drawn before the cone so the cone sits on top)
    if (selectedSet.has(c.id)) {
      ctx.beginPath()
      ctx.arc(px, py, size + 6, 0, Math.PI * 2)
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    ctx.save()
    ctx.translate(px, py)
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
    ctx.beginPath()
    ctx.moveTo(0, -size + 2)
    ctx.lineTo(size * 0.7, size * 0.6 + 2)
    ctx.lineTo(-size * 0.7, size * 0.6 + 2)
    ctx.closePath()
    ctx.fill()
    // Cone body
    ctx.fillStyle = c.color
    ctx.beginPath()
    ctx.moveTo(0, -size)
    ctx.lineTo(size * 0.7, size * 0.6)
    ctx.lineTo(-size * 0.7, size * 0.6)
    ctx.closePath()
    ctx.fill()
    // White stripe
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.moveTo(-size * 0.4, size * 0.05)
    ctx.lineTo(size * 0.4, size * 0.05)
    ctx.lineTo(size * 0.5, size * 0.25)
    ctx.lineTo(-size * 0.5, size * 0.25)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokes: Stroke[],
) {
  for (const s of strokes) {
    if (s.points.length < 2) continue
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const first = s.points[0]
    ctx.moveTo((first.x / 100) * w, (first.y / 100) * h)
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i]
      ctx.lineTo((p.x / 100) * w, (p.y / 100) * h)
    }
    ctx.stroke()
  }
}

export function drawDrawingStroke(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stroke: { color: string; width: number; points: Vec2[] },
) {
  if (stroke.points.length < 1) return
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const first = stroke.points[0]
  ctx.moveTo((first.x / 100) * w, (first.y / 100) * h)
  for (let i = 1; i < stroke.points.length; i++) {
    const p = stroke.points[i]
    ctx.lineTo((p.x / 100) * w, (p.y / 100) * h)
  }
  // Even a single point should be visible as a dot
  if (stroke.points.length === 1) {
    ctx.lineTo((first.x / 100) * w + 0.1, (first.y / 100) * h + 0.1)
  }
  ctx.stroke()
}

// Draw a defender as an X shape with a label
function drawDefender(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  label: string,
  color: string,
  isSelected: boolean,
  hasDisc: boolean,
) {
  const r = 16 // half-size of the X — matches offense circle radius for visual parity
  // Selection ring
  if (isSelected) {
    ctx.beginPath()
    ctx.arc(px, py, r + 6, 0, Math.PI * 2)
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  // Disc halo (dashed orange)
  if (hasDisc) {
    ctx.beginPath()
    ctx.arc(px, py, r + 4, 0, Math.PI * 2)
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])
  }
  // X shape — two diagonal lines
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(px - r, py - r)
  ctx.lineTo(px + r, py + r)
  ctx.moveTo(px + r, py - r)
  ctx.lineTo(px - r, py + r)
  ctx.stroke()
  // Label — number to the upper-right of the X
  // Extract the digit part from label like "X1" → "1"
  const digit = label.replace(/^X/i, '')
  ctx.fillStyle = color
  ctx.font = '700 14px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(digit, px + r + 4, py - r + 2)
}

// Draw an offensive player as a colored circle with a number
function drawOffense(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  label: string,
  color: string,
  isSelected: boolean,
  hasDisc: boolean,
) {
  const r = 16
  // Selection ring
  if (isSelected) {
    ctx.beginPath()
    ctx.arc(px, py, r + 6, 0, Math.PI * 2)
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  // Disc halo
  if (hasDisc) {
    ctx.beginPath()
    ctx.arc(px, py, r + 4, 0, Math.PI * 2)
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])
  }
  // Player circle
  ctx.beginPath()
  ctx.arc(px, py, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 2
  ctx.stroke()
  // Label (the digit)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 14px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, px, py)
}

export function drawPlayers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: RenderState,
) {
  const selectedSet = new Set(state.selectedPlayerIds)
  for (const p of state.players) {
    const pos = state.positions[p.id]
    if (!pos) continue
    const px = (pos.x / 100) * w
    const py = (pos.y / 100) * h
    const isSelected = selectedSet.has(p.id)
    const hasDisc = state.discHolderId === p.id
    if (p.team === 'defense') {
      drawDefender(ctx, px, py, p.label, p.color, isSelected, hasDisc)
    } else {
      drawOffense(ctx, px, py, p.label, p.color, isSelected, hasDisc)
    }
  }
}

export function drawMarquee(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  start: Vec2,
  end: Vec2,
) {
  const sx = (Math.min(start.x, end.x) / 100) * w
  const sy = (Math.min(start.y, end.y) / 100) * h
  const ex = (Math.max(start.x, end.x) / 100) * w
  const ey = (Math.max(start.y, end.y) / 100) * h
  const rw = ex - sx
  const rh = ey - sy
  if (rw < 1 && rh < 1) return
  ctx.fillStyle = 'rgba(253, 224, 71, 0.15)'
  ctx.fillRect(sx, sy, rw, rh)
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.9)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 3])
  ctx.strokeRect(sx, sy, rw, rh)
  ctx.setLineDash([])
}

export function drawDisc(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: RenderState,
) {
  if (state.discPos) {
    const px = (state.discPos.x / 100) * w
    const py = (state.discPos.y / 100) * h
    // Disc - orange ellipse (frisbee viewed from above)
    ctx.save()
    ctx.translate(px, py)
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.ellipse(2, 4, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    // Disc body
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#7c2d12'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  }
}

export function drawDrawingArrow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  start: Vec2,
  end: Vec2,
  kind: 'cut' | 'throw',
  color: string,
) {
  const sx = (start.x / 100) * w
  const sy = (start.y / 100) * h
  const ex = (end.x / 100) * w
  const ey = (end.y / 100) * h
  if (kind === 'cut') {
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.setLineDash([8, 6])
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // Throw — straight line preview (no arc)
    ctx.strokeStyle = color === '#ffffff' ? '#f97316' : color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }
}

// Interpolate between two keyframes for animation
// Disc flight is LINEAR (per user request — no parabolic arc)
export function interpolate(
  from: Keyframe,
  to: Keyframe,
  t: number,
): { positions: Record<string, Vec2>; discHolderId: string | null; discInTransit: boolean; throwProgress: number } {
  const positions: Record<string, Vec2> = {}
  const allIds = new Set([...Object.keys(from.positions), ...Object.keys(to.positions)])
  for (const id of allIds) {
    const a = from.positions[id]
    const b = to.positions[id]
    if (a && b) {
      positions[id] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    } else if (a) {
      positions[id] = a
    } else if (b) {
      positions[id] = b
    }
  }

  // Disc handling — LINEAR flight (no arc)
  const fromId = from.discHolderId
  const toId = to.discHolderId

  if (fromId === toId) {
    return { positions, discHolderId: fromId, discInTransit: false, throwProgress: 0 }
  }

  // Different holders - throw in transit
  if (t < 0.2) {
    return { positions, discHolderId: fromId, discInTransit: false, throwProgress: 0 }
  }
  if (t > 0.8) {
    return { positions, discHolderId: toId, discInTransit: false, throwProgress: 1 }
  }
  // 0.2 < t < 0.8: in flight (linear)
  const flightT = (t - 0.2) / 0.6
  return {
    positions,
    discHolderId: null,
    discInTransit: true,
    throwProgress: flightT,
  }
}
