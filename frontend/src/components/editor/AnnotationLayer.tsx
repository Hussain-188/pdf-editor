import { useRef, useCallback, useState, useEffect, useReducer } from 'react'
import { useAnnotationStore, type Annotation } from '../../stores/annotationStore'
import { useCoordinateTransform } from '../../hooks/useCoordinateTransform'

interface AnnotationLayerProps {
  pageNumber: number
  pageHeight: number
  scale: number
}

export default function AnnotationLayer({ pageNumber, pageHeight, scale }: AnnotationLayerProps) {
  const annotations = useAnnotationStore((s) => s.getPageAnnotations(pageNumber))
  const activeTool = useAnnotationStore((s) => s.activeTool)
  const activeColor = useAnnotationStore((s) => s.activeColor)
  const activeStrokeWidth = useAnnotationStore((s) => s.activeStrokeWidth)
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation)
  const updateAnnotation = useAnnotationStore((s) => s.updateAnnotation)
  const selectAnnotation = useAnnotationStore((s) => s.selectAnnotation)
  const selectedId = useAnnotationStore((s) => s.selectedAnnotationId)
  const deleteAnnotation = useAnnotationStore((s) => s.deleteAnnotation)
  const { screenToPdf, pdfRectToScreen } = useCoordinateTransform(scale, pageHeight)

  const drawLayerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const drawStartRef = useRef({ x: 0, y: 0 })
  const drawCurrentRef = useRef({ x: 0, y: 0 })
  const freehandPointsRef = useRef<{ x: number; y: number }[]>([])
  const moveCleanupRef = useRef<(() => void) | null>(null)

  const [, forceRender] = useReducer((x: number) => x + 1, 0)
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const activeToolRef = useRef(activeTool)
  const activeColorRef = useRef(activeColor)
  const activeStrokeWidthRef = useRef(activeStrokeWidth)
  const screenToPdfRef = useRef(screenToPdf)
  const addAnnotationRef = useRef(addAnnotation)
  activeToolRef.current = activeTool
  activeColorRef.current = activeColor
  activeStrokeWidthRef.current = activeStrokeWidth
  screenToPdfRef.current = screenToPdf
  addAnnotationRef.current = addAnnotation

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingId) {
        e.preventDefault()
        deleteAnnotation(selectedId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, editingId, deleteAnnotation])

  useEffect(() => {
    if (!activeTool) {
      moveCleanupRef.current?.()
      moveCleanupRef.current = null
      return
    }
    const el = drawLayerRef.current
    if (!el) return

    const getPos = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const handleMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const pos = getPos(e)
      drawingRef.current = true
      drawStartRef.current = pos
      drawCurrentRef.current = pos
      if (activeToolRef.current === 'freehand') {
        freehandPointsRef.current = [screenToPdfRef.current(pos)]
      }
      forceRender()

      const handleMouseMove = (e: MouseEvent) => {
        if (!drawingRef.current) return
        const pos = getPos(e)
        drawCurrentRef.current = pos
        if (activeToolRef.current === 'freehand') {
          freehandPointsRef.current = [...freehandPointsRef.current, screenToPdfRef.current(pos)]
        }
        forceRender()
      }

      const handleMouseUp = (e: MouseEvent) => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        moveCleanupRef.current = null

        if (!drawingRef.current) return
        drawingRef.current = false

        const finalPos = getPos(e)
        const tool = activeToolRef.current
        if (!tool) { forceRender(); return }

        const pdfStart = screenToPdfRef.current(drawStartRef.current)
        const pdfEnd = screenToPdfRef.current(finalPos)
        const x = Math.min(pdfStart.x, pdfEnd.x)
        const y = Math.min(pdfStart.y, pdfEnd.y)
        const w = Math.abs(pdfEnd.x - pdfStart.x)
        const h = Math.abs(pdfEnd.y - pdfStart.y)

        if (w < 5 && h < 5 && tool !== 'freehand') {
          forceRender()
          return
        }

        const annotation: Annotation = {
          id: '',
          type: tool,
          pageNumber,
          x, y, width: w, height: h,
          color: activeColorRef.current,
          strokeWidth: activeStrokeWidthRef.current,
          ...(tool === 'freehand' ? { points: freehandPointsRef.current } : {}),
          ...(tool === 'textbox' ? { text: 'Text' } : {}),
          ...(tool === 'sticky' ? { text: 'Note' } : {}),
          ...(tool === 'shape' ? { shapeType: 'rectangle' as const } : {}),
        }

        addAnnotationRef.current(annotation)
        freehandPointsRef.current = []
        forceRender()
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      moveCleanupRef.current = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      moveCleanupRef.current?.()
      moveCleanupRef.current = null
    }
  }, [activeTool, pageNumber])

  const handleAnnotationMouseDown = useCallback((e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation()
    e.preventDefault()
    selectAnnotation(ann.id)
    if (editingId) return
    setDragging({
      id: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: ann.x,
      origY: ann.y,
    })
  }, [selectAnnotation, editingId])

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startX) / scale
      const dy = -(e.clientY - dragging.startY) / scale
      updateAnnotation(dragging.id, {
        x: dragging.origX + dx,
        y: dragging.origY + dy,
      })
    }
    const handleUp = () => setDragging(null)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging, scale, updateAnnotation])

  const handleDoubleClick = useCallback((e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation()
    if (ann.type === 'textbox' || ann.type === 'sticky') {
      setEditingId(ann.id)
    }
  }, [])

  const handleTextBlur = useCallback((ann: Annotation, newText: string) => {
    setEditingId(null)
    if (newText !== ann.text) {
      updateAnnotation(ann.id, { text: newText })
    }
  }, [updateAnnotation])

  const renderAnnotation = (ann: Annotation) => {
    const rect = pdfRectToScreen({ x: ann.x, y: ann.y, width: ann.width, height: ann.height })
    const isSelected = selectedId === ann.id
    const isEditing = editingId === ann.id

    if (ann.type === 'highlight') {
      return (
        <div
          key={ann.id}
          className="absolute cursor-move"
          style={{
            left: rect.x, top: rect.y, width: rect.width, height: rect.height,
            backgroundColor: ann.color, opacity: 0.3,
            outline: isSelected ? '2px solid #3B82F6' : 'none',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
        />
      )
    }

    if (ann.type === 'freehand' && ann.points) {
      const d = ann.points.map((p, i) => {
        const sp = { x: p.x * scale, y: (pageHeight - p.y) * scale }
        return `${i === 0 ? 'M' : 'L'} ${sp.x} ${sp.y}`
      }).join(' ')
      const bounds = ann.points.reduce(
        (acc, p) => ({
          minX: Math.min(acc.minX, p.x * scale),
          minY: Math.min(acc.minY, (pageHeight - p.y) * scale),
          maxX: Math.max(acc.maxX, p.x * scale),
          maxY: Math.max(acc.maxY, (pageHeight - p.y) * scale),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      )
      return (
        <svg
          key={ann.id}
          className="absolute top-0 left-0"
          width="100%" height="100%"
          style={{ pointerEvents: 'none' }}
        >
          {isSelected && (
            <rect
              x={bounds.minX - 4} y={bounds.minY - 4}
              width={bounds.maxX - bounds.minX + 8} height={bounds.maxY - bounds.minY + 8}
              fill="none" stroke="#3B82F6" strokeWidth={1} strokeDasharray="4"
            />
          )}
          <path
            d={d}
            fill="none" stroke={ann.color} strokeWidth={ann.strokeWidth * scale}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ pointerEvents: 'stroke', cursor: 'move' }}
            onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
          />
        </svg>
      )
    }

    if (ann.type === 'shape') {
      return (
        <div
          key={ann.id}
          className="absolute cursor-move"
          style={{
            left: rect.x, top: rect.y, width: rect.width, height: rect.height,
            border: `${ann.strokeWidth * scale}px solid ${ann.color}`,
            outline: isSelected ? '2px solid #3B82F6' : 'none',
            outlineOffset: 2,
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
        />
      )
    }

    if (ann.type === 'textbox' || ann.type === 'sticky') {
      return (
        <div
          key={ann.id}
          className={`absolute cursor-move ${
            ann.type === 'sticky' ? 'bg-yellow-200 border border-yellow-400' : 'border border-gray-400 bg-white/90'
          } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
          style={{
            left: rect.x, top: rect.y,
            width: Math.max(rect.width, 80),
            minHeight: Math.max(rect.height, 30),
            pointerEvents: 'auto',
            padding: '4px 6px',
            fontSize: 12 * scale,
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
          onDoubleClick={(e) => handleDoubleClick(e, ann)}
        >
          {isEditing ? (
            <div
              contentEditable
              suppressContentEditableWarning
              className="outline-none w-full h-full"
              style={{ minHeight: 20, cursor: 'text' }}
              onMouseDown={(e) => e.stopPropagation()}
              onBlur={(e) => handleTextBlur(ann, e.currentTarget.textContent || '')}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') setEditingId(null)
              }}
              ref={(el) => {
                if (el && !el.textContent) {
                  el.textContent = ann.text || ''
                  const range = document.createRange()
                  range.selectNodeContents(el)
                  range.collapse(false)
                  const sel = window.getSelection()
                  sel?.removeAllRanges()
                  sel?.addRange(range)
                  el.focus()
                }
              }}
            />
          ) : (
            <span className="text-xs select-none">{ann.text}</span>
          )}
        </div>
      )
    }

    return null
  }

  const isDrawing = drawingRef.current
  const drawStart = drawStartRef.current
  const drawCurrent = drawCurrentRef.current

  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {annotations.map(renderAnnotation)}

      {activeTool && (
        <div
          ref={drawLayerRef}
          className="absolute inset-0"
          style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
        >
          {isDrawing && (
            <svg
              className="absolute inset-0"
              width="100%" height="100%"
              style={{ pointerEvents: 'none' }}
            >
              {activeTool === 'freehand' && freehandPointsRef.current.length > 1 ? (
                <path
                  d={freehandPointsRef.current.map((p, i) => {
                    const sp = { x: p.x * scale, y: (pageHeight - p.y) * scale }
                    return `${i === 0 ? 'M' : 'L'} ${sp.x} ${sp.y}`
                  }).join(' ')}
                  fill="none" stroke={activeColor} strokeWidth={activeStrokeWidth * scale}
                  strokeLinecap="round" strokeDasharray="4"
                />
              ) : activeTool !== 'freehand' ? (
                <rect
                  x={Math.min(drawStart.x, drawCurrent.x)}
                  y={Math.min(drawStart.y, drawCurrent.y)}
                  width={Math.abs(drawCurrent.x - drawStart.x)}
                  height={Math.abs(drawCurrent.y - drawStart.y)}
                  fill={activeTool === 'highlight' ? activeColor : 'none'}
                  opacity={activeTool === 'highlight' ? 0.2 : 1}
                  stroke={activeColor}
                  strokeWidth={1}
                  strokeDasharray="4"
                />
              ) : null}
            </svg>
          )}
        </div>
      )}
    </div>
  )
}
