import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FileDown, Droplets, Lock, Unlock, Hash, Upload,
  FileText, CheckCircle2, Loader2, X, AlertCircle, RotateCw,
  FileOutput, Palette, Layers, AlignVerticalSpaceAround,
  Image, FileImage, Scissors, Merge, Crop, Maximize2,
  Wrench, AlignLeft, BookOpen, Grid3X3, EyeOff, ListOrdered,
  ClipboardList, GitCompareArrows, Shuffle, Trash2, PenTool,
  ScanLine, BookmarkIcon, FileX2, ImageDown,
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
  responseType?: 'pdf' | 'zip' | 'image' | 'docx'
  dedicatedPage?: string
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

interface ToolCategory {
  title: string
  tools: Tool[]
}

const allTools: Tool[] = [
  {
    id: 'merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into one document',
    endpoint: '/tools/merge',
    icon: <Merge className="w-7 h-7" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    fields: [],
    dedicatedPage: '/merge',
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Divide a PDF into multiple files',
    endpoint: '/tools/split',
    icon: <Scissors className="w-7 h-7" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    fields: [],
    dedicatedPage: '/split',
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce file size while maintaining quality',
    endpoint: '/tools/compress',
    icon: <FileDown className="w-7 h-7" />,
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
    id: 'rotate',
    name: 'Rotate PDF',
    description: 'Rotate all pages in your document',
    endpoint: '/tools/rotate',
    icon: <RotateCw className="w-7 h-7" />,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 hover:bg-sky-100 border-sky-200',
    fields: [
      {
        name: 'degrees',
        label: 'Rotation',
        type: 'select',
        default: '90',
        options: [
          { label: '90° clockwise', value: '90' },
          { label: '180°', value: '180' },
          { label: '90° counter-clockwise', value: '270' },
        ],
      },
    ],
  },
  {
    id: 'extract',
    name: 'Extract Pages',
    description: 'Extract specific pages from a PDF',
    endpoint: '/tools/extract',
    icon: <FileOutput className="w-7 h-7" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
    fields: [
      {
        name: 'pages',
        label: 'Pages to extract',
        type: 'text',
        default: '',
        placeholder: 'e.g. 1-3, 5, 8-10',
      },
    ],
  },
  {
    id: 'watermark',
    name: 'Add Watermark',
    description: 'Stamp text on every page of your PDF',
    endpoint: '/tools/watermark',
    icon: <Droplets className="w-7 h-7" />,
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
    id: 'page-numbers',
    name: 'Page Numbers',
    description: 'Number every page of your document',
    endpoint: '/tools/page-numbers',
    icon: <Hash className="w-7 h-7" />,
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
  {
    id: 'header-footer',
    name: 'Header & Footer',
    description: 'Add headers and footers to every page',
    endpoint: '/tools/header-footer',
    icon: <AlignVerticalSpaceAround className="w-7 h-7" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    fields: [
      { name: 'headerText', label: 'Header text', type: 'text', default: '', placeholder: 'Use {page} and {total}' },
      { name: 'footerText', label: 'Footer text', type: 'text', default: '', placeholder: 'e.g. Page {page} of {total}' },
      { name: 'fontSize', label: 'Font Size', type: 'range', default: 10, min: 6, max: 20, step: 1 },
      {
        name: 'alignment',
        label: 'Alignment',
        type: 'select',
        default: 'center',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
    ],
  },
  {
    id: 'protect',
    name: 'Protect PDF',
    description: 'Encrypt with a password and set permissions',
    endpoint: '/tools/protect',
    icon: <Lock className="w-7 h-7" />,
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
    icon: <Unlock className="w-7 h-7" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    fields: [
      { name: 'password', label: 'Current Password', type: 'text', default: '', placeholder: 'Enter the PDF password' },
    ],
  },
  {
    id: 'grayscale',
    name: 'Grayscale PDF',
    description: 'Convert all images to black & white',
    endpoint: '/tools/grayscale',
    icon: <Palette className="w-7 h-7" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 hover:bg-gray-200 border-gray-300',
    fields: [],
  },
  {
    id: 'flatten',
    name: 'Flatten PDF',
    description: 'Flatten forms and annotations',
    endpoint: '/tools/flatten',
    icon: <Layers className="w-7 h-7" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
    fields: [],
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    description: 'Convert JPG, PNG images to PDF',
    endpoint: '/tools/images-to-pdf',
    icon: <Image className="w-7 h-7" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
    fields: [],
    dedicatedPage: '/images-to-pdf',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    description: 'Convert PDF pages to JPG or PNG images',
    endpoint: '/tools/pdf-to-images',
    icon: <FileImage className="w-7 h-7" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    responseType: 'zip',
    fields: [
      {
        name: 'format',
        label: 'Image Format',
        type: 'select',
        default: 'jpg',
        options: [
          { label: 'JPG', value: 'jpg' },
          { label: 'PNG', value: 'png' },
        ],
      },
      { name: 'dpi', label: 'Quality (DPI)', type: 'range', default: 150, min: 72, max: 300, step: 1 },
    ],
  },
  {
    id: 'pdf-to-text',
    name: 'PDF to Text',
    description: 'Extract all text from a PDF document',
    endpoint: '/tools/pdf-to-text',
    icon: <AlignLeft className="w-7 h-7" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
    fields: [],
  },
  {
    id: 'pdf-to-docx',
    name: 'PDF to Word',
    description: 'Convert PDF to editable Word document (.docx)',
    endpoint: '/tools/pdf-to-docx',
    icon: <FileText className="w-7 h-7" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    responseType: 'docx',
    fields: [],
  },
  {
    id: 'crop',
    name: 'Crop PDF',
    description: 'Remove margins and crop PDF pages',
    endpoint: '/tools/crop',
    icon: <Crop className="w-7 h-7" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    fields: [
      { name: 'left', label: 'Left margin (pt)', type: 'range', default: 0, min: 0, max: 200, step: 1 },
      { name: 'right', label: 'Right margin (pt)', type: 'range', default: 0, min: 0, max: 200, step: 1 },
      { name: 'top', label: 'Top margin (pt)', type: 'range', default: 0, min: 0, max: 200, step: 1 },
      { name: 'bottom', label: 'Bottom margin (pt)', type: 'range', default: 0, min: 0, max: 200, step: 1 },
    ],
  },
  {
    id: 'resize',
    name: 'Resize PDF',
    description: 'Change page size to A4, Letter, or custom',
    endpoint: '/tools/resize',
    icon: <Maximize2 className="w-7 h-7" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 hover:bg-violet-100 border-violet-200',
    fields: [
      {
        name: 'targetSize',
        label: 'Target Size',
        type: 'select',
        default: 'a4',
        options: [
          { label: 'A4 (210 × 297 mm)', value: 'a4' },
          { label: 'Letter (8.5 × 11 in)', value: 'letter' },
          { label: 'Legal (8.5 × 14 in)', value: 'legal' },
          { label: 'A3 (297 × 420 mm)', value: 'a3' },
          { label: 'A5 (148 × 210 mm)', value: 'a5' },
        ],
      },
    ],
  },
  {
    id: 'repair',
    name: 'Repair PDF',
    description: 'Fix corrupted or damaged PDF files',
    endpoint: '/tools/repair',
    icon: <Wrench className="w-7 h-7" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    fields: [],
  },
  {
    id: 'bates-number',
    name: 'Bates Numbering',
    description: 'Add sequential Bates numbers to pages',
    endpoint: '/tools/bates-number',
    icon: <BookOpen className="w-7 h-7" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    fields: [
      { name: 'prefix', label: 'Prefix', type: 'text', default: '', placeholder: 'e.g. DOC-' },
      { name: 'startNumber', label: 'Start Number', type: 'number', default: 1, min: 1 },
      { name: 'digits', label: 'Number of Digits', type: 'number', default: 6, min: 1 },
      { name: 'suffix', label: 'Suffix', type: 'text', default: '', placeholder: 'Optional suffix' },
    ],
  },
  {
    id: 'nup',
    name: 'N-up (Multi-page)',
    description: 'Place multiple pages on a single sheet',
    endpoint: '/tools/nup',
    icon: <Grid3X3 className="w-7 h-7" />,
    color: 'text-fuchsia-600',
    bgColor: 'bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-200',
    fields: [
      {
        name: 'pagesPerSheet',
        label: 'Pages Per Sheet',
        type: 'select',
        default: '4',
        options: [
          { label: '2 pages per sheet', value: '2' },
          { label: '4 pages per sheet', value: '4' },
          { label: '6 pages per sheet', value: '6' },
          { label: '9 pages per sheet', value: '9' },
        ],
      },
    ],
  },
  {
    id: 'organize',
    name: 'Organize PDF',
    description: 'Reorder, rotate, and delete pages visually',
    endpoint: '/tools/organize',
    icon: <ListOrdered className="w-7 h-7" />,
    color: 'text-lime-600',
    bgColor: 'bg-lime-50 hover:bg-lime-100 border-lime-200',
    fields: [],
    dedicatedPage: '/organize',
  },
  {
    id: 'redact',
    name: 'Redact PDF',
    description: 'Permanently black out sensitive content',
    endpoint: '/tools/redact',
    icon: <EyeOff className="w-7 h-7" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 hover:bg-gray-200 border-gray-300',
    fields: [],
    dedicatedPage: '/redact',
  },
  {
    id: 'fill-form',
    name: 'Fill PDF Form',
    description: 'Detect and fill form fields in your PDF',
    endpoint: '/tools/form/fill',
    icon: <ClipboardList className="w-7 h-7" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    fields: [],
    dedicatedPage: '/fill-form',
  },
  {
    id: 'compare',
    name: 'Compare PDFs',
    description: 'Find differences between two PDF files',
    endpoint: '/tools/compare',
    icon: <GitCompareArrows className="w-7 h-7" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    fields: [],
    dedicatedPage: '/compare',
  },
  {
    id: 'alternate-mix',
    name: 'Alternate & Mix',
    description: 'Interleave pages from two PDF files',
    endpoint: '/tools/alternate-mix',
    icon: <Shuffle className="w-7 h-7" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    fields: [],
    dedicatedPage: '/alternate-mix',
  },
  {
    id: 'delete-pages',
    name: 'Delete Pages',
    description: 'Remove specific pages from your PDF',
    endpoint: '/tools/extract',
    icon: <Trash2 className="w-7 h-7" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
    fields: [],
    dedicatedPage: '/delete-pages',
  },
  {
    id: 'sign',
    name: 'Sign PDF',
    description: 'Draw, type or upload your signature',
    endpoint: '',
    icon: <PenTool className="w-7 h-7" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    fields: [],
    dedicatedPage: '/sign',
  },
  {
    id: 'deskew',
    name: 'Deskew PDF',
    description: 'Straighten tilted scanned pages',
    endpoint: '/tools/deskew',
    icon: <ScanLine className="w-7 h-7" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
    fields: [],
  },
  {
    id: 'remove-metadata',
    name: 'Remove Metadata',
    description: 'Strip author, title, and hidden info',
    endpoint: '/tools/remove-metadata',
    icon: <FileX2 className="w-7 h-7" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    fields: [],
  },
  {
    id: 'extract-images',
    name: 'Extract Images',
    description: 'Pull all images from a PDF as a ZIP',
    endpoint: '/tools/extract-images',
    icon: <ImageDown className="w-7 h-7" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    responseType: 'zip',
    fields: [
      {
        name: 'format',
        label: 'Image Format',
        type: 'select',
        default: 'png',
        options: [
          { label: 'PNG', value: 'png' },
          { label: 'JPG', value: 'jpg' },
        ],
      },
    ],
  },
  {
    id: 'bookmarks',
    name: 'Edit Bookmarks',
    description: 'View, add, or remove PDF bookmarks',
    endpoint: '/tools/bookmarks',
    icon: <BookmarkIcon className="w-7 h-7" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    fields: [],
    dedicatedPage: '/bookmarks',
  },
]

const toolCategories: ToolCategory[] = [
  {
    title: 'Organize',
    tools: allTools.filter((t) => ['merge', 'split', 'organize', 'delete-pages', 'extract', 'rotate', 'alternate-mix'].includes(t.id)),
  },
  {
    title: 'Edit & Annotate',
    tools: [
      {
        id: 'edit',
        name: 'Edit PDF',
        description: 'Modify text, add content, and customize documents',
        endpoint: '',
        icon: <FileText className="w-7 h-7" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
        fields: [],
        dedicatedPage: '/dashboard',
      },
      ...allTools.filter((t) => ['sign', 'redact', 'fill-form'].includes(t.id)),
    ],
  },
  {
    title: 'Page Tools',
    tools: allTools.filter((t) => ['crop', 'resize', 'watermark', 'page-numbers', 'header-footer', 'bates-number', 'nup', 'bookmarks'].includes(t.id)),
  },
  {
    title: 'Optimize',
    tools: allTools.filter((t) => ['compress', 'grayscale', 'flatten', 'repair', 'deskew'].includes(t.id)),
  },
  {
    title: 'Convert',
    tools: allTools.filter((t) => ['images-to-pdf', 'pdf-to-images', 'pdf-to-text', 'pdf-to-docx'].includes(t.id)),
  },
  {
    title: 'Security',
    tools: allTools.filter((t) => ['protect', 'unlock', 'remove-metadata'].includes(t.id)),
  },
  {
    title: 'Analyze',
    tools: allTools.filter((t) => ['compare', 'extract-images'].includes(t.id)),
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
      const tool = allTools.find((t) => t.id === toolId)
      if (tool) {
        if (tool.dedicatedPage) {
          navigate(tool.dedicatedPage, { replace: true })
        } else {
          selectTool(tool)
        }
      }
    }
  }, [searchParams])

  const selectTool = (tool: Tool) => {
    if (tool.dedicatedPage) {
      navigate(tool.dedicatedPage)
      return
    }
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
      const extMap: Record<string, string> = { zip: 'zip', docx: 'docx', image: 'png' }
      const ext = extMap[activeTool.responseType || ''] || 'pdf'
      a.download = `${baseName}_${activeTool.id}.${ext}`
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
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All PDF Tools</h1>
            <p className="text-gray-500">Everything you need to work with PDFs</p>
          </div>

          {toolCategories.map((category) => (
            <div key={category.title} className="mb-10">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{category.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {category.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => selectTool(tool)}
                    className={`flex items-start gap-3.5 p-5 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-left group ${tool.bgColor}`}
                  >
                    <div className={`${tool.color} transition-transform group-hover:scale-110 shrink-0 mt-0.5`}>
                      {tool.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tool.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
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
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
            <div className={`${activeTool.color}`}>{activeTool.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{activeTool.name}</h2>
              <p className="text-sm text-gray-500">{activeTool.description}</p>
            </div>
          </div>

          <div className="p-8">
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

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Done! Your file has been downloaded.
              </div>
            )}

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
