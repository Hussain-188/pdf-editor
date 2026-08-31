import { useState } from 'react'
import { Download, X, FileText, Image, Loader2 } from 'lucide-react'
import api from '../../lib/api'

interface ExportDialogProps {
  documentId: string
  pageCount: number
  open: boolean
  onClose: () => void
}

type ExportFormat = 'pdf' | 'png' | 'jpg'

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'pdf', label: 'PDF', icon: <FileText className="w-5 h-5" />, desc: 'Original document format' },
  { value: 'png', label: 'PNG', icon: <Image className="w-5 h-5" />, desc: 'Lossless image' },
  { value: 'jpg', label: 'JPG', icon: <Image className="w-5 h-5" />, desc: 'Compressed image' },
]

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[420px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Export Document</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Format */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    format === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pages */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Pages</label>
            <div className="flex gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={pageSelection === 'all'}
                  onChange={() => setPageSelection('all')}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">All pages ({pageCount})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={pageSelection === 'custom'}
                  onChange={() => setPageSelection('custom')}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Custom</span>
              </label>
            </div>
            {pageSelection === 'custom' && (
              <input
                type="text"
                value={customPages}
                onChange={(e) => setCustomPages(e.target.value)}
                placeholder="e.g. 1-3, 5, 8"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            )}
          </div>

          {/* DPI (images only) */}
          {format !== 'pdf' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 72, label: 'Screen', desc: '72 DPI' },
                  { value: 150, label: 'Standard', desc: '150 DPI' },
                  { value: 300, label: 'High', desc: '300 DPI' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDpi(opt.value)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                      dpi === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-semibold text-gray-800 block">{opt.label}</span>
                    <span className="text-[10px] text-gray-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
