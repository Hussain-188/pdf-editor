import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'

interface UploadedDoc {
  id: string
  title: string
  pageCount: number
  fileSizeBytes: number
}

interface UploadDropzoneProps {
  onUploadComplete?: (doc: UploadedDoc) => void
  compact?: boolean
}

export default function UploadDropzone({ onUploadComplete, compact }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isAuthenticated } = useAuthStore()
  const { initSession } = useGuestStore()

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted')
      return
    }

    setError('')
    setUploading(true)
    setProgress(0)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)

      if (!isAuthenticated) {
        const token = await initSession()
        formData.append('guestToken', token)
      }

      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })

      onUploadComplete?.(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setProgress(0)
      setFileName('')
    }
  }, [isAuthenticated, initSession, onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }, [uploadFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl text-center transition-all duration-200 ${
        compact ? 'p-6' : 'p-10'
      } ${
        uploading ? 'cursor-default' : 'cursor-pointer'
      } ${
        dragging
          ? 'border-primary-400 bg-primary-50 scale-[1.01]'
          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploading ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            <span className="text-sm font-medium text-gray-700">Uploading...</span>
          </div>
          <div className="flex items-center gap-3 max-w-xs mx-auto">
            <FileText className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-xs text-gray-500 truncate">{fileName}</span>
          </div>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{progress}%</p>
        </div>
      ) : (
        <>
          <Upload className={`mx-auto text-gray-400 mb-3 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
          <p className="text-gray-700 font-medium">
            {compact ? 'Drop PDF here or click to browse' : 'Drop your PDF here or click to browse'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {isAuthenticated ? 'PDF files up to 200 MB' : 'PDF files up to 50 MB (guest)'}
          </p>
        </>
      )}

      {error && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}
