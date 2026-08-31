import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Upload, FileText, X,
  Loader2, CheckCircle2, AlertCircle, Scissors, Download,
} from 'lucide-react'
import api from '../lib/api'

type SplitMode = 'all' | 'ranges' | 'interval'

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<SplitMode>('all')
  const [ranges, setRanges] = useState('')
  const [interval, setInterval] = useState(2)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile)
      setDone(false)
      setError('')
    }
  }, [])

  const handleSplit = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    setDone(false)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)
    if (mode === 'ranges') formData.append('ranges', ranges)
    if (mode === 'interval') formData.append('interval', String(interval))

    try {
      const response = await api.post('/tools/split', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'split.zip'
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Split failed. Please try again.')
    }
    setProcessing(false)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
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

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          to="/tools"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          All tools
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
            <div className="text-indigo-600">
              <Scissors className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Split PDF</h2>
              <p className="text-sm text-gray-500">
                Split a PDF into multiple files by pages
              </p>
            </div>
          </div>

          <div className="p-8">
            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null)
                    setDone(false)
                    setError('')
                  }}
                  className="hidden"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                  <FileText className="w-10 h-10 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null)
                      setDone(false)
                      setError('')
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Split Mode
                  </h3>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === 'all'}
                      onChange={() => setMode('all')}
                      className="mt-0.5 text-primary-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Split every page
                      </p>
                      <p className="text-xs text-gray-500">
                        Each page becomes its own PDF file
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === 'ranges'}
                      onChange={() => setMode('ranges')}
                      className="mt-0.5 text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Split by page ranges
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        e.g. 1-3, 4-6, 7-10
                      </p>
                      {mode === 'ranges' && (
                        <input
                          type="text"
                          value={ranges}
                          onChange={(e) => setRanges(e.target.value)}
                          placeholder="1-3, 4-6, 7-10"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        />
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === 'interval'}
                      onChange={() => setMode('interval')}
                      className="mt-0.5 text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Split by fixed interval
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        Group every N pages
                      </p>
                      {mode === 'interval' && (
                        <input
                          type="number"
                          value={interval}
                          onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          min={1}
                          className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        />
                      )}
                    </div>
                  </label>
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
                Done! Your split files (ZIP) have been downloaded.
              </div>
            )}

            {file && (
              <button
                onClick={handleSplit}
                disabled={processing || (mode === 'ranges' && !ranges.trim())}
                className="w-full py-3 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Splitting...
                  </>
                ) : done ? (
                  <>
                    <Download className="w-4 h-4" />
                    Split Again
                  </>
                ) : (
                  'Split PDF'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
