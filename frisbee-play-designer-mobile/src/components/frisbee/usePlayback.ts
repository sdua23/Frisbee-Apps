'use client'

import { useEffect, useRef } from 'react'
import { useFrisbee } from '@/lib/frisbee/store'

// Frame duration in seconds (per transition). Speed multiplies this.
const BASE_FRAME_DURATION = 2.0 // seconds per transition at 1x speed

export function usePlayback() {
  const isPlaying = useFrisbee((s) => s.isPlaying)
  const playSpeed = useFrisbee((s) => s.playSpeed)
  const currentFrameIndex = useFrisbee((s) => s.currentFrameIndex)
  const animProgress = useFrisbee((s) => s.animProgress)
  const totalFrames = useFrisbee((s) => s.play.keyframes.length)

  const setCurrentFrame = useFrisbee((s) => s.setCurrentFrame)
  const setAnimProgress = useFrisbee((s) => s.setAnimProgress)
  const setPlaying = useFrisbee((s) => s.setPlaying)

  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  // Keep latest values in refs so the RAF callback doesn't restart on every state change
  const stateRef = useRef({ isPlaying, playSpeed, currentFrameIndex, animProgress, totalFrames })

  useEffect(() => {
    stateRef.current = { isPlaying, playSpeed, currentFrameIndex, animProgress, totalFrames }
  }, [isPlaying, playSpeed, currentFrameIndex, animProgress, totalFrames])

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
        lastTsRef.current = null
      }
      return
    }

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts

      const s = stateRef.current
      const frameDur = BASE_FRAME_DURATION / s.playSpeed
      const delta = dt / frameDur

      let newProgress = s.animProgress + delta
      let newFrame = s.currentFrameIndex

      // Advance through frames
      while (newProgress >= 1 && newFrame < s.totalFrames - 1) {
        newProgress -= 1
        newFrame += 1
      }

      if (newFrame >= s.totalFrames - 1) {
        // End of play
        setCurrentFrame(s.totalFrames - 1)
        setAnimProgress(0)
        setPlaying(false)
        return
      }

      if (newFrame !== s.currentFrameIndex) {
        setCurrentFrame(newFrame)
        // setCurrentFrame resets animProgress to 0; we then apply remaining
        // Use setTimeout to ensure state is updated - actually just call setAnimProgress after
        setAnimProgress(newProgress)
      } else {
        setAnimProgress(newProgress)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [isPlaying, playSpeed, currentFrameIndex, totalFrames])
}
