import { useState } from 'react'
import api from '../../lib/api'

interface ExportDialogProps {
  documentId: string
  pageCount: number
  open: boolean
  onClose: () => void
}

type ExportFormat = 'pdf' | 'png' | 'jpg'

export default function ExportDialog({ documentId, pageCount, open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [pageSelection, setPageSelection] = useState<'all' | 'custom'>('all')
  const [customPages, setCustomPages] = useState('')
  const [dpi, setDpi] = useState(150)
  const [exporting, setExporting] = useState(false)

  if (!open) return null

  const parsePageRange = (input: string): number[] => {
    const pages = new Set<number>()
    input.split(',').forEach((part) => {
      const range = part.trim().split('-')
      if (range.length === 2) {
        const start = parseInt(range[0])
        const end = parseInt(range[1])
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= Math.min(end, pageCount); i++) pages.add(i)
        }
      } else {
        const p = parseInt(range[0])
        if (!isNaN(p) && p >= 1 && p <= pageCount) pages.add(p)
      }
    })
    return Array.from(pages).sort((a, b) => a - b)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const pages = pageSelection === 'custom' ? parsePageRange(customPages) : undefined

      let url: string
      if (format === 'pdf') {
        const { data } = await api.post(`/documents/${documentId}/export`, {
          format: 'pdf',
          pageRange: pages,
          flattenAnnotations: true,
        })
        url = data.url
      } else {
        const { data } = await api.post(`/documents/${documentId}/export/images`, {
          format,
          dpi,
          pages,
        })
        url = data.url
      }

      const a = document.createElement('a')
      a.href = url
      a.download = format === 'pdf' ? 'document.pdf' : 'pages.zip'
      a.click()
      onClose()
    } catch { /* ignore */ }
    setExporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Export Document</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Format</label>
            <div className="flex gap-2">
              {(['pdf', 'png', 'jpg'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 text-xs rounded border ${
                    format === f
                      ? 'bg-primary-100 border-primary-400 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Pages</label>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  checked={pageSelection === 'all'}
                  onChange={() => setPageSelection('all')}
                />
                All ({pageCount})
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  checked={pageSelection === 'custom'}
                  onChange={() => setPageSelection('custom')}
                />
                Custom
              </label>
            </div>
            {pageSelection === 'custom' && (
              <input
                type="text"
                value={customPages}
                onChange={(e) => setCustomPages(e.target.value)}
                placeholder="e.g., 1-3, 5, 8"
                className="mt-1 w-full px-2 py-1 text-xs border rounded"
              />
            )}
          </div>

          {format !== 'pdf' && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">DPI</label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs border rounded"
              >
                <option value={72}>72 (Screen)</option>
                <option value={150}>150 (Standard)</option>
                <option value={300}>300 (High quality)</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
