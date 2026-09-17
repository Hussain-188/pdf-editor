import { useState } from 'react'
import { Download, X, FileText, Image, Loader2 } from 'lucide-react'
import { usePdfStore } from '../../stores/pdfStore'
import { downloadPdf } from '../../lib/pdfOperations'
import api from '../../lib/api'

interface ExportDialogProps {
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

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [dpi, setDpi] = useState(150)
  const [exporting, setExporting] = useState(false)

  if (!open) return null

  const handleExport = async () => {
    setExporting(true)
    try {
      const { pdfBytes, fileName } = usePdfStore.getState()
      if (!pdfBytes) return

      if (format === 'pdf') {
        downloadPdf(pdfBytes, fileName || 'document.pdf')
      } else {
        const formData = new FormData()
        formData.append('file', new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }), 'document.pdf')
        formData.append('format', format)
        formData.append('dpi', String(dpi))

        const response = await api.post('/tools/pdf-to-images', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        const url = URL.createObjectURL(response.data)
        const a = document.createElement('a')
        a.href = url
        a.download = 'pages.zip'
        a.click()
        URL.revokeObjectURL(url)
      }
      onClose()
    } catch { /* ignore */ }
    setExporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[420px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
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
