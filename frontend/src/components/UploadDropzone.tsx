import { useState, useCallback, useRef } from 'react'
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
}

export default function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
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
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
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
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
        dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
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
          <p className="text-gray-700 font-medium">Uploading...</p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{progress}%</p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 16v-8m0 0l-3 3m3-3l3 3M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
          </div>
          <p className="text-gray-700 font-medium">Drop a PDF here or click to browse</p>
          <p className="text-gray-400 text-sm mt-1">
            {isAuthenticated ? 'Up to 200MB' : 'Up to 50MB (guest limit)'}
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
