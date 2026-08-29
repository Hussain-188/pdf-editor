import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument } from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import '../lib/pdfWorker'
import api from '../lib/api'
import { useViewport } from '../hooks/useViewport'
import { useEditorStore } from '../stores/editorStore'
import Toolbar from '../components/editor/Toolbar'
import AnnotationToolbar from '../components/editor/AnnotationToolbar'
import PageRenderer from '../components/editor/PageRenderer'
import PagePanel from '../components/editor/PagePanel'
import VersionHistoryPanel from '../components/editor/VersionHistoryPanel'
import ExportDialog from '../components/editor/ExportDialog'

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { viewport, zoomIn, zoomOut, setScale } = useViewport(1.0)
  const analyzeDocument = useEditorStore((s) => s.analyzeDocument)
  const analysisLoading = useEditorStore((s) => s.analysisLoading)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const setDocumentId = useEditorStore((s) => s.setDocumentId)

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [docTitle, setDocTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPagePanel] = useState(true)
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [thumbnailUrls] = useState<Map<number, string>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!id) return
    setDocumentId(id)
    loadDocument(id)

    autoSaveTimerRef.current = setInterval(() => {
      api.post(`/documents/${id}/autosave`).catch(() => {})
    }, 5 * 60 * 1000)

    return () => {
      pdfDoc?.cleanup()
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const loadDocument = async (docId: string) => {
    try {
      const { data: docInfo } = await api.get(`/documents/${docId}`)
      setDocTitle(docInfo.title)

      const { data: urlData } = await api.get(`/documents/${docId}/url`)
      const loadingTask = getDocument(urlData.url)
      const doc = await loadingTask.promise
      setPdfDoc(doc)

      const loadedPages: PDFPageProxy[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        loadedPages.push(page)
      }
      setPages(loadedPages)
      setLoading(false)

      analyzeDocument(docId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load document')
      setLoading(false)
    }
  }

  const reloadDocument = useCallback(async () => {
    if (!id) return
    try {
      const { data: docInfo } = await api.get(`/documents/${id}`)
      setDocTitle(docInfo.title)

      const { data: urlData } = await api.get(`/documents/${id}/url`)
      pdfDoc?.cleanup()
      const doc = await getDocument(urlData.url).promise
      setPdfDoc(doc)

      const loadedPages: PDFPageProxy[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        loadedPages.push(await doc.getPage(i))
      }
      setPages(loadedPages)
    } catch { /* ignore reload errors */ }
  }, [id, pdfDoc])

  const handlePageAction = useCallback(async (action: () => Promise<any>) => {
    try {
      await action()
      await reloadDocument()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Page operation failed')
    }
  }, [reloadDocument])

  const handleRotate = useCallback((page: number, degrees: number) => {
    handlePageAction(() => api.post(`/documents/${id}/pages/${page}/rotate`, { degrees }))
  }, [id, handlePageAction])

  const handleDeletePage = useCallback((page: number) => {
    handlePageAction(() => api.delete(`/documents/${id}/pages/${page}`))
  }, [id, handlePageAction])

  const handleDuplicate = useCallback((page: number) => {
    handlePageAction(() => api.post(`/documents/${id}/pages/${page}/duplicate`))
  }, [id, handlePageAction])

  const handleInsertBlank = useCallback((afterPage: number) => {
    handlePageAction(() => api.post(`/documents/${id}/pages/insert-blank`, { afterPage }))
  }, [id, handlePageAction])

  const handleReorder = useCallback((newOrder: number[]) => {
    handlePageAction(() => api.post(`/documents/${id}/pages/reorder`, { order: newOrder }))
  }, [id, handlePageAction])

  const scrollToPage = useCallback((page: number) => {
    const container = scrollContainerRef.current
    if (!container) return
    const el = container.querySelector(`[data-page-number="${page}"]`) as HTMLElement
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentPage(page)
    }
  }, [])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || pages.length === 0) return

    const scrollTop = container.scrollTop + container.clientHeight / 3
    const pageElements = container.querySelectorAll('[data-page-number]')
    let current = 1

    pageElements.forEach((el) => {
      const htmlEl = el as HTMLElement
      if (htmlEl.offsetTop <= scrollTop) {
        current = parseInt(htmlEl.dataset.pageNumber || '1')
      }
    })

    setCurrentPage(current)
  }, [pages.length])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="text-primary-600 hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar
        scale={viewport.scale}
        currentPage={currentPage}
        totalPages={pages.length}
        documentTitle={docTitle}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onScaleChange={setScale}
        onBack={() => navigate('/dashboard')}
        onUndo={undo}
        onRedo={redo}
      />
      <AnnotationToolbar />

      <div className="flex-1 flex overflow-hidden">
        {showPagePanel && (
          <PagePanel
            pageCount={pages.length}
            currentPage={currentPage}
            scale={viewport.scale}
            onPageClick={scrollToPage}
            onRotate={handleRotate}
            onDelete={handleDeletePage}
            onDuplicate={handleDuplicate}
            onInsertBlank={handleInsertBlank}
            onReorder={handleReorder}
            thumbnailUrls={thumbnailUrls}
          />
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto py-4"
        >
          {pages.map((page, index) => (
            <PageRenderer
              key={index}
              page={page}
              scale={viewport.scale}
              pageNumber={index + 1}
              showOverlay={!analysisLoading}
              documentId={id}
            />
          ))}
        </div>

        {id && (
          <VersionHistoryPanel
            documentId={id}
            open={showVersionPanel}
            onClose={() => setShowVersionPanel(false)}
            onRestore={reloadDocument}
          />
        )}
      </div>

      {id && (
        <ExportDialog
          documentId={id}
          pageCount={pages.length}
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  )
}
