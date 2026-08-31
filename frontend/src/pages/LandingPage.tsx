import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import UploadDropzone from '../components/UploadDropzone'
import {
  FileText,
  FileEdit,
  FileDown,
  Droplets,
  Lock,
  Unlock,
  Hash,
  Upload,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  X,
} from 'lucide-react'

const TOOLS = [
  {
    title: 'Edit PDF',
    description: 'Modify text, add content, and customize your documents directly in the browser.',
    icon: FileEdit,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-100',
    route: null,
  },
  {
    title: 'Compress PDF',
    description: 'Reduce file size while keeping quality. Perfect for email attachments.',
    icon: FileDown,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
    route: '/tools?tool=compress',
  },
  {
    title: 'Add Watermark',
    description: 'Stamp your documents with custom text watermarks for branding or security.',
    icon: Droplets,
    color: 'bg-violet-500',
    lightColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    borderColor: 'border-violet-100',
    route: '/tools?tool=watermark',
  },
  {
    title: 'Protect PDF',
    description: 'Add password protection and control permissions on your PDF files.',
    icon: Lock,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    borderColor: 'border-rose-100',
    route: '/tools?tool=protect',
  },
  {
    title: 'Unlock PDF',
    description: 'Remove password protection from your PDF documents instantly.',
    icon: Unlock,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-100',
    route: '/tools?tool=unlock',
  },
  {
    title: 'Page Numbers',
    description: 'Automatically add page numbers in any position on your documents.',
    icon: Hash,
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    borderColor: 'border-cyan-100',
    route: '/tools?tool=page-numbers',
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

  const handleToolClick = (tool: typeof TOOLS[0]) => {
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
            Edit, compress, protect, and transform your PDF documents — all in your browser.
            No installation required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-primary-600 text-white rounded-xl text-base font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30"
            >
              <Upload className="h-5 w-5" />
              Upload PDF
            </button>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                or create a free account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">All the PDF tools you need</h2>
            <p className="mt-2 text-gray-600">Select a tool to get started</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.title}
                  onClick={() => handleToolClick(tool)}
                  className={`group flex items-start gap-4 p-5 rounded-xl border ${tool.borderColor} bg-white hover:shadow-lg transition-all duration-200 text-left`}
                >
                  <div className={`w-12 h-12 rounded-xl ${tool.lightColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`h-6 w-6 ${tool.textColor}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{tool.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
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
          <p className="text-sm text-gray-400">PDF Editor — Edit PDFs directly in your browser</p>
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
