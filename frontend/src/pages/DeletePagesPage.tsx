import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Upload, Loader2, CheckCircle2, AlertCircle, Trash2,
} from 'lucide-react'
import { getDocument } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import '../lib/pdfWorker'
import api from '../lib/api'

interface PageInfo {
  number: number
  thumbnailUrl: string
  selected: boolean
}

export default function DeletePagesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPdf = useCallback(async (pdfFile: File) => {
    setLoading(true)
    setError('')
    try {
      const arrayBuffer = await pdfFile.arrayBuffer()
      const doc: PDFDocumentProxy = await getDocument({ data: arrayBuffer }).promise
      const pageInfos: PageInfo[] = []

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 0.3 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width
        canvas.height = vp.height
        await page.render({ canvas, viewport: vp }).promise
        pageInfos.push({ number: i, thumbnailUrl: canvas.toDataURL(), selected: false })
      }

      setPages(pageInfos)
      doc.cleanup()
    } catch {
      setError('Failed to load PDF')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (file) loadPdf(file)
  }, [file, loadPdf])

  const togglePage = (pageNum: number) => {
    setPages((prev) =>
      prev.map((p) => (p.number === pageNum ? { ...p, selected: !p.selected } : p))
    )
  }

  const selectedCount = pages.filter((p) => p.selected).length
  const keepPages = pages.filter((p) => !p.selected).map((p) => p.number)

  const handleProcess = async () => {
    if (!file || keepPages.length === 0) return
    setProcessing(true)
    setError('')
    setDone(false)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('pages', keepPages.join(','))

    try {
      const response = await api.post('/tools/extract', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace('.pdf', '_pages_removed.pdf')
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch {
      setError('Processing failed. Please try again.')
    }
    setProcessing(false)
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile)
      setDone(false)
      setError('')
      setPages([])
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to="/tools" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            All tools
          </Link>
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            <span className="font-semibold">Delete Pages</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {!file ? (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Delete Pages</h1>
                <p className="text-sm text-gray-500 mt-1">Select and remove specific pages from your PDF</p>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Drop your PDF here or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setPages([]); setDone(false) }}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{pages.length} pages — click pages to mark for deletion</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setFile(null); setPages([]); setDone(false) }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Change file
                </button>
                <button
                  onClick={handleProcess}
                  disabled={processing || selectedCount === 0 || keepPages.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {processing ? 'Removing...' : `Remove ${selectedCount} page${selectedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Done! Your file has been downloaded.
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {pages.map((page) => (
                  <button
                    key={page.number}
                    onClick={() => togglePage(page.number)}
                    className={`group relative rounded-xl border-2 overflow-hidden transition-all ${
                      page.selected
                        ? 'border-red-500 ring-2 ring-red-200 opacity-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <img src={page.thumbnailUrl} alt={`Page ${page.number}`} className="w-full" />
                    {page.selected && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <Trash2 className="w-8 h-8 text-red-600" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                      <span className="text-xs font-medium text-white">{page.number}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {keepPages.length === 0 && pages.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm text-center">
                You can't delete all pages. Deselect at least one page to keep.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
