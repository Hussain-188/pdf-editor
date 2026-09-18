import { useRef } from 'react'
import {
  MousePointer, Type, Highlighter, Pencil, Square, StickyNote,
  Underline, Strikethrough, RectangleHorizontal, ImagePlus,
} from 'lucide-react'
import { useAnnotationStore, type AnnotationType } from '../../stores/annotationStore'
import { sendPdfOperation } from '../../lib/pdfOperations'
import { usePdfStore } from '../../stores/pdfStore'

const tools: { type: AnnotationType; label: string; Icon: typeof Type }[] = [
  { type: 'textbox', label: 'Text', Icon: Type },
  { type: 'highlight', label: 'Highlight', Icon: Highlighter },
  { type: 'underline', label: 'Underline', Icon: Underline },
  { type: 'strikethrough', label: 'Strikethrough', Icon: Strikethrough },
  { type: 'freehand', label: 'Draw', Icon: Pencil },
  { type: 'shape', label: 'Shape', Icon: Square },
  { type: 'sticky', label: 'Note', Icon: StickyNote },
  { type: 'whiteout', label: 'Whiteout', Icon: RectangleHorizontal },
]

const colors = ['#FFD700', '#FF6B6B', '#EF4444', '#4ECDC4', '#3B82F6', '#8B5CF6', '#22C55E', '#000000']

const strokeWidths = [1, 2, 3, 5]

interface AnnotationToolbarProps {
  visible: boolean
  onPdfChanged?: () => void
}

export default function AnnotationToolbar({ visible, onPdfChanged }: AnnotationToolbarProps) {
  const activeTool = useAnnotationStore((s) => s.activeTool)
  const setActiveTool = useAnnotationStore((s) => s.setActiveTool)
  const activeColor = useAnnotationStore((s) => s.activeColor)
  const setActiveColor = useAnnotationStore((s) => s.setActiveColor)
  const activeStrokeWidth = useAnnotationStore((s) => s.activeStrokeWidth)
  const setActiveStrokeWidth = useAnnotationStore((s) => s.setActiveStrokeWidth)
  const imageInputRef = useRef<HTMLInputElement>(null)

  if (!visible) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const newBytes = await sendPdfOperation('/editor/add-image', (fd) => {
        fd.append('image', file)
        fd.append('pageNumber', '1')
        fd.append('x', '100')
        fd.append('y', '100')
        fd.append('width', '0')
        fd.append('height', '0')
      })
      usePdfStore.getState().updatePdf(newBytes)
      onPdfChanged?.()
    } catch { /* ignore */ }
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-gray-200 shadow-sm overflow-x-auto">
      {/* Select tool */}
      <button
        onClick={() => setActiveTool(null)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
          activeTool === null
            ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Select"
      >
        <MousePointer size={14} />
        Select
      </button>

      <div className="w-px h-6 bg-gray-200 shrink-0 mx-1" />

      {/* Annotation tools */}
      <div className="flex items-center gap-0.5">
        {tools.map(({ type, label, Icon }) => (
          <button
            key={type}
            onClick={() => setActiveTool(activeTool === type ? null : type)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              activeTool === type
                ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title={label}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0 mx-1" />

      {/* Image upload */}
      <button
        onClick={() => imageInputRef.current?.click()}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all shrink-0"
        title="Add Image"
      >
        <ImagePlus size={14} />
        Image
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="w-px h-6 bg-gray-200 shrink-0 mx-1.5" />

      {/* Color picker */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium shrink-0">
          Color
        </span>
        <div className="flex items-center gap-1.5">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`w-6 h-6 rounded-full transition-all shrink-0 border ${
                activeColor === color
                  ? 'ring-2 ring-offset-1 ring-blue-400 scale-110 border-gray-300'
                  : 'border-gray-200 hover:scale-110 hover:border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke width (for freehand/shape) */}
      {(activeTool === 'freehand' || activeTool === 'shape') && (
        <>
          <div className="w-px h-6 bg-gray-200 shrink-0 mx-1.5" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium shrink-0">
              Width
            </span>
            <div className="flex items-center gap-1">
              {strokeWidths.map((w) => (
                <button
                  key={w}
                  onClick={() => setActiveStrokeWidth(w)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-all shrink-0 ${
                    activeStrokeWidth === w
                      ? 'bg-blue-50 ring-1 ring-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                  title={`${w}px`}
                >
                  <div
                    className="rounded-full bg-gray-700"
                    style={{ width: w * 3 + 2, height: w * 3 + 2 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
