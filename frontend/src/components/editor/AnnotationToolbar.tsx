import { useAnnotationStore, type AnnotationType } from '../../stores/annotationStore'

const tools: { type: AnnotationType; label: string; icon: string }[] = [
  { type: 'textbox', label: 'Text Box', icon: 'T' },
  { type: 'highlight', label: 'Highlight', icon: 'H' },
  { type: 'freehand', label: 'Draw', icon: 'D' },
  { type: 'shape', label: 'Shape', icon: 'S' },
  { type: 'sticky', label: 'Note', icon: 'N' },
]

const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#000000']

export default function AnnotationToolbar() {
  const activeTool = useAnnotationStore((s) => s.activeTool)
  const setActiveTool = useAnnotationStore((s) => s.setActiveTool)
  const activeColor = useAnnotationStore((s) => s.activeColor)
  const setActiveColor = useAnnotationStore((s) => s.setActiveColor)

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => setActiveTool(activeTool === tool.type ? null : tool.type)}
          className={`px-2 py-1 text-xs rounded ${
            activeTool === tool.type
              ? 'bg-primary-100 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title={tool.label}
        >
          {tool.label}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {colors.map((color) => (
        <button
          key={color}
          onClick={() => setActiveColor(color)}
          className={`w-5 h-5 rounded-full border-2 ${
            activeColor === color ? 'border-gray-800' : 'border-gray-200'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
