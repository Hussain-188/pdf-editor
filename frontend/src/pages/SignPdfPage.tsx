import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle, PenTool, Download,
  Type, Pencil, ImageIcon,
} from 'lucide-react'
import { getDocument } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import '../lib/pdfWorker'
import api from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'

type SignMode = 'draw' | 'type' | 'upload'

export default function SignPdfPage() {
  const { isAuthenticated } = useAuthStore()
  const { initSession } = useGuestStore()

  const [file, setFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageUrls, setPageUrls] = useState<string[]>([])
  const [selectedPage, setSelectedPage] = useState(1)
  const [signMode, setSignMode] = useState<SignMode>('draw')
  const [typedName, setTypedName] = useState('')
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [sigX, setSigX] = useState(100)
  const [sigY, setSigY] = useState(100)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const loadPdf = useCallback(async (pdfFile: File) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer()
      const doc = await getDocument({ data: arrayBuffer }).promise
      setPdfDoc(doc)

      const urls: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 0.5 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width
        canvas.height = vp.height
        await page.render({ canvas, viewport: vp }).promise
        urls.push(canvas.toDataURL())
      }
      setPageUrls(urls)
    } catch {
      setError('Failed to load PDF')
    }
  }, [])

  useEffect(() => {
    if (file) loadPdf(file)
    return () => { pdfDoc?.cleanup() }
  }, [file])

  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas || signMode !== 'draw') return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    let drawing = false
    const getPos = (e: MouseEvent) => ({
      x: e.offsetX,
      y: e.offsetY,
    })

    const onDown = (e: MouseEvent) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y) }
    const onMove = (e: MouseEvent) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke() }
    const onUp = () => { drawing = false; setSignatureDataUrl(canvas.toDataURL('image/png')) }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('mouseleave', onUp)

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mouseleave', onUp)
    }
  }, [signMode])

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignatureDataUrl(null)
  }

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0]
    if (!imgFile) return
    const reader = new FileReader()
    reader.onload = () => setSignatureDataUrl(reader.result as string)
    reader.readAsDataURL(imgFile)
  }

  const generateTypedSignature = useCallback(() => {
    if (!typedName.trim()) { setSignatureDataUrl(null); return }
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 120
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 400, 120)
    ctx.font = 'italic 48px "Georgia", serif'
    ctx.fillStyle = '#000'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, 20, 60)
    setSignatureDataUrl(canvas.toDataURL('image/png'))
  }, [typedName])

  useEffect(() => {
    if (signMode === 'type') generateTypedSignature()
  }, [typedName, signMode, generateTypedSignature])

  const handleProcess = async () => {
    if (!file || !signatureDataUrl) return
    setProcessing(true)
    setError('')
    setDone(false)

    try {
      const token = isAuthenticated ? undefined : await initSession()
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      if (token) uploadFormData.append('guestToken', token)

      const { data: doc } = await api.post('/documents/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const sigBlob = await fetch(signatureDataUrl).then((r) => r.blob())
      const sigFormData = new FormData()
      sigFormData.append('image', sigBlob, 'signature.png')
      if (token) sigFormData.append('guestToken', token)

      const params = new URLSearchParams()
      params.set('x', String(sigX))
      params.set('y', String(sigY))
      params.set('width', '200')
      params.set('height', '60')
      if (token) params.set('guestToken', token)

      await api.post(
        `/documents/${doc.id}/pages/${selectedPage}/add-image?${params.toString()}`,
        sigFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      const { data: urlData } = await api.get(`/documents/${doc.id}/url${token ? `?guestToken=${token}` : ''}`)
      const pdfResponse = await fetch(urlData.url)
      const blob = await pdfResponse.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace('.pdf', '_signed.pdf')
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch {
      setError('Failed to sign PDF. Please try again.')
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
    }
  }, [])

  if (!file) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link to="/tools" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              All tools
            </Link>
            <div className="flex items-center gap-2 text-indigo-600">
              <PenTool className="w-5 h-5" />
              <span className="font-semibold">Sign PDF</span>
            </div>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-6 py-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Sign PDF</h1>
              <p className="text-sm text-gray-500 mt-1">Upload a PDF and add your signature</p>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
              }`}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">Drop your PDF here or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setDone(false) }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tools" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              All tools
            </Link>
            <div className="flex items-center gap-2 text-indigo-600">
              <PenTool className="w-5 h-5" />
              <span className="font-semibold">Sign PDF</span>
            </div>
          </div>
          <button
            onClick={handleProcess}
            disabled={!signatureDataUrl || processing}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {processing ? 'Signing...' : 'Sign & Download'}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {done && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Done! Your signed PDF has been downloaded.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Create Your Signature</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {([
                  { mode: 'draw' as SignMode, label: 'Draw', Icon: Pencil },
                  { mode: 'type' as SignMode, label: 'Type', Icon: Type },
                  { mode: 'upload' as SignMode, label: 'Upload', Icon: ImageIcon },
                ]).map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => { setSignMode(mode); setSignatureDataUrl(null) }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                      signMode === mode
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {signMode === 'draw' && (
                  <div>
                    <canvas
                      ref={drawCanvasRef}
                      width={400}
                      height={150}
                      className="w-full border border-gray-200 rounded-lg cursor-crosshair bg-white"
                    />
                    <button
                      onClick={clearDrawing}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {signMode === 'type' && (
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Type your name"
                    className="w-full px-4 py-3 text-2xl italic font-serif border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                )}

                {signMode === 'upload' && (
                  <div>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:bg-gray-50 transition-all"
                    >
                      Click to upload signature image
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSignature}
                      className="hidden"
                    />
                  </div>
                )}

                {signatureDataUrl && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                    <img src={signatureDataUrl} alt="Signature" className="max-h-20 mx-auto" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Placement</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Page</label>
                  <select
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(parseInt(e.target.value))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    {pageUrls.map((_, i) => (
                      <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Position X</label>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    value={sigX}
                    onChange={(e) => setSigX(parseInt(e.target.value))}
                    className="w-full mt-2 accent-indigo-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Position Y</label>
                <input
                  type="range"
                  min={10}
                  max={700}
                  value={sigY}
                  onChange={(e) => setSigY(parseInt(e.target.value))}
                  className="w-full mt-1 accent-indigo-600"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Document Preview — Page {selectedPage} of {pageUrls.length}
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 p-2 max-h-[600px] overflow-auto">
              {pageUrls[selectedPage - 1] && (
                <img
                  src={pageUrls[selectedPage - 1]}
                  alt={`Page ${selectedPage}`}
                  className="w-full rounded"
                />
              )}
            </div>
            {pageUrls.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto py-1">
                {pageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPage(i + 1)}
                    className={`shrink-0 w-16 rounded border-2 overflow-hidden transition-all ${
                      selectedPage === i + 1 ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={url} alt={`Page ${i + 1}`} className="w-full" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
