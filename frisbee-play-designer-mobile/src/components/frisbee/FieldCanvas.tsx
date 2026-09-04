'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useFrisbee } from '@/lib/frisbee/store'
import {
  drawArrows,
  drawCones,
  drawDisc,
  drawDrawingArrow,
  drawDrawingStroke,
  drawField,
  drawMarquee,
  drawPlayers,
  drawStrokes,
  interpolate,
  FIELD_W,
  FIELD_H,
  type RenderState,
} from '@/lib/frisbee/render'
import type { Arrow, Vec2 } from '@/lib/frisbee/types'

// Convert a clientX/clientY position to a 0-100 canvas coordinate.
// IMPORTANT: getBoundingClientRect() returns the BORDER box (includes the 2px canvas border).
// The canvas internal drawing area is the CONTENT box (excluding border), so we must
// subtract the border width from both the offset and the dimensions. Without this fix,
// clicks near the edges are offset by a few percent — most noticeable at top/bottom of the field.
function toVec(clientX: number, clientY: number, rect: DOMRect, borderLeft = 0, borderTop = 0, borderRight = 0, borderBottom = 0): Vec2 {
  const contentLeft = rect.left + borderLeft
  const contentTop = rect.top + borderTop
  const contentWidth = rect.width - borderLeft - borderRight
  const contentHeight = rect.height - borderTop - borderBottom
  // Guard against divide-by-zero (canvas not laid out yet)
  const w = contentWidth > 0 ? contentWidth : rect.width
  const h = contentHeight > 0 ? contentHeight : rect.height
  return {
    x: ((clientX - contentLeft) / w) * 100,
    y: ((clientY - contentTop) / h) * 100,
  }
}

// Convenience wrapper that reads the canvas's border widths from computed style.
function toVecFromEvent(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Vec2 {
  const rect = canvas.getBoundingClientRect()
  const cs = getComputedStyle(canvas)
  const bl = parseFloat(cs.borderLeftWidth) || 0
  const bt = parseFloat(cs.borderTopWidth) || 0
  const br = parseFloat(cs.borderRightWidth) || 0
  const bb = parseFloat(cs.borderBottomWidth) || 0
  return toVec(e.clientX, e.clientY, rect, bl, bt, br, bb)
}

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const play = useFrisbee((s) => s.play)
  const tool = useFrisbee((s) => s.tool)
  const selectedPlayerIds = useFrisbee((s) => s.selectedPlayerIds)
  const selectedConeIds = useFrisbee((s) => s.selectedConeIds)
  const currentFrameIndex = useFrisbee((s) => s.currentFrameIndex)
  const animProgress = useFrisbee((s) => s.animProgress)
  const isPlaying = useFrisbee((s) => s.isPlaying)
  const drawingArrow = useFrisbee((s) => s.drawingArrow)
  const drawingStroke = useFrisbee((s) => s.drawingStroke)
  const marquee = useFrisbee((s) => s.marquee)
  const activeColor = useFrisbee((s) => s.activeColor)
  const stylusOnly = useFrisbee((s) => s.stylusOnly)

  const selectPlayer = useFrisbee((s) => s.selectPlayer)
  const setSelection = useFrisbee((s) => s.setSelection)
  const clearSelection = useFrisbee((s) => s.clearSelection)
  const movePlayer = useFrisbee((s) => s.movePlayer)
  const moveSelectedByDelta = useFrisbee((s) => s.moveSelectedByDelta)
  const selectCone = useFrisbee((s) => s.selectCone)
  const setConeSelection = useFrisbee((s) => s.setConeSelection)
  const moveCone = useFrisbee((s) => s.moveCone)
  const moveSelectedConesByDelta = useFrisbee((s) => s.moveSelectedConesByDelta)
  const setDrawingArrow = useFrisbee((s) => s.setDrawingArrow)
  const setDrawingStroke = useFrisbee((s) => s.setDrawingStroke)
  const appendStrokePoint = useFrisbee((s) => s.appendStrokePoint)
  const commitStroke = useFrisbee((s) => s.commitStroke)
  const cancelStroke = useFrisbee((s) => s.cancelStroke)
  const commitArrow = useFrisbee((s) => s.commitArrow)
  const setDiscHolder = useFrisbee((s) => s.setDiscHolder)
  const setTool = useFrisbee((s) => s.setTool)
  const setMarquee = useFrisbee((s) => s.setMarquee)
  const beginInteraction = useFrisbee((s) => s.beginInteraction)
  const addCone = useFrisbee((s) => s.addCone)
  const addPlayerAt = useFrisbee((s) => s.addPlayerAt)
  const removeCone = useFrisbee((s) => s.removeCone)
  const coneAt = useFrisbee((s) => s.coneAt)
  const removeStroke = useFrisbee((s) => s.removeStroke)
  const strokeAt = useFrisbee((s) => s.strokeAt)
  const removeArrow = useFrisbee((s) => s.removeArrow)

  // Refs for mutable interaction state (so we don't re-create callbacks)
  const dragRef = useRef<
    | { kind: 'single'; id: string; offsetX: number; offsetY: number; lastPos: Vec2 }
    | { kind: 'group'; lastCursor: Vec2 }
    | { kind: 'cone-single'; id: string; offsetX: number; offsetY: number }
    | { kind: 'cone-group'; lastCursor: Vec2 }
    | null
  >(null)
  const drawingStartRef = useRef<Vec2 | null>(null)
  const marqueeStartRef = useRef<Vec2 | null>(null)
  const marqueeAdditiveRef = useRef<boolean>(false)
  const interactionStartedRef = useRef<boolean>(false)
  // Track if a pen is currently active — when it is, we ignore touch (palm rejection)
  const penActiveRef = useRef<boolean>(false)

  const computeRenderState = useCallback((): RenderState => {
    const frames = play.keyframes
    const idx = Math.min(currentFrameIndex, frames.length - 1)
    const from = frames[idx]
    const to = frames[idx + 1]

    let positions: Record<string, Vec2>
    let discHolderId: string | null
    let discInTransit = false
    let throwProgress = 0

    if (to && (animProgress > 0 || isPlaying)) {
      const interp = interpolate(from, to, animProgress)
      positions = interp.positions
      discHolderId = interp.discHolderId
      discInTransit = interp.discInTransit
      throwProgress = interp.throwProgress
    } else {
      positions = from.positions
      discHolderId = from.discHolderId
    }

    // Disc position
    let discPos: Vec2 | null = null
    if (discHolderId && positions[discHolderId]) {
      discPos = positions[discHolderId]
    } else if (discInTransit && from.discHolderId && to?.discHolderId) {
      const fromPos = positions[from.discHolderId]
      const toPos = positions[to.discHolderId]
      if (fromPos && toPos) {
        discPos = {
          x: fromPos.x + (toPos.x - fromPos.x) * throwProgress,
          y: fromPos.y + (toPos.y - fromPos.y) * throwProgress,
        }
      }
    }

    const visibleArrows: Arrow[] = play.arrows.filter((a) => a.frameIndex === idx)

    return {
      players: play.players,
      positions,
      discHolderId,
      discPos,
      visibleArrows,
      cones: play.cones,
      strokes: play.strokes,
      drawingStroke,
      selectedPlayerIds,
      isAnimating: isPlaying || animProgress > 0,
    }
  }, [play, currentFrameIndex, animProgress, isPlaying, selectedPlayerIds, drawingStroke])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    drawField(ctx, w, h)
    drawStrokes(ctx, w, h, play.strokes)
    const state = computeRenderState()
    drawArrows(ctx, w, h, state.visibleArrows, animProgress)
    drawCones(ctx, w, h, play.cones, selectedConeIds)
    drawPlayers(ctx, w, h, state)
    drawDisc(ctx, w, h, state)

    // Live drawing — stroke
    if (drawingStroke) {
      drawDrawingStroke(ctx, w, h, drawingStroke)
    }

    // Live drawing — arrow
    if (drawingArrow) {
      drawDrawingArrow(ctx, w, h, drawingArrow.start, drawingArrow.end, drawingArrow.kind, activeColor)
    }

    // Marquee box
    if (marquee) {
      drawMarquee(ctx, w, h, marquee.start, marquee.end)
    }
  }, [computeRenderState, drawingArrow, drawingStroke, marquee, animProgress, play.strokes, play.cones, activeColor, selectedConeIds])

  useEffect(() => {
    render()
  }, [render])

  // Find which player is at a given canvas-relative position
  function playerAt(vec: Vec2): string | null {
    const hitR = 3.5
    for (const p of play.players) {
      const pos = play.keyframes[currentFrameIndex]?.positions[p.id]
      if (!pos) continue
      const dx = pos.x - vec.x
      const dy = pos.y - vec.y
      if (Math.sqrt(dx * dx + dy * dy) < hitR) return p.id
    }
    return null
  }

  // Hit-test arrow at vec — returns arrow id or null (only arrows on current frame)
  function arrowAt(vec: Vec2): string | null {
    const idx = currentFrameIndex
    for (const a of play.arrows) {
      if (a.frameIndex !== idx) continue
      // Distance from point to line segment (a.start - a.end)
      const d = distToSegment(vec, a.start, a.end)
      if (d < 2.5) return a.id
    }
    return null
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return

    // Palm rejection: if a pen is currently down, ignore touch pointers
    // Also: if stylusOnly mode is on, ignore all touch pointers entirely
    if (stylusOnly && e.pointerType === 'touch') return
    if (penActiveRef.current && e.pointerType === 'touch') return
    if (e.pointerType === 'pen') penActiveRef.current = true

    canvas.setPointerCapture(e.pointerId)
    const vec = toVecFromEvent(e, canvas)
    const additive = e.shiftKey

    if (tool === 'select') {
      const id = playerAt(vec)
      const cId = id ? null : coneAt(vec)  // only hit-test cone if no player was hit
      if (id) {
        const cur = selectedPlayerIds
        if (additive) {
          selectPlayer(id, { additive: true })
          dragRef.current = null
          interactionStartedRef.current = false
          return
        }
        if (!cur.includes(id)) {
          selectPlayer(id)
        }
        const willBeSelected = selectedPlayerIds.includes(id) ? selectedPlayerIds : [id]
        if (willBeSelected.length > 1) {
          dragRef.current = { kind: 'group', lastCursor: vec }
        } else {
          const pos = play.keyframes[currentFrameIndex]?.positions[id]
          if (pos) {
            dragRef.current = {
              kind: 'single',
              id,
              offsetX: vec.x - pos.x,
              offsetY: vec.y - pos.y,
              lastPos: pos,
            }
          }
        }
        interactionStartedRef.current = false
      } else if (cId) {
        // Clicked on a cone
        if (additive) {
          selectCone(cId, { additive: true })
          dragRef.current = null
          interactionStartedRef.current = false
          return
        }
        const cur = selectedConeIds
        if (!cur.includes(cId)) {
          selectCone(cId)
        }
        const willBeSelectedCones = selectedConeIds.includes(cId) ? selectedConeIds : [cId]
        if (willBeSelectedCones.length > 1) {
          dragRef.current = { kind: 'cone-group', lastCursor: vec }
        } else {
          // Single cone drag
          const cone = play.cones.find((c) => c.id === cId)
          if (cone) {
            dragRef.current = {
              kind: 'cone-single',
              id: cId,
              offsetX: vec.x - cone.pos.x,
              offsetY: vec.y - cone.pos.y,
            }
          }
        }
        interactionStartedRef.current = false
      } else {
        if (!additive) clearSelection()
        marqueeStartRef.current = vec
        marqueeAdditiveRef.current = additive
        setMarquee({ start: vec, end: vec, additive })
        dragRef.current = null
        interactionStartedRef.current = false
      }
    } else if (tool === 'arrow' || tool === 'disc') {
      drawingStartRef.current = vec
      setDrawingArrow({
        kind: tool === 'disc' ? 'throw' : 'cut',
        start: vec,
        end: vec,
      })
    } else if (tool === 'cone') {
      // Tap to place a cone
      addCone(vec)
    } else if (tool === 'place-offense') {
      // Tap to place an offense player at the tapped location. Tool stays active so
      // the user can keep tapping to place more.
      addPlayerAt('offense', vec)
    } else if (tool === 'place-defense') {
      addPlayerAt('defense', vec)
    } else if (tool === 'pen') {
      // Start a new stroke
      setDrawingStroke({
        color: activeColor,
        width: 4,
        points: [vec],
      })
    } else if (tool === 'erase') {
      // Try to erase whatever's at this point: stroke, cone, arrow (in that order)
      const sId = strokeAt(vec)
      if (sId) {
        removeStroke(sId)
        return
      }
      const cId = coneAt(vec)
      if (cId) {
        removeCone(cId)
        return
      }
      const aId = arrowAt(vec)
      if (aId) {
        removeArrow(aId)
        return
      }
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    // Palm rejection during move too
    if (stylusOnly && e.pointerType === 'touch') return
    if (penActiveRef.current && e.pointerType === 'touch') return

    const vec = toVecFromEvent(e, canvas)

    if (dragRef.current) {
      if (!interactionStartedRef.current) {
        beginInteraction()
        interactionStartedRef.current = true
      }
      if (dragRef.current.kind === 'single') {
        const newX = vec.x - dragRef.current.offsetX
        const newY = vec.y - dragRef.current.offsetY
        movePlayer(dragRef.current.id, {
          x: Math.max(2, Math.min(98, newX)),
          y: Math.max(2, Math.min(98, newY)),
        })
      } else if (dragRef.current.kind === 'cone-single') {
        const newX = vec.x - dragRef.current.offsetX
        const newY = vec.y - dragRef.current.offsetY
        moveCone(dragRef.current.id, {
          x: Math.max(2, Math.min(98, newX)),
          y: Math.max(2, Math.min(98, newY)),
        })
      } else if (dragRef.current.kind === 'group') {
        const delta = {
          x: vec.x - dragRef.current.lastCursor.x,
          y: vec.y - dragRef.current.lastCursor.y,
        }
        if (delta.x !== 0 || delta.y !== 0) {
          moveSelectedByDelta(delta)
          dragRef.current.lastCursor = vec
        }
      } else if (dragRef.current.kind === 'cone-group') {
        const delta = {
          x: vec.x - dragRef.current.lastCursor.x,
          y: vec.y - dragRef.current.lastCursor.y,
        }
        if (delta.x !== 0 || delta.y !== 0) {
          moveSelectedConesByDelta(delta)
          dragRef.current.lastCursor = vec
        }
      }
    } else if (drawingStartRef.current && drawingArrow) {
      setDrawingArrow({
        kind: drawingArrow.kind,
        start: drawingStartRef.current,
        end: vec,
      })
    } else if (drawingStroke) {
      // Throttled inside the store
      appendStrokePoint(vec)
    } else if (marqueeStartRef.current && marquee) {
      setMarquee({
        start: marqueeStartRef.current,
        end: vec,
        additive: marqueeAdditiveRef.current,
      })
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    // Palm rejection
    if (stylusOnly && e.pointerType === 'touch') return
    if (e.pointerType === 'pen') penActiveRef.current = false

    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    const vec = toVecFromEvent(e, canvas)

    if (dragRef.current) {
      dragRef.current = null
      interactionStartedRef.current = false
      return
    }

    if (marqueeStartRef.current && marquee) {
      const sx = Math.min(marqueeStartRef.current.x, vec.x)
      const sy = Math.min(marqueeStartRef.current.y, vec.y)
      const ex = Math.max(marqueeStartRef.current.x, vec.x)
      const ey = Math.max(marqueeStartRef.current.y, vec.y)
      const moved = Math.abs(vec.x - marqueeStartRef.current.x) > 0.5 ||
        Math.abs(vec.y - marqueeStartRef.current.y) > 0.5

      if (moved) {
        const frame = play.keyframes[currentFrameIndex]
        const playersInBox: string[] = []
        if (frame) {
          for (const p of play.players) {
            const pos = frame.positions[p.id]
            if (!pos) continue
            if (pos.x >= sx && pos.x <= ex && pos.y >= sy && pos.y <= ey) {
              playersInBox.push(p.id)
            }
          }
        }
        const conesInBox: string[] = []
        for (const c of play.cones) {
          if (c.pos.x >= sx && c.pos.x <= ex && c.pos.y >= sy && c.pos.y <= ey) {
            conesInBox.push(c.id)
          }
        }
        // If there are cones in the box (and no players), select cones only
        // If there are players in the box, select players only (players take priority)
        if (playersInBox.length > 0) {
          if (marqueeAdditiveRef.current) {
            const merged = new Set([...selectedPlayerIds, ...playersInBox])
            setSelection([...merged])
          } else {
            setSelection(playersInBox)
          }
        } else if (conesInBox.length > 0) {
          if (marqueeAdditiveRef.current) {
            const merged = new Set([...selectedConeIds, ...conesInBox])
            setConeSelection([...merged])
          } else {
            setConeSelection(conesInBox)
          }
        } else {
          // Empty marquee — clear all selection
          clearSelection()
        }
      }
      marqueeStartRef.current = null
      setMarquee(null)
      interactionStartedRef.current = false
      return
    }

    // Commit stroke
    if (drawingStroke) {
      commitStroke()
      return
    }

    if (drawingStartRef.current && drawingArrow) {
      const start = drawingStartRef.current
      const dx = vec.x - start.x
      const dy = vec.y - start.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 2) {
        commitArrow(drawingArrow.kind, start, vec)
      } else {
        // Treat as click
        if (tool === 'disc') {
          const id = playerAt(vec)
          if (id) {
            setDiscHolder(id)
          } else {
            setDiscHolder(null)
          }
        }
        setDrawingArrow(null)
      }
      drawingStartRef.current = null
    }
    // Auto-return to select after drawing an arrow
    if (tool === 'arrow') {
      setTool('select')
    }
  }

  function onPointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'pen') penActiveRef.current = false
    if (drawingStroke) {
      cancelStroke()
    }
    drawingStartRef.current = null
    setDrawingArrow(null)
    setMarquee(null)
    marqueeStartRef.current = null
    dragRef.current = null
    interactionStartedRef.current = false
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center p-2 sm:p-3"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={FIELD_W}
        height={FIELD_H}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="rounded-xl shadow-2xl border-2 border-emerald-900/40 max-w-full max-h-full touch-none"
        style={{
          aspectRatio: `${FIELD_W} / ${FIELD_H}`,
          height: '100%',
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}

// Distance from point p to segment (a - b) in 0-100 percentage space
function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const ddx = p.x - a.x
    const ddy = p.y - a.y
    return Math.sqrt(ddx * ddx + ddy * ddy)
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  const ddx = p.x - projX
  const ddy = p.y - projY
  return Math.sqrt(ddx * ddx + ddy * ddy)
}
