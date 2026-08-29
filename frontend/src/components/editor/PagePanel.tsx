import { useState, useRef, useCallback } from 'react'

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
      className="w-48 bg-white border-r flex flex-col overflow-hidden"
      onClick={closeContextMenu}
    >
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Pages</span>
        <button
          onClick={() => onInsertBlank(pageCount)}
          className="text-xs text-primary-600 hover:text-primary-800"
          title="Add blank page"
        >
          + Page
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pages.map((page) => {
          const thumbUrl = thumbnailUrls.get(page)
          const isActive = page === currentPage
          const isDragOver = page === dragOverIndex && dragIndex !== null

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
              className={`relative cursor-pointer rounded border transition-all ${
                isActive
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-400'
              } ${isDragOver ? 'border-t-4 border-t-primary-500' : ''} ${
                dragIndex === page ? 'opacity-40' : ''
              }`}
            >
              <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center overflow-hidden rounded-t">
                {thumbUrl ? (
                  <img src={thumbUrl} alt={`Page ${page}`} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-xs">Page {page}</span>
                )}
              </div>
              <div className="text-center py-0.5 text-[10px] text-gray-500 bg-gray-50 rounded-b">
                {page}
              </div>
            </div>
          )
        })}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white border rounded shadow-lg py-1 z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onRotate(contextMenu.page, 90); closeContextMenu() }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
          >
            Rotate clockwise
          </button>
          <button
            onClick={() => { onRotate(contextMenu.page, 270); closeContextMenu() }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
          >
            Rotate counter-clockwise
          </button>
          <button
            onClick={() => { onDuplicate(contextMenu.page); closeContextMenu() }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
          >
            Duplicate page
          </button>
          <button
            onClick={() => { onInsertBlank(contextMenu.page); closeContextMenu() }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
          >
            Insert blank after
          </button>
          <hr className="my-1" />
          <button
            onClick={() => { onDelete(contextMenu.page); closeContextMenu() }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            disabled={pageCount <= 1}
          >
            Delete page
          </button>
        </div>
      )}
    </div>
  )
}
