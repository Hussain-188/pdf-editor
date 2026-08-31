import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-react'
import api from '../lib/api'

interface DocumentItem {
  id: string
  title: string
  originalFilename: string
  pageCount: number
  fileSizeBytes: number
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

interface DocumentCardProps {
  document: DocumentItem
  onUpdate: () => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DocumentCard({ document, onUpdate }: DocumentCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(document.title)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleRename = async () => {
    if (title.trim() && title !== document.title) {
      try {
        await api.patch(`/documents/${document.id}`, { title: title.trim() })
        onUpdate()
      } catch { /* ignore */ }
    }
    setRenaming(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this document?')) return
    try {
      await api.delete(`/documents/${document.id}`)
      onUpdate()
    } catch { /* ignore */ }
    setMenuOpen(false)
  }

  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 relative">
      <div
        onClick={() => navigate(`/editor/${document.id}`)}
        className="cursor-pointer"
      >
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden relative">
          {document.thumbnailUrl ? (
            <img
              src={document.thumbnailUrl}
              alt={document.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-gray-300" strokeWidth={1.2} />
              <span className="text-xs text-gray-400 font-medium">{document.pageCount} page{document.pageCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3.5">
        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setTitle(document.title); setRenaming(false) }
            }}
            className="w-full text-sm font-semibold border border-primary-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="text-sm font-semibold text-gray-900 truncate" title={document.title}>
            {document.title}
          </h3>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-500">
            {document.pageCount} pg · {formatSize(document.fileSizeBytes)}
          </p>
          <p className="text-xs text-gray-400">
            {formatRelativeDate(document.updatedAt)}
          </p>
        </div>
      </div>

      <div ref={menuRef} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-white hover:shadow transition-all"
        >
          <MoreVertical className="h-4 w-4 text-gray-600" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 animate-scale-in">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setRenaming(true) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <div className="border-t border-gray-100 my-0.5" />
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
