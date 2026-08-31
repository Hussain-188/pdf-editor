import { useState, useRef, useCallback } from 'react'
import { RotateCw, Trash2, Copy, Plus } from 'lucide-react'

interface PagePanelProps {
  pageCount: number
  currentPage: number
  scale: number
  onPageClick: (page: number) => void
  onRotate: (page: number, degrees: number) => void
  onDelete: (page: number) => void
  onDuplicate: (page: number) => void
  onInsertBlank: (afterPage: number) => void
  onReorder: (newOrder: number[]) => void
  thumbnailUrls: Map<number, string>
}

export default function PagePanel({
  pageCount,
  currentPage,
  onPageClick,
  onRotate,
  onDelete,
  onDuplicate,
  onInsertBlank,
  onReorder,
  thumbnailUrls,
}: PagePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ page: number; x: number; y: number } | null>(null)
  const [hoveredPage, setHoveredPage] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)

  const handleDragStart = useCallback((e: React.DragEvent, page: number) => {
    setDragIndex(page)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(page))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, page: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(page)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetPage: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetPage) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const newOrder = pages.filter((p) => p !== dragIndex)
    const targetIdx = newOrder.indexOf(targetPage)
    newOrder.splice(dragIndex < targetPage ? targetIdx + 1 : targetIdx, 0, dragIndex)
    onReorder(newOrder)
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, pages, onReorder])

  const handleContextMenu = useCallback((e: React.MouseEvent, page: number) => {
    e.preventDefault()
    setContextMenu({ page, x: e.clientX, y: e.clientY })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  return (
    <div
      ref={panelRef}
      className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden shrink-0"
      onClick={closeContextMenu}
    >
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between bg-white">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pages</span>
        <button
          onClick={() => onInsertBlank(pageCount)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          title="Add blank page"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((page) => {
          const thumbUrl = thumbnailUrls.get(page)
          const isActive = page === currentPage
          const isDragOver = page === dragOverIndex && dragIndex !== null
          const isHovered = hoveredPage === page

          return (
            <div
              key={page}
              draggable
              onDragStart={(e) => handleDragStart(e, page)}
              onDragOver={(e) => handleDragOver(e, page)}
              onDrop={(e) => handleDrop(e, page)}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
              onContextMenu={(e) => handleContextMenu(e, page)}
              onClick={() => onPageClick(page)}
              onMouseEnter={() => setHoveredPage(page)}
              onMouseLeave={() => setHoveredPage(null)}
              className={`relative cursor-pointer rounded-lg overflow-hidden transition-all group ${
                isActive
                  ? 'ring-2 ring-blue-500 shadow-md'
                  : 'ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow-sm'
              } ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''} ${
                dragIndex === page ? 'opacity-40 scale-95' : ''
              }`}
            >
              <div className="aspect-[3/4] bg-white flex items-center justify-center overflow-hidden">
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Page ${page}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-10 rounded border border-gray-200 bg-gray-50" />
                    <span className="text-[10px] text-gray-400">Loading...</span>
                  </div>
                )}
              </div>

              <div className={`absolute bottom-0 inset-x-0 flex items-center justify-center py-1 text-[10px] font-medium ${
                isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {page}
              </div>

              {isHovered && !dragIndex && (
                <div className="absolute top-1 right-1 flex gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRotate(page, 90) }}
                    className="p-1 bg-white/90 rounded shadow-sm hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Rotate"
                  >
                    <RotateCw size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(page) }}
                    className="p-1 bg-white/90 rounded shadow-sm hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={11} />
                  </button>
                  {pageCount > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(page) }}
                      className="p-1 bg-white/90 rounded shadow-sm hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onRotate(contextMenu.page, 90); closeContextMenu() }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <RotateCw size={12} /> Rotate clockwise
          </button>
          <button
            onClick={() => { onRotate(contextMenu.page, 270); closeContextMenu() }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <RotateCw size={12} className="scale-x-[-1]" /> Rotate counter-clockwise
          </button>
          <button
            onClick={() => { onDuplicate(contextMenu.page); closeContextMenu() }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <Copy size={12} /> Duplicate page
          </button>
          <button
            onClick={() => { onInsertBlank(contextMenu.page); closeContextMenu() }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <Plus size={12} /> Insert blank after
          </button>
          <hr className="my-1 border-gray-100" />
          <button
            onClick={() => { onDelete(contextMenu.page); closeContextMenu() }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600"
            disabled={pageCount <= 1}
          >
            <Trash2 size={12} /> Delete page
          </button>
        </div>
      )}
    </div>
  )
}
