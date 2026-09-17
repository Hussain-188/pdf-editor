import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import UploadDropzone from '../components/UploadDropzone'
import {
  FileText, FileEdit, FileDown, Droplets, Lock, Unlock, Hash, Upload,
  Shield, Zap, Globe, ArrowRight, X, RotateCw, FileOutput, Palette,
  Layers, AlignVerticalSpaceAround, Image, FileImage, Scissors, Merge,
  Crop, Maximize2, Wrench, AlignLeft, BookOpen, Grid3X3, EyeOff, ListOrdered,
  ClipboardList, GitCompareArrows, Shuffle, Trash2, PenTool, ScanLine,
  BookmarkIcon, FileX2, ImageDown,
} from 'lucide-react'

const TOOL_CATEGORIES = [
  {
    title: 'Organize',
    tools: [
      { title: 'Merge PDF', description: 'Combine multiple PDFs into one.', icon: Merge, color: 'text-orange-600', bg: 'bg-orange-50', route: '/merge' },
      { title: 'Split PDF', description: 'Divide a PDF into multiple files.', icon: Scissors, color: 'text-indigo-600', bg: 'bg-indigo-50', route: '/split' },
      { title: 'Organize PDF', description: 'Reorder, rotate, delete pages.', icon: ListOrdered, color: 'text-lime-600', bg: 'bg-lime-50', route: '/organize' },
      { title: 'Delete Pages', description: 'Remove specific pages from PDF.', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', route: '/delete-pages' },
      { title: 'Extract Pages', description: 'Pull out specific pages.', icon: FileOutput, color: 'text-teal-600', bg: 'bg-teal-50', route: '/tools?tool=extract' },
      { title: 'Rotate PDF', description: 'Rotate all pages in your PDF.', icon: RotateCw, color: 'text-sky-600', bg: 'bg-sky-50', route: '/tools?tool=rotate' },
      { title: 'Alternate & Mix', description: 'Interleave pages from two PDFs.', icon: Shuffle, color: 'text-amber-600', bg: 'bg-amber-50', route: '/alternate-mix' },
    ],
  },
  {
    title: 'Edit',
    tools: [
      { title: 'Edit PDF', description: 'Modify text, fonts, colors directly.', icon: FileEdit, color: 'text-blue-600', bg: 'bg-blue-50', route: null },
      { title: 'Sign PDF', description: 'Draw, type or upload your signature.', icon: PenTool, color: 'text-indigo-600', bg: 'bg-indigo-50', route: '/sign' },
      { title: 'Fill PDF Form', description: 'Detect and fill form fields.', icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50', route: '/fill-form' },
      { title: 'Redact PDF', description: 'Black out sensitive content.', icon: EyeOff, color: 'text-gray-700', bg: 'bg-gray-100', route: '/redact' },
    ],
  },
  {
    title: 'Page Tools',
    tools: [
      { title: 'Crop PDF', description: 'Remove margins and crop pages.', icon: Crop, color: 'text-orange-600', bg: 'bg-orange-50', route: '/tools?tool=crop' },
      { title: 'Resize PDF', description: 'Change page size to A4, Letter.', icon: Maximize2, color: 'text-violet-600', bg: 'bg-violet-50', route: '/tools?tool=resize' },
      { title: 'Watermark', description: 'Stamp text on every page.', icon: Droplets, color: 'text-violet-600', bg: 'bg-violet-50', route: '/tools?tool=watermark' },
      { title: 'Page Numbers', description: 'Add page numbers.', icon: Hash, color: 'text-cyan-600', bg: 'bg-cyan-50', route: '/tools?tool=page-numbers' },
      { title: 'Header & Footer', description: 'Add headers and footers.', icon: AlignVerticalSpaceAround, color: 'text-pink-600', bg: 'bg-pink-50', route: '/tools?tool=header-footer' },
      { title: 'Bates Numbering', description: 'Add sequential Bates numbers.', icon: BookOpen, color: 'text-rose-600', bg: 'bg-rose-50', route: '/tools?tool=bates-number' },
      { title: 'N-up', description: 'Multiple pages per sheet.', icon: Grid3X3, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', route: '/tools?tool=nup' },
      { title: 'Bookmarks', description: 'View, add, or remove bookmarks.', icon: BookmarkIcon, color: 'text-amber-600', bg: 'bg-amber-50', route: '/bookmarks' },
    ],
  },
  {
    title: 'Optimize',
    tools: [
      { title: 'Compress PDF', description: 'Reduce file size.', icon: FileDown, color: 'text-emerald-600', bg: 'bg-emerald-50', route: '/tools?tool=compress' },
      { title: 'Grayscale', description: 'Convert to black & white.', icon: Palette, color: 'text-gray-600', bg: 'bg-gray-100', route: '/tools?tool=grayscale' },
      { title: 'Flatten PDF', description: 'Flatten forms and annotations.', icon: Layers, color: 'text-slate-600', bg: 'bg-slate-50', route: '/tools?tool=flatten' },
      { title: 'Repair PDF', description: 'Fix corrupted PDF files.', icon: Wrench, color: 'text-yellow-600', bg: 'bg-yellow-50', route: '/tools?tool=repair' },
      { title: 'Deskew PDF', description: 'Straighten tilted scanned pages.', icon: ScanLine, color: 'text-cyan-600', bg: 'bg-cyan-50', route: '/tools?tool=deskew' },
    ],
  },
  {
    title: 'Convert',
    tools: [
      { title: 'Images to PDF', description: 'Convert JPG/PNG to PDF.', icon: Image, color: 'text-teal-600', bg: 'bg-teal-50', route: '/images-to-pdf' },
      { title: 'PDF to Images', description: 'Convert pages to JPG/PNG.', icon: FileImage, color: 'text-emerald-600', bg: 'bg-emerald-50', route: '/tools?tool=pdf-to-images' },
      { title: 'PDF to Text', description: 'Extract all text from PDF.', icon: AlignLeft, color: 'text-cyan-600', bg: 'bg-cyan-50', route: '/tools?tool=pdf-to-text' },
      { title: 'PDF to Word', description: 'Convert PDF to editable DOCX.', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', route: '/tools?tool=pdf-to-docx' },
    ],
  },
  {
    title: 'Security',
    tools: [
      { title: 'Protect PDF', description: 'Add password protection.', icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50', route: '/tools?tool=protect' },
      { title: 'Unlock PDF', description: 'Remove password protection.', icon: Unlock, color: 'text-amber-600', bg: 'bg-amber-50', route: '/tools?tool=unlock' },
      { title: 'Remove Metadata', description: 'Strip hidden document info.', icon: FileX2, color: 'text-rose-600', bg: 'bg-rose-50', route: '/tools?tool=remove-metadata' },
    ],
  },
  {
    title: 'Analyze',
    tools: [
      { title: 'Compare PDFs', description: 'Find differences between PDFs.', icon: GitCompareArrows, color: 'text-purple-600', bg: 'bg-purple-50', route: '/compare' },
      { title: 'Extract Images', description: 'Pull all images from a PDF.', icon: ImageDown, color: 'text-green-600', bg: 'bg-green-50', route: '/tools?tool=extract-images' },
    ],
  },
]

const FEATURES = [
  {
    icon: Zap,
    title: 'Easy to Use',
    description: 'No installation needed. Edit PDFs directly in your browser with an intuitive interface.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your files are processed securely. Documents are stored privately in your account.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    icon: Globe,
    title: 'Works Everywhere',
    description: 'Access from any device with a browser. No software to download or update.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [showUpload, setShowUpload] = useState(false)

  const handleToolClick = (tool: { route: string | null }) => {
    if (!tool.route) {
      setShowUpload(true)
    } else {
      navigate(tool.route)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <FileText className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-lg font-bold text-gray-900">PDF Editor</span>
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                to="/tools"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                All Tools
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Sign up free
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-violet-50" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Every tool you need to<br />
            <span className="text-primary-600">work with PDFs</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Edit, merge, split, compress, convert, and protect your PDFs — all in one place.
            No installation required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-primary-600 text-white rounded-xl text-base font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30"
            >
              <Upload className="h-5 w-5" />
              Upload & Edit PDF
            </button>
            <Link
              to="/tools"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Browse all tools
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Grid - Categorized like iLovePDF */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">All the PDF tools you need</h2>
            <p className="mt-2 text-gray-600">Select a tool to get started, or upload a PDF to edit</p>
          </div>

          {TOOL_CATEGORIES.map((category) => (
            <div key={category.title} className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                {category.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {category.tools.map((tool) => {
                  const Icon = tool.icon
                  return (
                    <button
                      key={tool.title}
                      onClick={() => handleToolClick(tool)}
                      className="group flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all duration-200 text-left hover:-translate-y-0.5"
                    >
                      <div className={`w-10 h-10 rounded-lg ${tool.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className={`h-5 w-5 ${tool.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {tool.title}
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed truncate">{tool.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="text-center">
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">PDF Editor — Every PDF tool you need, in your browser</p>
        </div>
      </footer>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload PDF</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <UploadDropzone
              onUploadComplete={(doc) => {
                setShowUpload(false)
                navigate(`/editor/${doc.id}`)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
