import { useCallback } from 'react'

export interface PdfPoint {
  x: number
  y: number
}

export interface ScreenPoint {
  x: number
  y: number
}

export function useCoordinateTransform(scale: number, pageHeight: number) {
  const pdfToScreen = useCallback(
    (point: PdfPoint): ScreenPoint => ({
      x: point.x * scale,
      y: (pageHeight - point.y) * scale,
    }),
    [scale, pageHeight]
  )

  const screenToPdf = useCallback(
    (point: ScreenPoint): PdfPoint => ({
      x: point.x / scale,
      y: pageHeight - point.y / scale,
    }),
    [scale, pageHeight]
  )

  const pdfRectToScreen = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => ({
      x: rect.x * scale,
      y: (pageHeight - rect.y - rect.height) * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    }),
    [scale, pageHeight]
  )

  return { pdfToScreen, screenToPdf, pdfRectToScreen }
}
