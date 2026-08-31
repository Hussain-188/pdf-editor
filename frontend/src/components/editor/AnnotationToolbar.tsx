import {
  MousePointer, Type, Highlighter, Pencil, Square, StickyNote,
} from 'lucide-react'
import { useAnnotationStore, type AnnotationType } from '../../stores/annotationStore'

const tools: { type: AnnotationType; label: string; Icon: typeof Type }[] = [
  { type: 'textbox', label: 'Text Box', Icon: Type },
  { type: 'highlight', label: 'Highlight', Icon: Highlighter },
  { type: 'freehand', label: 'Draw', Icon: Pencil },
  { type: 'shape', label: 'Shape', Icon: Square },
  { type: 'sticky', label: 'Sticky Note', Icon: StickyNote },
]

const colors = ['#FFD700', '#FF6B6B', '#EF4444', '#4ECDC4', '#3B82F6', '#8B5CF6', '#22C55E', '#000000']

const strokeWidths = [1, 2, 3, 5]

interface AnnotationToolbarProps {
  visible: boolean
}

export default function AnnotationToolbar({ visible }: AnnotationToolbarProps) {
  const activeTool = useAnnotationStore((s) => s.activeTool)
  const setActiveTool = useAnnotationStore((s) => s.setActiveTool)
  const activeColor = useAnnotationStore((s) => s.activeColor)
  const setActiveColor = useAnnotationStore((s) => s.setActiveColor)
  const activeStrokeWidth = useAnnotationStore((s) => s.activeStrokeWidth)
  const setActiveStrokeWidth = useAnnotationStore((s) => s.setActiveStrokeWidth)

  if (!visible) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
      <button
        onClick={() => setActiveTool(null)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
          activeTool === null
            ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Select"
      >
        <MousePointer size={14} />
        Select
      </button>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-1">
        {tools.map(({ type, label, Icon }) => (
          <button
            key={type}
            onClick={() => setActiveTool(activeTool === type ? null : type)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
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

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Color</span>
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`w-5 h-5 rounded-full transition-all ${
              activeColor === color
                ? 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                : 'hover:scale-110'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {(activeTool === 'freehand' || activeTool === 'shape') && (
        <>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Width</span>
            {strokeWidths.map((w) => (
              <button
                key={w}
                onClick={() => setActiveStrokeWidth(w)}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  activeStrokeWidth === w
                    ? 'bg-blue-50 ring-1 ring-blue-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div
                  className="rounded-full bg-gray-700"
                  style={{ width: w * 3 + 2, height: w * 3 + 2 }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
