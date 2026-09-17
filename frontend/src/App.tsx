import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'

const EditorPage = lazy(() => import('./pages/EditorPage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const MergePage = lazy(() => import('./pages/MergePage'))
const SplitPage = lazy(() => import('./pages/SplitPage'))
const ImageToPdfPage = lazy(() => import('./pages/ImageToPdfPage'))
const OrganizePage = lazy(() => import('./pages/OrganizePage'))
const RedactPage = lazy(() => import('./pages/RedactPage'))
const FormFillPage = lazy(() => import('./pages/FormFillPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const DeletePagesPage = lazy(() => import('./pages/DeletePagesPage'))
const AlternateMixPage = lazy(() => import('./pages/AlternateMixPage'))
const SignPdfPage = lazy(() => import('./pages/SignPdfPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/split" element={<SplitPage />} />
        <Route path="/images-to-pdf" element={<ImageToPdfPage />} />
        <Route path="/organize" element={<OrganizePage />} />
        <Route path="/redact" element={<RedactPage />} />
        <Route path="/fill-form" element={<FormFillPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/delete-pages" element={<DeletePagesPage />} />
        <Route path="/alternate-mix" element={<AlternateMixPage />} />
        <Route path="/sign" element={<SignPdfPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
      </Routes>
    </Suspense>
  )
}
