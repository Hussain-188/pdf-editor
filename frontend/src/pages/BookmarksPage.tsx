import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Upload, Loader2, CheckCircle2, AlertCircle,
  BookmarkIcon, Plus, Trash2, Download,
} from 'lucide-react'
import api from '../lib/api'

interface Bookmark {
  title: string
  pageNumber: number
  level: number
}

export default function BookmarksPage() {
  const [file, setFile] = useState<File | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPage, setNewPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadBookmarks = useCallback(async (pdfFile: File) => {
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', pdfFile)
    try {
      const { data } = await api.post('/tools/bookmarks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBookmarks(data)
    } catch {
      setError('Failed to read bookmarks')
    }
    setLoading(false)
  }, [])

  const handleFileSelect = (pdfFile: File) => {
    setFile(pdfFile)
    setDone(false)
    setError('')
    setBookmarks([])
    loadBookmarks(pdfFile)
  }

  const handleAddBookmark = async () => {
    if (!file || !newTitle.trim()) return
    setProcessing(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', newTitle.trim())
    formData.append('pageNumber', String(newPage))

    try {
      const response = await api.post('/tools/bookmarks/add', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const newFile = new File([response.data], file.name, { type: 'application/pdf' })
      setFile(newFile)
      setNewTitle('')
      loadBookmarks(newFile)
    } catch {
      setError('Failed to add bookmark')
    }
    setProcessing(false)
  }

  const handleRemoveAll = async () => {
    if (!file) return
    setProcessing(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/tools/bookmarks/remove', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const newFile = new File([response.data], file.name, { type: 'application/pdf' })
      setFile(newFile)
      setBookmarks([])
    } catch {
      setError('Failed to remove bookmarks')
    }
    setProcessing(false)
  }

  const handleDownload = () => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '_bookmarked.pdf')
    a.click()
    URL.revokeObjectURL(url)
    setDone(true)
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'application/pdf') handleFileSelect(droppedFile)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tools" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              All tools
            </Link>
            <div className="flex items-center gap-2 text-amber-600">
              <BookmarkIcon className="w-5 h-5" />
              <span className="font-semibold">Edit Bookmarks</span>
            </div>
          </div>
          {file && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {!file ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Edit Bookmarks</h1>
              <p className="text-sm text-gray-500 mt-1">View, add, or remove bookmarks from your PDF</p>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragOver ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-amber-400'
              }`}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">Drop your PDF here or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} found</p>
              </div>
              <button
                onClick={() => { setFile(null); setBookmarks([]); setDone(false) }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change file
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}
            {done && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4" />Downloaded successfully.
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Current Bookmarks</h3>
                {bookmarks.length > 0 && (
                  <button
                    onClick={handleRemoveAll}
                    disabled={processing}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove all
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : bookmarks.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">No bookmarks found</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {bookmarks.map((bm, i) => (
                      <div
                        key={i}
                        className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
                        style={{ paddingLeft: `${20 + bm.level * 16}px` }}
                      >
                        <span className="text-sm text-gray-800">{bm.title}</span>
                        <span className="text-xs text-gray-400">Page {bm.pageNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Bookmark</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Bookmark title"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                <input
                  type="number"
                  value={newPage}
                  min={1}
                  onChange={(e) => setNewPage(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Page"
                />
                <button
                  onClick={handleAddBookmark}
                  disabled={!newTitle.trim() || processing}
                  className="flex items-center gap-1 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
