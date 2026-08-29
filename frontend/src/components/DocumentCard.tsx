import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function DocumentCard({ document, onUpdate }: DocumentCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(document.title)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

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
    <div className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow group relative">
      <div
        onClick={() => navigate(`/editor/${document.id}`)}
        className="cursor-pointer"
      >
        <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
          {document.thumbnailUrl ? (
            <img
              src={document.thumbnailUrl}
              alt={document.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>
      </div>

      <div className="p-3">
        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
            className="w-full text-sm font-medium border rounded px-1 py-0.5 focus:ring-1 focus:ring-primary-500"
          />
        ) : (
          <h3 className="text-sm font-medium text-gray-900 truncate">{document.title}</h3>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {document.pageCount} page{document.pageCount !== 1 ? 's' : ''} · {formatSize(document.fileSizeBytes)}
        </p>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="p-1 bg-white/90 rounded-md shadow-sm hover:bg-gray-100"
        >
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white border rounded-lg shadow-lg py-1 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setRenaming(true) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Rename
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
