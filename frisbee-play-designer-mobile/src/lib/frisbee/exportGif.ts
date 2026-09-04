'use client'

import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import {
  drawArrows,
  drawCones,
  drawDisc,
  drawField,
  drawPlayers,
  drawStrokes,
  interpolate,
  FIELD_W,
  FIELD_H,
} from './render'
import type { Play } from './types'

// Canvas dimensions for the GIF — vertical field (portrait orientation)
const CANVAS_W = FIELD_W
const CANVAS_H = FIELD_H

// Animation settings — match the editor's natural playback at 1× speed
const FPS = 15
const FRAME_DURATION_SEC = 2.0 // matches BASE_FRAME_DURATION in usePlayback.ts
const START_HOLD_SEC = 0.4 // brief pause on the first frame so the loop doesn't snap
const END_HOLD_SEC = 0.8 // brief pause on the final frame before looping

export interface GifProgress {
  phase: 'encoding' | 'done' | 'error'
  current: number
  total: number
}

/**
 * Render the full play animation as an animated GIF.
 *
 * The GIF loops infinitely and matches what the user would see pressing Play
 * at 1× speed in the editor (including the disc traveling between holders).
 *
 * @param play  The play to render
 * @param onProgress  Progress callback (current frame, total frames)
 * @returns Blob containing the GIF file
 */
export async function exportPlayToGif(
  play: Play,
  onProgress?: (p: GifProgress) => void,
): Promise<Blob> {
  if (play.keyframes.length === 0) {
    throw new Error('Play has no keyframes')
  }

  // Create offscreen canvas
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not get canvas context')

  const gif = GIFEncoder()

  const totalTransitions = play.keyframes.length - 1
  const framesPerTransition = Math.max(1, Math.ceil(FRAME_DURATION_SEC * FPS))
  const startHoldFrames = Math.ceil(START_HOLD_SEC * FPS)
  const endHoldFrames = Math.ceil(END_HOLD_SEC * FPS)

  // Total GIF frames: start hold + transitions + end hold
  const totalFrames =
    startHoldFrames + totalTransitions * framesPerTransition + endHoldFrames

  const delayMs = Math.round(1000 / FPS)

  let frameCount = 0

  // Render a single animation tick to the offscreen canvas
  function renderTick(frameIdx: number, progress: number) {
    const from = play.keyframes[frameIdx]
    const to = play.keyframes[frameIdx + 1]

    let positions: Record<string, { x: number; y: number }>
    let discHolderId: string | null
    let discInTransit = false
    let throwProgress = 0

    if (to && progress > 0) {
      const interp = interpolate(from, to, progress)
      positions = interp.positions
      discHolderId = interp.discHolderId
      discInTransit = interp.discInTransit
      throwProgress = interp.throwProgress
    } else {
      positions = from.positions
      discHolderId = from.discHolderId
    }

    // Disc position: either with holder or in flight
    let discPos: { x: number; y: number } | null = null
    if (discHolderId && positions[discHolderId]) {
      discPos = positions[discHolderId]
    } else if (
      discInTransit &&
      from.discHolderId &&
      to?.discHolderId &&
      positions[from.discHolderId] &&
      positions[to.discHolderId]
    ) {
      const fromPos = positions[from.discHolderId]
      const toPos = positions[to.discHolderId]
      discPos = {
        x: fromPos.x + (toPos.x - fromPos.x) * throwProgress,
        y: fromPos.y + (toPos.y - fromPos.y) * throwProgress,
      }
    }

    const visibleArrows = play.arrows.filter((a) => a.frameIndex === frameIdx)

    const renderState = {
      players: play.players,
      positions,
      discHolderId,
      discPos,
      visibleArrows,
      cones: play.cones,
      strokes: play.strokes,
      drawingStroke: null,
      selectedPlayerIds: [] as string[], // never show selection rings in GIF
      isAnimating: progress > 0,
    }

    drawField(ctx, CANVAS_W, CANVAS_H)
    drawStrokes(ctx, CANVAS_W, CANVAS_H, play.strokes)
    drawArrows(ctx, CANVAS_W, CANVAS_H, visibleArrows, progress)
    drawCones(ctx, CANVAS_W, CANVAS_H, play.cones, [])
    drawPlayers(ctx, CANVAS_W, CANVAS_H, renderState)
    drawDisc(ctx, CANVAS_W, CANVAS_H, renderState)
  }

  function captureFrame() {
    const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, CANVAS_W, CANVAS_H, {
      palette,
      delay: delayMs,
    })
    frameCount++
    onProgress?.({ phase: 'encoding', current: frameCount, total: totalFrames })
  }

  // Yield to the event loop so the UI can update the progress bar
  const yieldToUI = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 0))

  try {
    // 1. Start hold — show initial setup
    for (let i = 0; i < startHoldFrames; i++) {
      renderTick(0, 0)
      captureFrame()
      if (i % 3 === 0) await yieldToUI()
    }

    // 2. Animate each transition
    for (let t = 0; t < totalTransitions; t++) {
      for (let f = 1; f <= framesPerTransition; f++) {
        const progress = f / framesPerTransition
        renderTick(t, progress)
        captureFrame()
        if (frameCount % 3 === 0) await yieldToUI()
      }
    }

    // 3. End hold — pause on final state before looping
    if (totalTransitions > 0) {
      // Render final state of last transition
      renderTick(totalTransitions - 1, 1)
    } else {
      renderTick(0, 0)
    }
    for (let i = 0; i < endHoldFrames; i++) {
      captureFrame()
      if (i % 3 === 0) await yieldToUI()
    }

    gif.finish()
    onProgress?.({ phase: 'done', current: totalFrames, total: totalFrames })

    return new Blob([gif.bytes()], { type: 'image/gif' })
  } catch (e) {
    onProgress?.({
      phase: 'error',
      current: frameCount,
      total: totalFrames,
    })
    throw e
  }
}

/**
 * Trigger a browser download for a blob with the given filename.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a small delay to ensure download started
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
