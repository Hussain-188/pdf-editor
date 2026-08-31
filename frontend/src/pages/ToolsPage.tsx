import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileDown,
  Droplets,
  Lock,
  Unlock,
  Hash,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/api'

interface Tool {
  id: string
  name: string
  description: string
  endpoint: string
  icon: React.ReactNode
  color: string
  bgColor: string
  fields: ToolField[]
}

interface ToolField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'range'
  default: string | number | boolean
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string }[]
  placeholder?: string
}

const tools: Tool[] = [
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce file size while maintaining quality',
    endpoint: '/tools/compress',
    icon: <FileDown className="w-8 h-8" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
    fields: [
      {
        name: 'quality',
        label: 'Compression Level',
        type: 'select',
        default: '0.5',
        options: [
          { label: 'Maximum compression (smallest file)', value: '0.3' },
          { label: 'Recommended compression', value: '0.5' },
          { label: 'Less compression (best quality)', value: '0.8' },
        ],
      },
    ],
  },
  {
    id: 'watermark',
    name: 'Add Watermark',
    description: 'Stamp text on every page of your PDF',
    endpoint: '/tools/watermark',
    icon: <Droplets className="w-8 h-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    fields: [
      { name: 'text', label: 'Watermark Text', type: 'text', default: '', placeholder: 'e.g. CONFIDENTIAL' },
      { name: 'fontSize', label: 'Font Size', type: 'range', default: 48, min: 12, max: 120, step: 2 },
      { name: 'opacity', label: 'Opacity', type: 'range', default: 0.3, min: 0.05, max: 1, step: 0.05 },
      { name: 'rotation', label: 'Rotation (degrees)', type: 'range', default: 45, min: -90, max: 90, step: 5 },
    ],
  },
  {
    id: 'protect',
    name: 'Protect PDF',
    description: 'Encrypt with a password and set permissions',
    endpoint: '/tools/protect',
    icon: <Lock className="w-8 h-8" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    fields: [
      { name: 'password', label: 'Password', type: 'text', default: '', placeholder: 'Enter a strong password' },
      { name: 'allowPrint', label: 'Allow printing', type: 'checkbox', default: true },
      { name: 'allowCopy', label: 'Allow copying text', type: 'checkbox', default: false },
    ],
  },
  {
    id: 'unlock',
    name: 'Unlock PDF',
    description: 'Remove password protection from a PDF',
    endpoint: '/tools/unlock',
    icon: <Unlock className="w-8 h-8" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    fields: [
      { name: 'password', label: 'Current Password', type: 'text', default: '', placeholder: 'Enter the PDF password' },
    ],
  },
  {
    id: 'page-numbers',
    name: 'Add Page Numbers',
    description: 'Number every page of your document',
    endpoint: '/tools/page-numbers',
    icon: <Hash className="w-8 h-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    fields: [
      {
        name: 'position',
        label: 'Position',
        type: 'select',
        default: 'bottom-center',
        options: [
          { label: 'Bottom Center', value: 'bottom-center' },
          { label: 'Bottom Left', value: 'bottom-left' },
          { label: 'Bottom Right', value: 'bottom-right' },
          { label: 'Top Center', value: 'top-center' },
          { label: 'Top Left', value: 'top-left' },
          { label: 'Top Right', value: 'top-right' },
        ],
      },
      { name: 'startFrom', label: 'Start numbering from', type: 'number', default: 1, min: 1 },
      { name: 'fontSize', label: 'Font Size', type: 'range', default: 10, min: 6, max: 24, step: 1 },
    ],
  },
]

export default function ToolsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [params, setParams] = useState<Record<string, string | number | boolean>>({})
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const toolId = searchParams.get('tool')
    if (toolId) {
      const tool = tools.find((t) => t.id === toolId)
      if (tool) selectTool(tool)
    }
  }, [searchParams])

  const selectTool = (tool: Tool) => {
    setActiveTool(tool)
    setFile(null)
    setDone(false)
    setError('')
    const defaults: Record<string, string | number | boolean> = {}
    tool.fields.forEach((f) => {
      defaults[f.name] = f.default
    })
    setParams(defaults)
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

  const handleProcess = async () => {
    if (!activeTool || !file) return
    setProcessing(true)
    setError('')
    setDone(false)

    const formData = new FormData()
    formData.append('file', file)
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    try {
      const response = await api.post(activeTool.endpoint, formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      const baseName = file.name.replace('.pdf', '')
      a.download = `${baseName}_${activeTool.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Processing failed. Please try again.')
    }
    setProcessing(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const header = (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <FileText className="w-6 h-6" />
            PDF Editor
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {isAuthenticated && (
              <Link to="/dashboard" className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100">
                Dashboard
              </Link>
            )}
            <span className="px-3 py-1.5 text-sm text-primary-600 font-medium bg-primary-50 rounded-md">
              Tools
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <span className="text-sm text-gray-600">{user?.displayName}</span>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
              <Link to="/register" className="text-sm bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )

  if (!activeTool) {
    return (
      <div className="min-h-screen bg-gray-50">
        {header}
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Tools</h1>
            <p className="text-gray-500">Select a tool to get started</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => selectTool(tool)}
                className={`flex flex-col items-center gap-3 p-8 bg-white border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 text-center group ${tool.bgColor}`}
              >
                <div className={`${tool.color} transition-transform group-hover:scale-110`}>{tool.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {header}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          onClick={() => { setActiveTool(null); navigate('/tools', { replace: true }) }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          All tools
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tool header */}
          <div className={`px-8 py-6 border-b border-gray-100 flex items-center gap-4`}>
            <div className={`${activeTool.color}`}>{activeTool.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{activeTool.name}</h2>
              <p className="text-sm text-gray-500">{activeTool.description}</p>
            </div>
          </div>

          <div className="p-8">
            {/* File upload area */}
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
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
                    setFile(e.target.files?.[0] || null)
                    setDone(false)
                    setError('')
                  }}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                <FileText className="w-10 h-10 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => { setFile(null); setDone(false); setError('') }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tool settings */}
            {file && activeTool.fields.length > 0 && (
              <div className="space-y-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Settings</h3>
                {activeTool.fields.map((field) => (
                  <div key={field.name}>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">{field.label}</label>
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={String(params[field.name] ?? '')}
                        onChange={(e) => setParams({ ...params, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    )}
                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={Number(params[field.name] ?? 0)}
                        min={field.min}
                        onChange={(e) => setParams({ ...params, [field.name]: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    )}
                    {field.type === 'range' && (
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={Number(params[field.name] ?? field.default)}
                          onChange={(e) => setParams({ ...params, [field.name]: parseFloat(e.target.value) })}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <span className="text-sm text-gray-600 w-12 text-right tabular-nums">
                          {params[field.name]}
                        </span>
                      </div>
                    )}
                    {field.type === 'select' && (
                      <select
                        value={String(params[field.name] ?? '')}
                        onChange={(e) => setParams({ ...params, [field.name]: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    {field.type === 'checkbox' && (
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(params[field.name])}
                          onChange={(e) => setParams({ ...params, [field.name]: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">Enabled</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Success message */}
            {done && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Done! Your file has been downloaded.
              </div>
            )}

            {/* Process button */}
            {file && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full py-3 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : done ? (
                  'Process Again'
                ) : (
                  `${activeTool.name}`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
