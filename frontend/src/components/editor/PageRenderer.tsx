import { useEffect, useRef, useState } from 'react'
import type { PDFPageProxy } from 'pdfjs-dist'
import TextBlockOverlay from './TextBlockOverlay'
import AnnotationLayer from './AnnotationLayer'
import OcrOverlay from './OcrOverlay'

interface PageRendererProps {
  page: PDFPageProxy
  scale: number
  pageNumber: number
  showOverlay?: boolean
  documentId?: string
  onRendered?: () => void
  onDocumentChanged?: () => void
  onError?: (message: string) => void
}

export default function PageRenderer({ page, scale, pageNumber, showOverlay = false, documentId, onRendered, onDocumentChanged, onError }: PageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)
  const textContentRef = useRef<any>(null)
  const prevPageRef = useRef<PDFPageProxy | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (prevPageRef.current !== page) {
      textContentRef.current = null
      prevPageRef.current = page
    }

    const viewport = page.getViewport({ scale })
    setDimensions({ width: viewport.width, height: viewport.height })

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const outputScale = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`

    context.setTransform(outputScale, 0, 0, outputScale, 0, 0)

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
    }

    const renderTask = page.render({ canvas, canvasContext: context, viewport })
    renderTaskRef.current = renderTask

    renderTask.promise
      .then(() => {
        onRendered?.()
        renderTextLayer(page, viewport)
      })
      .catch(() => { /* cancelled */ })

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [page, scale])

  const renderTextLayer = async (pdfPage: PDFPageProxy, viewport: any) => {
    const container = textLayerRef.current
    if (!container) return
    container.innerHTML = ''

    try {
      const { TextLayer } = await import('pdfjs-dist')
      if (!textContentRef.current) {
        textContentRef.current = await pdfPage.getTextContent()
      }
      const textLayer = new TextLayer({
        container,
        textContentSource: textContentRef.current,
        viewport,
      })
      await textLayer.render()
    } catch { /* ignore text layer errors */ }
  }

  return (
    <div
      className="relative bg-white shadow-lg mx-auto mb-6 rounded-sm"
      style={{ width: dimensions.width, height: dimensions.height }}
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="absolute inset-0 overflow-hidden leading-none"
        style={{
          fontSize: 0,
          opacity: showOverlay ? 0 : 0.25,
          pointerEvents: showOverlay ? 'none' : 'auto',
        }}
      />
      {showOverlay && (
        <TextBlockOverlay
          pageNumber={pageNumber}
          pageWidth={page.getViewport({ scale: 1 }).width}
          pageHeight={page.getViewport({ scale: 1 }).height}
          scale={scale}
          documentId={documentId}
          onDocumentChanged={onDocumentChanged}
          onError={onError}
        />
      )}
      {documentId && (
        <OcrOverlay
          pageNumber={pageNumber}
          pageHeight={page.getViewport({ scale: 1 }).height}
          scale={scale}
          documentId={documentId}
        />
      )}
      <AnnotationLayer
        pageNumber={pageNumber}
        pageWidth={page.getViewport({ scale: 1 }).width}
        pageHeight={page.getViewport({ scale: 1 }).height}
        scale={scale}
      />
    </div>
  )
}
