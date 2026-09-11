import { useCallback } from 'react'

export interface PdfPoint {
  x: number
  y: number
}

export interface ScreenPoint {
  x: number
  y: number
}

export function useCoordinateTransform(scale: number, pageWidth: number, pageHeight: number, rotation: number = 0) {
  const pdfToScreen = useCallback(
    (point: PdfPoint): ScreenPoint => {
      switch (rotation) {
        case 90:
          return { x: point.y * scale, y: point.x * scale }
        case 180:
          return { x: (pageWidth - point.x) * scale, y: point.y * scale }
        case 270:
          return { x: (pageHeight - point.y) * scale, y: (pageWidth - point.x) * scale }
        default:
          return { x: point.x * scale, y: (pageHeight - point.y) * scale }
      }
    },
    [scale, pageWidth, pageHeight, rotation]
  )

  const screenToPdf = useCallback(
    (point: ScreenPoint): PdfPoint => {
      switch (rotation) {
        case 90:
          return { x: point.y / scale, y: point.x / scale }
        case 180:
          return { x: pageWidth - point.x / scale, y: point.y / scale }
        case 270:
          return { x: pageWidth - point.y / scale, y: pageHeight - point.x / scale }
        default:
          return { x: point.x / scale, y: pageHeight - point.y / scale }
      }
    },
    [scale, pageWidth, pageHeight, rotation]
  )

  const pdfRectToScreen = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      switch (rotation) {
        case 90:
          return {
            x: rect.y * scale,
            y: rect.x * scale,
            width: rect.height * scale,
            height: rect.width * scale,
          }
        case 180:
          return {
            x: (pageWidth - rect.x - rect.width) * scale,
            y: rect.y * scale,
            width: rect.width * scale,
            height: rect.height * scale,
          }
        case 270:
          return {
            x: (pageHeight - rect.y - rect.height) * scale,
            y: (pageWidth - rect.x - rect.width) * scale,
            width: rect.height * scale,
            height: rect.width * scale,
          }
        default:
          return {
            x: rect.x * scale,
            y: (pageHeight - rect.y - rect.height) * scale,
            width: rect.width * scale,
            height: rect.height * scale,
          }
      }
    },
    [scale, pageWidth, pageHeight, rotation]
  )

  return { pdfToScreen, screenToPdf, pdfRectToScreen }
}
