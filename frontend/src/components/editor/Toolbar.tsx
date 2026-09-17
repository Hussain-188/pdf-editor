import { useState } from 'react'
import {
  ArrowLeft, Download, ZoomIn, ZoomOut, Type, Pencil, LayoutGrid, ChevronDown,
  PenTool, Search,
} from 'lucide-react'

export type EditorMode = 'edit' | 'annotate' | 'pages'

interface ToolbarProps {
  scale: number
  currentPage: number
  totalPages: number
  documentTitle: string
  onZoomIn: () => void
  onZoomOut: () => void
  onScaleChange: (scale: number) => void
  onBack: () => void
  onExport: () => void
  onDownload: () => void
  onSign: () => void
  onFindReplace: () => void
  editorMode: EditorMode
  onModeChange: (mode: EditorMode) => void
}

const modes: { key: EditorMode; label: string; Icon: typeof Type }[] = [
  { key: 'edit', label: 'Edit Text', Icon: Type },
  { key: 'annotate', label: 'Annotate', Icon: Pencil },
  { key: 'pages', label: 'Pages', Icon: LayoutGrid },
]

export default function Toolbar({
  scale, currentPage, totalPages, documentTitle,
  onZoomIn, onZoomOut, onScaleChange, onBack,
  onExport, onDownload, onSign, onFindReplace, editorMode, onModeChange,
}: ToolbarProps) {
  const [showZoomMenu, setShowZoomMenu] = useState(false)
  const scalePercent = Math.round(scale * 100)

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-3 gap-1 shrink-0 shadow-sm">
      <button
        onClick={onBack}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Back to home"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <span className="text-sm font-medium text-gray-800 truncate max-w-[240px] px-2 py-1">
        {documentTitle}
      </span>

      <div className="flex-1" />

      <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
        {modes.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              editorMode === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={onZoomOut}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-gray-100 text-xs font-medium text-gray-600 min-w-[52px] justify-center"
          >
            {scalePercent}%
            <ChevronDown size={12} />
          </button>
          {showZoomMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowZoomMenu(false)} />
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[80px]">
                {[50, 75, 100, 125, 150, 200, 300].map((v) => (
                  <button
                    key={v}
                    onClick={() => { onScaleChange(v / 100); setShowZoomMenu(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                      scalePercent === v ? 'text-blue-600 font-medium' : 'text-gray-600'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onZoomIn}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <span className="text-xs text-gray-400 tabular-nums px-2">
        {currentPage} / {totalPages}
      </span>

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <button
        onClick={onFindReplace}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Find & Replace (Ctrl+F)"
      >
        <Search size={16} />
      </button>
      <button
        onClick={onSign}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Add Signature"
      >
        <PenTool size={16} />
      </button>
      <button
        onClick={onDownload}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Download PDF"
      >
        <Download size={16} />
      </button>
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <Download size={14} />
        Export
      </button>
    </div>
  )
}
