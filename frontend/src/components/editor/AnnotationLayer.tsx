import { useRef, useCallback, useState } from 'react'
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
  const selectAnnotation = useAnnotationStore((s) => s.selectAnnotation)
  const selectedId = useAnnotationStore((s) => s.selectedAnnotationId)
  const deleteAnnotation = useAnnotationStore((s) => s.deleteAnnotation)
  const { screenToPdf, pdfRectToScreen } = useCoordinateTransform(scale, pageHeight)

  const svgRef = useRef<SVGSVGElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 })
  const [freehandPoints, setFreehandPoints] = useState<{ x: number; y: number }[]>([])

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeTool) return
    const pos = getRelativePos(e)
    setDrawing(true)
    setDrawStart(pos)
    setDrawCurrent(pos)
    if (activeTool === 'freehand') {
      setFreehandPoints([screenToPdf(pos)])
    }
  }, [activeTool, getRelativePos, screenToPdf])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing) return
    const pos = getRelativePos(e)
    setDrawCurrent(pos)
    if (activeTool === 'freehand') {
      setFreehandPoints((prev) => [...prev, screenToPdf(pos)])
    }
  }, [drawing, activeTool, getRelativePos, screenToPdf])

  const handleMouseUp = useCallback(() => {
    if (!drawing || !activeTool) return
    setDrawing(false)

    const pdfStart = screenToPdf(drawStart)
    const pdfEnd = screenToPdf(drawCurrent)
    const x = Math.min(pdfStart.x, pdfEnd.x)
    const y = Math.min(pdfStart.y, pdfEnd.y)
    const w = Math.abs(pdfEnd.x - pdfStart.x)
    const h = Math.abs(pdfEnd.y - pdfStart.y)

    if (w < 5 && h < 5 && activeTool !== 'freehand') return

    const annotation: Annotation = {
      id: '',
      type: activeTool,
      pageNumber,
      x, y, width: w, height: h,
      color: activeColor,
      strokeWidth: activeStrokeWidth,
      ...(activeTool === 'freehand' ? { points: freehandPoints } : {}),
      ...(activeTool === 'textbox' ? { text: 'Text' } : {}),
      ...(activeTool === 'sticky' ? { text: 'Note' } : {}),
      ...(activeTool === 'shape' ? { shapeType: 'rectangle' as const } : {}),
    }

    addAnnotation(annotation)
    setFreehandPoints([])
  }, [drawing, activeTool, drawStart, drawCurrent, freehandPoints, pageNumber, activeColor, activeStrokeWidth, screenToPdf, addAnnotation])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && selectedId) {
      deleteAnnotation(selectedId)
    }
  }, [selectedId, deleteAnnotation])

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0"
      style={{ pointerEvents: activeTool ? 'auto' : 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {annotations.map((ann) => {
        const rect = pdfRectToScreen({ x: ann.x, y: ann.y, width: ann.width, height: ann.height })
        const isSelected = selectedId === ann.id

        if (ann.type === 'highlight') {
          return (
            <rect
              key={ann.id}
              x={rect.x} y={rect.y} width={rect.width} height={rect.height}
              fill={ann.color} opacity={0.3}
              stroke={isSelected ? '#3B82F6' : 'none'} strokeWidth={isSelected ? 2 : 0}
              className="cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); selectAnnotation(ann.id) }}
            />
          )
        }

        if (ann.type === 'freehand' && ann.points) {
          const d = ann.points.map((p, i) => {
            const sp = { x: p.x * scale, y: (pageHeight - p.y) * scale }
            return `${i === 0 ? 'M' : 'L'} ${sp.x} ${sp.y}`
          }).join(' ')
          return (
            <path
              key={ann.id}
              d={d}
              fill="none" stroke={ann.color} strokeWidth={ann.strokeWidth * scale}
              strokeLinecap="round" strokeLinejoin="round"
              className="cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); selectAnnotation(ann.id) }}
            />
          )
        }

        if (ann.type === 'shape') {
          return (
            <rect
              key={ann.id}
              x={rect.x} y={rect.y} width={rect.width} height={rect.height}
              fill="none" stroke={ann.color} strokeWidth={ann.strokeWidth * scale}
              className="cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); selectAnnotation(ann.id) }}
            />
          )
        }

        if (ann.type === 'textbox' || ann.type === 'sticky') {
          return (
            <foreignObject
              key={ann.id}
              x={rect.x} y={rect.y} width={Math.max(rect.width, 80)} height={Math.max(rect.height, 30)}
              className="cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); selectAnnotation(ann.id) }}
            >
              <div
                className={`w-full h-full px-1 text-xs ${
                  ann.type === 'sticky' ? 'bg-yellow-200 border border-yellow-400' : 'border border-gray-400 bg-white/80'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                {ann.text}
              </div>
            </foreignObject>
          )
        }

        return null
      })}

      {drawing && activeTool === 'freehand' && freehandPoints.length > 1 && (
        <path
          d={freehandPoints.map((p, i) => {
            const sp = { x: p.x * scale, y: (pageHeight - p.y) * scale }
            return `${i === 0 ? 'M' : 'L'} ${sp.x} ${sp.y}`
          }).join(' ')}
          fill="none" stroke={activeColor} strokeWidth={activeStrokeWidth * scale}
          strokeLinecap="round" strokeDasharray="4"
        />
      )}

      {drawing && activeTool && activeTool !== 'freehand' && (
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
      )}
    </svg>
  )
}
