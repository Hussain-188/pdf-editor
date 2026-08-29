interface ToolbarProps {
  scale: number
  currentPage: number
  totalPages: number
  documentTitle: string
  onZoomIn: () => void
  onZoomOut: () => void
  onScaleChange: (scale: number) => void
  onBack: () => void
  onUndo: () => void
  onRedo: () => void
}

export default function Toolbar({
  scale, currentPage, totalPages, documentTitle,
  onZoomIn, onZoomOut, onScaleChange, onBack, onUndo, onRedo,
}: ToolbarProps) {
  const scalePercent = Math.round(scale * 100)

  return (
    <div className="h-12 bg-white border-b flex items-center px-4 gap-3 shrink-0">
      <button onClick={onBack} className="text-gray-600 hover:text-gray-900 mr-2">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{documentTitle}</span>

      <div className="flex items-center gap-1 ml-4 border-l pl-4">
        <button onClick={onUndo} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Undo (Ctrl+Z)">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
          </svg>
        </button>
        <button onClick={onRedo} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Redo (Ctrl+Y)">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
          </svg>
        </button>
      </div>

      <div className="flex-1" />

      <span className="text-xs text-gray-500">
        Page {currentPage} of {totalPages}
      </span>

      <div className="flex items-center gap-1 ml-4">
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          title="Zoom out"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <select
          value={scalePercent}
          onChange={(e) => onScaleChange(parseInt(e.target.value) / 100)}
          className="text-xs border rounded px-1 py-1 w-16 text-center"
        >
          {[50, 75, 100, 125, 150, 200, 300].map((v) => (
            <option key={v} value={v}>{v}%</option>
          ))}
          {![50, 75, 100, 125, 150, 200, 300].includes(scalePercent) && (
            <option value={scalePercent}>{scalePercent}%</option>
          )}
        </select>

        <button
          onClick={onZoomIn}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          title="Zoom in"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
