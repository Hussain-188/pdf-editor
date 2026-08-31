import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Upload, Loader2, CheckCircle2, AlertCircle,
  Download, RotateCw, Trash2, GripVertical, X,
} from 'lucide-react'
import api from '../lib/api'

interface PageItem {
  pageNumber: number
  rotation: number
  deleted: boolean
  thumbnail: string
  width: number
  height: number
}

export default function OrganizePage() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setPages([])
    setDone(false)
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const { data } = await api.post('/tools/organize/info', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPages(
        data.map((p: any) => ({
          pageNumber: p.pageNumber,
          rotation: 0,
          deleted: false,
          thumbnail: p.thumbnail,
          width: p.width,
          height: p.height,
        }))
      )
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load PDF')
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

  const rotatePage = (idx: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    )
    setDone(false)
  }

  const toggleDelete = (idx: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, deleted: !p.deleted } : p))
    )
    setDone(false)
  }

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setPages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(idx)
    setDone(false)
  }
  const handleDragEnd = () => setDragIdx(null)

  const handleApply = async () => {
    if (!file || pages.length === 0) return
    const activePages = pages.filter((p) => !p.deleted)
    if (activePages.length === 0) {
      setError('Cannot delete all pages')
      return
    }

    setProcessing(true)
    setError('')
    setDone(false)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('order', activePages.map((p) => p.pageNumber).join(','))
    formData.append('rotations', activePages.map((p) => p.rotation).join(','))

    try {
      const response = await api.post('/tools/organize', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace('.pdf', '_organized.pdf')
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Processing failed')
    }
    setProcessing(false)
  }

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

      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          to="/tools"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          All tools
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
            <div className="text-lime-600">
              <GripVertical className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Organize PDF</h2>
              <p className="text-sm text-gray-500">Reorder, rotate, and delete pages</p>
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
                <p className="text-sm text-gray-400 mt-1">Max file size: 200 MB</p>
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
                <p className="text-sm text-gray-500">Loading pages...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">{pages.filter((p) => !p.deleted).length} of {pages.length} pages</span>
                  <button
                    onClick={() => { setFile(null); setPages([]); setDone(false); setError('') }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" /> Change file
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 mb-6">
                  {pages.map((page, idx) => (
                    <div
                      key={`${page.pageNumber}-${idx}`}
                      draggable={!page.deleted}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`relative group rounded-lg border transition-all ${
                        page.deleted
                          ? 'opacity-40 border-red-300 bg-red-50'
                          : dragIdx === idx
                          ? 'border-primary-300 opacity-70 shadow-lg'
                          : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                      }`}
                    >
                      <div className="p-2">
                        <img
                          src={page.thumbnail}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full rounded border border-gray-100"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                      </div>

                      <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">
                        {page.pageNumber}
                      </div>

                      {!page.deleted && (
                        <GripVertical className="absolute top-1 right-1 w-4 h-4 text-white/80 drop-shadow cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}

                      <div className="flex items-center justify-center gap-1 px-2 pb-2">
                        <button
                          onClick={() => rotatePage(idx)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="Rotate 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleDelete(idx)}
                          className={`p-1 rounded hover:bg-gray-100 ${
                            page.deleted ? 'text-green-600' : 'text-red-500 hover:text-red-700'
                          }`}
                          title={page.deleted ? 'Restore' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                Done! Your organized PDF has been downloaded.
              </div>
            )}

            {pages.length > 0 && (
              <button
                onClick={handleApply}
                disabled={processing}
                className="w-full py-3 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : done ? (
                  <>
                    <Download className="w-4 h-4" />
                    Download Again
                  </>
                ) : (
                  'Apply Changes & Download'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
