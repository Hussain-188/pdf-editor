import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import UploadDropzone from '../components/UploadDropzone'
import DocumentCard from '../components/DocumentCard'
import api from '../lib/api'
import {
  FileText,
  FileEdit,
  FileDown,
  Droplets,
  Lock,
  Unlock,
  Hash,
  Search,
  Upload,
  Plus,
  LogOut,
  LayoutDashboard,
  Wrench,
  X,
  User,
} from 'lucide-react'

interface DocumentItem {
  id: string
  title: string
  originalFilename: string
  pageCount: number
  fileSizeBytes: number
  thumbnailUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
}

const TOOLS = [
  {
    key: 'edit',
    title: 'Edit PDF',
    description: 'Edit text, images and content',
    icon: FileEdit,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-200',
    route: null,
  },
  {
    key: 'compress',
    title: 'Compress',
    description: 'Reduce PDF file size',
    icon: FileDown,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    hoverBorder: 'hover:border-emerald-200',
    route: '/tools?tool=compress',
  },
  {
    key: 'watermark',
    title: 'Watermark',
    description: 'Add text watermarks',
    icon: Droplets,
    color: 'bg-violet-500',
    lightColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    hoverBorder: 'hover:border-violet-200',
    route: '/tools?tool=watermark',
  },
  {
    key: 'protect',
    title: 'Protect',
    description: 'Password protect PDFs',
    icon: Lock,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    hoverBorder: 'hover:border-rose-200',
    route: '/tools?tool=protect',
  },
  {
    key: 'unlock',
    title: 'Unlock',
    description: 'Remove PDF password',
    icon: Unlock,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-200',
    route: '/tools?tool=unlock',
  },
  {
    key: 'page-numbers',
    title: 'Page Numbers',
    description: 'Add page numbering',
    icon: Hash,
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    hoverBorder: 'hover:border-cyan-200',
    route: '/tools?tool=page-numbers',
  },
]

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const fetchDocuments = useCallback(async (query?: string) => {
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      const { data } = await api.get(`/documents?${params}`)
      setDocuments(data.content || data)
    } catch {
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(setTimeout(() => fetchDocuments(value), 300))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleToolClick = (tool: typeof TOOLS[0]) => {
    if (tool.key === 'edit') {
      setShowUpload(true)
    } else if (tool.route) {
      navigate(tool.route)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
                </div>
                <span className="text-lg font-bold text-gray-900">PDF Editor</span>
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-600 bg-primary-50"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  to="/tools"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <Wrench className="h-4 w-4" />
                  Tools
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.displayName || user?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Log out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tools Section */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">PDF Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TOOLS.map((tool) => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.key}
                  onClick={() => handleToolClick(tool)}
                  className={`group flex flex-col items-center gap-2.5 p-5 rounded-xl border border-gray-200 bg-white ${tool.hoverBorder} hover:shadow-md transition-all duration-200 text-center`}
                >
                  <div className={`w-12 h-12 rounded-xl ${tool.lightColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`h-6 w-6 ${tool.textColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{tool.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{tool.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* My Documents Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">My Documents</h2>
              {!loading && documents.length > 0 && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full sm:w-64 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow"
                />
              </div>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-primary-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" strokeWidth={1.2} />
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                {search ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                {search ? 'Try a different search term.' : 'Upload a PDF to get started with editing.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  Upload PDF
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} onUpdate={() => fetchDocuments(search || undefined)} />
              ))}
            </div>
          )}
        </section>
      </main>

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
