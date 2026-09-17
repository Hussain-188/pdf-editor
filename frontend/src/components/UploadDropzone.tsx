import { useState, useCallback, useRef } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { usePdfStore } from '../stores/pdfStore'

interface UploadDropzoneProps {
  onUploadComplete?: (info: { name: string; size: number }) => void
  compact?: boolean
}

export default function UploadDropzone({ onUploadComplete, compact }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setPdf = usePdfStore((s) => s.setPdf)

  const loadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted')
      return
    }

    setError('')
    try {
      const buffer = await file.arrayBuffer()
      setPdf(new Uint8Array(buffer), file.name)
      onUploadComplete?.({ name: file.name, size: file.size })
    } catch {
      setError('Failed to read file. Please try again.')
    }
  }, [setPdf, onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [loadFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }, [loadFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl text-center transition-all duration-200 cursor-pointer ${
        compact ? 'p-6' : 'p-10'
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

      <Upload className={`mx-auto text-gray-400 mb-3 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
      <p className="text-gray-700 font-medium">
        {compact ? 'Drop PDF here or click to browse' : 'Drop your PDF here or click to browse'}
      </p>
      <p className="text-gray-400 text-sm mt-1">PDF files up to 200 MB</p>

      {error && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}
