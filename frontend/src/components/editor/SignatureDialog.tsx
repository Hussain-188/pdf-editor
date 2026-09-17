import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Pencil, Type, Upload, Loader2 } from 'lucide-react'
import { sendPdfOperation } from '../../lib/pdfOperations'
import { usePdfStore } from '../../stores/pdfStore'

type SignatureMode = 'draw' | 'type' | 'upload'

interface SignatureDialogProps {
  pageNumber: number
  open: boolean
  onClose: () => void
  onSigned: () => void
}

export default function SignatureDialog({
  pageNumber,
  open,
  onClose,
  onSigned,
}: SignatureDialogProps) {
  const [mode, setMode] = useState<SignatureMode>('draw')
  const [typedText, setTypedText] = useState('')
  const [typedFont, setTypedFont] = useState('cursive')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState('')
  const [placing, setPlacing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [open, mode])

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    const rect = canvasRef.current!.getBoundingClientRect()
    lastPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  const handleCanvasMouseUp = () => {
    isDrawingRef.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedImage(file)
      setUploadPreview(URL.createObjectURL(file))
    }
  }

  const getSignatureBlob = useCallback(async (): Promise<Blob | null> => {
    if (mode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return null
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    }

    if (mode === 'type' && typedText.trim()) {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 120
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, 400, 120)
      ctx.font = `36px ${typedFont}`
      ctx.fillStyle = '#000'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedText, 10, 60)
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    }

    if (mode === 'upload' && uploadedImage) {
      return uploadedImage
    }

    return null
  }, [mode, typedText, typedFont, uploadedImage])

  const handlePlace = async () => {
    const blob = await getSignatureBlob()
    if (!blob) return

    setPlacing(true)
    try {
      const newBytes = await sendPdfOperation('/editor/add-image', (fd) => {
        fd.append('image', blob, 'signature.png')
        fd.append('pageNumber', String(pageNumber))
        fd.append('x', '100')
        fd.append('y', '100')
        fd.append('width', '200')
        fd.append('height', '60')
      })
      usePdfStore.getState().updatePdf(newBytes)
      onSigned()
      onClose()
    } catch { /* ignore */ }
    setPlacing(false)
  }

  if (!open) return null

  const tabs: { mode: SignatureMode; label: string; Icon: typeof Type }[] = [
    { mode: 'draw', label: 'Draw', Icon: Pencil },
    { mode: 'type', label: 'Type', Icon: Type },
    { mode: 'upload', label: 'Upload', Icon: Upload },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Signature</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {tabs.map(({ mode: m, label, Icon }) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mode === m
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {mode === 'draw' && (
            <div>
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white"
                style={{ touchAction: 'none' }}
              />
              <button
                onClick={clearCanvas}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          )}

          {mode === 'type' && (
            <div className="space-y-3">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your signature..."
                className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                style={{ fontFamily: typedFont }}
              />
              <div className="flex gap-2">
                {['cursive', 'serif', 'monospace'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setTypedFont(f)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      typedFont === f
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: f }}
                  >
                    Signature
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div>
              {uploadPreview ? (
                <div className="relative">
                  <img
                    src={uploadPreview}
                    alt="Signature"
                    className="max-h-32 mx-auto border border-gray-200 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setUploadedImage(null)
                      setUploadPreview('')
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Upload signature image</p>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePlace}
            disabled={placing}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {placing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Placing...
              </>
            ) : (
              'Add to Page'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
