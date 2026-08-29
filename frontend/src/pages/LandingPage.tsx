import { Link, useNavigate } from 'react-router-dom'
import UploadDropzone from '../components/UploadDropzone'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-700">PDF Platform</h1>
          <nav className="flex gap-4">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Edit PDFs directly in your browser
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            True text editing, annotations, page management, and more.
            No account required to get started.
          </p>
          <div className="max-w-lg mx-auto">
            <UploadDropzone onUploadComplete={(doc) => navigate(`/editor/${doc.id}`)} />
          </div>
          <div className="mt-6">
            <Link
              to="/dashboard"
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Or view your documents →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
