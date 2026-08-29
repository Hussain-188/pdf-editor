import { useState, useCallback } from 'react'

export interface ViewportState {
  scale: number
  fitMode: 'width' | 'page' | 'custom'
}

const MIN_SCALE = 0.25
const MAX_SCALE = 4.0
const SCALE_STEP = 0.25

export function useViewport(initialScale = 1.0) {
  const [viewport, setViewport] = useState<ViewportState>({
    scale: initialScale,
    fitMode: 'width',
  })

  const zoomIn = useCallback(() => {
    setViewport((v) => ({
      scale: Math.min(v.scale + SCALE_STEP, MAX_SCALE),
      fitMode: 'custom',
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setViewport((v) => ({
      scale: Math.max(v.scale - SCALE_STEP, MIN_SCALE),
      fitMode: 'custom',
    }))
  }, [])

  const setScale = useCallback((scale: number) => {
    setViewport({
      scale: Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE)),
      fitMode: 'custom',
    })
  }, [])

  const fitToWidth = useCallback((containerWidth: number, pageWidth: number) => {
    const scale = containerWidth / pageWidth
    setViewport({ scale, fitMode: 'width' })
  }, [])

  const fitToPage = useCallback((containerWidth: number, containerHeight: number, pageWidth: number, pageHeight: number) => {
    const scaleX = containerWidth / pageWidth
    const scaleY = containerHeight / pageHeight
    const scale = Math.min(scaleX, scaleY)
    setViewport({ scale, fitMode: 'page' })
  }, [])

  return { viewport, zoomIn, zoomOut, setScale, fitToWidth, fitToPage }
}
