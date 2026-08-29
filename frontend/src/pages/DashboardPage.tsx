import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import UploadDropzone from '../components/UploadDropzone'
import DocumentCard from '../components/DocumentCard'
import api from '../lib/api'

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

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-700">PDF Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Documents</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64 px-3 py-2 pl-9 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="mb-8">
          <UploadDropzone onUploadComplete={() => fetchDocuments()} />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {search ? 'No documents match your search.' : 'No documents yet. Upload a PDF to get started.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onUpdate={() => fetchDocuments(search || undefined)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
