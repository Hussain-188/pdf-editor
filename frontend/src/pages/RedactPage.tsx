import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDocument } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import '../lib/pdfWorker'
import {
  ArrowLeft, FileText, Upload, Loader2, CheckCircle2, AlertCircle,
  Download, EyeOff, X, Undo2,
} from 'lucide-react'
import api from '../lib/api'

interface RedactRegion {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
}

export default function RedactPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageImages, setPageImages] = useState<string[]>([])
  const [pageDimensions, setPageDimensions] = useState<{ w: number; h: number }[]>([])
  const [regions, setRegions] = useState<RedactRegion[]>([])
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ page: number; x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scale = 1.0

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setRegions([])
    setDone(false)
    setError('')
    setLoading(true)

    try {
      const data = await selectedFile.arrayBuffer()
      const doc = await getDocument({ data }).promise
      setPdfDoc(doc)

      const images: string[] = []
      const dims: { w: number; h: number }[] = []

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale })
        dims.push({ w: vp.width, h: vp.height })

        const canvas = document.createElement('canvas')
        canvas.width = vp.width
        canvas.height = vp.height
        await page.render({ canvas, viewport: vp }).promise
        images.push(canvas.toDataURL())
      }

      setPageImages(images)
      setPageDimensions(dims)
    } catch {
      setError('Failed to load PDF')
    }
    setLoading(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile?.type === 'application/pdf') handleFileSelect(droppedFile)
    },
    [handleFileSelect]
  )

  const handleMouseDown = (pageIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setDrawing(true)
    setDrawStart({
      page: pageIdx,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseUp = (pageIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing || !drawStart || drawStart.page !== pageIdx) return
    setDrawing(false)

    const rect = e.currentTarget.getBoundingClientRect()
    const endX = e.clientX - rect.left
    const endY = e.clientY - rect.top

    const x = Math.min(drawStart.x, endX)
    const y = Math.min(drawStart.y, endY)
    const width = Math.abs(endX - drawStart.x)
    const height = Math.abs(endY - drawStart.y)

    if (width > 5 && height > 5) {
      const dim = pageDimensions[pageIdx]
      const pdfX = x
      const pdfY = dim.h - y - height
      setRegions((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          page: pageIdx + 1,
          x: pdfX,
          y: pdfY,
          width,
          height,
        },
      ])
      setDone(false)
    }
    setDrawStart(null)
  }

  const removeRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id))
    setDone(false)
  }

  const handleApply = async () => {
    if (!file || regions.length === 0) return
    setProcessing(true)
    setError('')
    setDone(false)

    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      'regions',
      JSON.stringify(
        regions.map((r) => ({
          page: r.page,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        }))
      )
    )

    try {
      const response = await api.post('/tools/redact', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace('.pdf', '_redacted.pdf')
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Redaction failed')
    }
    setProcessing(false)
  }

  useEffect(() => {
    return () => { pdfDoc?.cleanup() }
  }, [pdfDoc])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <FileText className="w-6 h-6" />
            PDF Editor
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link
          to="/tools"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          All tools
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
            <div className="text-gray-700">
              <EyeOff className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Redact PDF</h2>
              <p className="text-sm text-gray-500">Draw rectangles over content to permanently black it out</p>
            </div>
          </div>

          <div className="p-8">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Drop your PDF here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Draw rectangles on the PDF to redact areas</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-3" />
                <p className="text-sm text-gray-500">Loading PDF...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{regions.length} redaction area{regions.length !== 1 ? 's' : ''}</span>
                    {regions.length > 0 && (
                      <button
                        onClick={() => { setRegions([]); setDone(false) }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Undo2 className="w-3 h-3" /> Clear all
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => { setFile(null); setPdfDoc(null); setPageImages([]); setRegions([]); setDone(false); setError('') }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" /> Change file
                  </button>
                </div>

                <div className="bg-gray-100 rounded-xl p-4 mb-4 text-xs text-gray-500 text-center">
                  Click and drag on the PDF to mark areas for redaction
                </div>

                <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
                  {pageImages.map((imgSrc, pageIdx) => (
                    <div key={pageIdx} className="relative border border-gray-200 rounded-lg overflow-hidden">
                      <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Page {pageIdx + 1}
                      </div>
                      <div
                        className="relative cursor-crosshair select-none"
                        onMouseDown={(e) => handleMouseDown(pageIdx, e)}
                        onMouseUp={(e) => handleMouseUp(pageIdx, e)}
                      >
                        <img src={imgSrc} alt={`Page ${pageIdx + 1}`} className="w-full" draggable={false} />
                        {regions
                          .filter((r) => r.page === pageIdx + 1)
                          .map((r) => {
                            const dim = pageDimensions[pageIdx]
                            const screenY = dim.h - r.y - r.height
                            return (
                              <div
                                key={r.id}
                                className="absolute bg-black/80 border border-red-500 group"
                                style={{
                                  left: r.x,
                                  top: screenY,
                                  width: r.width,
                                  height: r.height,
                                }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeRegion(r.id) }}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Done! Your redacted PDF has been downloaded.
              </div>
            )}

            {regions.length > 0 && (
              <button
                onClick={handleApply}
                disabled={processing}
                className="w-full py-3 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redacting...
                  </>
                ) : done ? (
                  <>
                    <Download className="w-4 h-4" />
                    Download Again
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Redact {regions.length} Area{regions.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
