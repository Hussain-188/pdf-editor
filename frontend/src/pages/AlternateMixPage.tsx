import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Upload, X, Loader2, CheckCircle2, AlertCircle, Shuffle,
} from 'lucide-react'
import api from '../lib/api'

export default function AlternateMixPage() {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [reverseSecond, setReverseSecond] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver1, setDragOver1] = useState(false)
  const [dragOver2, setDragOver2] = useState(false)
  const fileInput1Ref = useRef<HTMLInputElement>(null)
  const fileInput2Ref = useRef<HTMLInputElement>(null)

  const handleProcess = async () => {
    if (!file1 || !file2) return
    setProcessing(true)
    setError('')
    setDone(false)

    const formData = new FormData()
    formData.append('file1', file1)
    formData.append('file2', file2)
    formData.append('reverseSecond', String(reverseSecond))

    try {
      const response = await api.post('/tools/alternate-mix', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'alternate_mixed.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch {
      setError('Processing failed. Please try again.')
    }
    setProcessing(false)
  }

  const handleDrop = useCallback((e: React.DragEvent, setFile: (f: File | null) => void) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile)
      setDone(false)
      setError('')
    }
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const renderDropZone = (
    file: File | null,
    setFile: (f: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement>,
    label: string,
    dragOverState: boolean,
    setDragOver: (v: boolean) => void,
  ) => (
    <div className="flex-1">
      <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { setDragOver(false); handleDrop(e, setFile) }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOverState ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-amber-400 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Drop PDF or click to browse</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setDone(false); setError('') }}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <FileText className="w-8 h-8 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={() => { setFile(null); setDone(false) }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to="/tools" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            All tools
          </Link>
          <div className="flex items-center gap-2 text-amber-600">
            <Shuffle className="w-5 h-5" />
            <span className="font-semibold">Alternate & Mix</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">Alternate & Mix Pages</h1>
            <p className="text-sm text-gray-500 mt-1">
              Interleave pages from two PDF files — great for combining front/back duplex scans.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex gap-4">
              {renderDropZone(file1, setFile1, fileInput1Ref, 'First PDF (A)', dragOver1, setDragOver1)}
              {renderDropZone(file2, setFile2, fileInput2Ref, 'Second PDF (B)', dragOver2, setDragOver2)}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reverseSecond}
                  onChange={(e) => setReverseSecond(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Reverse second file</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Use this for duplex scanning: if you scanned backs in reverse order
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <strong>Result order:</strong>{' '}
              {reverseSecond
                ? 'A1, B(last), A2, B(last-1), A3, B(last-2), ...'
                : 'A1, B1, A2, B2, A3, B3, ...'}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Done! Your file has been downloaded.
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={!file1 || !file2 || processing}
              className="w-full py-3 text-sm font-semibold bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mixing pages...
                </>
              ) : (
                <>
                  <Shuffle className="w-4 h-4" />
                  Mix Pages
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
