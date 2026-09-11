import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument } from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import '../lib/pdfWorker'
import api from '../lib/api'
import { useViewport } from '../hooks/useViewport'
import { useEditorStore } from '../stores/editorStore'
import { useAnnotationStore } from '../stores/annotationStore'
import Toolbar, { type EditorMode } from '../components/editor/Toolbar'
import AnnotationToolbar from '../components/editor/AnnotationToolbar'
import PageRenderer from '../components/editor/PageRenderer'
import PagePanel from '../components/editor/PagePanel'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import VersionHistoryPanel from '../components/editor/VersionHistoryPanel'
import ExportDialog from '../components/editor/ExportDialog'
import FindReplaceDialog from '../components/editor/FindReplaceDialog'
import SignatureDialog from '../components/editor/SignatureDialog'

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { viewport, zoomIn, zoomOut, setScale, fitToWidth } = useViewport(1.0)
  const analyzeDocument = useEditorStore((s) => s.analyzeDocument)
  const analysisLoading = useEditorStore((s) => s.analysisLoading)
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId)
  const pageAnalyses = useEditorStore((s) => s.pageAnalyses)
  const selectBlock = useEditorStore((s) => s.selectBlock)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const setDocumentId = useEditorStore((s) => s.setDocumentId)
  const loadAnnotations = useAnnotationStore((s) => s.loadAnnotations)
  const clearAnnotations = useAnnotationStore((s) => s.clearAnnotations)
  const setActiveTool = useAnnotationStore((s) => s.setActiveTool)

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [docTitle, setDocTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')

  useEffect(() => {
    if (editorMode !== 'annotate') setActiveTool(null)
  }, [editorMode, setActiveTool])
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<number, string>>(new Map())
  const [saving, setSaving] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null
    for (const [pageNum, analysis] of pageAnalyses) {
      const block = analysis.textBlocks.find((b) => b.id === selectedBlockId)
      if (block) return { block, pageNumber: pageNum }
    }
    return null
  }, [selectedBlockId, pageAnalyses])

  useEffect(() => {
    if (!id) return
    setDocumentId(id)
    loadDocument(id)
    loadAnnotations(id)

    autoSaveTimerRef.current = setInterval(() => {
      api.post(`/documents/${id}/autosave`).catch(() => {})
    }, 5 * 60 * 1000)

    return () => {
      pdfDoc?.cleanup()
      clearAnnotations()
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [id])

  const generateThumbnails = useCallback(async (doc: PDFDocumentProxy) => {
    const newThumbnails = new Map<number, string>()
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 0.2 })
      const canvas = document.createElement('canvas')
      canvas.width = vp.width
      canvas.height = vp.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise
      newThumbnails.set(i, canvas.toDataURL())
    }
    setThumbnailUrls(newThumbnails)
  }, [])

  const loadDocument = async (docId: string) => {
    try {
      const { data: docInfo } = await api.get(`/documents/${docId}`)
      setDocTitle(docInfo.title)

      const { data: urlData } = await api.get(`/documents/${docId}/url`)
      const pdfResponse = await fetch(urlData.url, { cache: 'no-store' })
      if (!pdfResponse.ok) throw new Error('Failed to download PDF')
      const pdfData = await pdfResponse.arrayBuffer()
      const doc = await getDocument({ data: pdfData }).promise
      setPdfDoc(doc)

      const loadedPages: PDFPageProxy[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        loadedPages.push(page)
      }
      setPages(loadedPages)
      setLoading(false)

      generateThumbnails(doc)
      analyzeDocument(docId)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load document')
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
      const pdfResponse = await fetch(urlData.url, { cache: 'no-store' })
      if (!pdfResponse.ok) throw new Error('Failed to download PDF')
      const pdfData = await pdfResponse.arrayBuffer()
      const doc = await getDocument({ data: pdfData }).promise
      setPdfDoc(doc)

      const loadedPages: PDFPageProxy[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        loadedPages.push(await doc.getPage(i))
      }
      setPages(loadedPages)
      generateThumbnails(doc)
    } catch { /* ignore reload errors */ }
  }, [id, pdfDoc, generateThumbnails])

  const handlePageAction = useCallback(async (action: () => Promise<any>) => {
    try {
      await action()
      await reloadDocument()
      if (id) {
        analyzeDocument(id)
      }
    } catch (err: any) {
      setOperationError(err.response?.data?.error || err.message || 'Operation failed')
      setTimeout(() => setOperationError(null), 5000)
    }
  }, [reloadDocument, id, analyzeDocument])

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

  const handleSave = useCallback(async () => {
    if (!id) return
    setSaving(true)
    try {
      await api.post(`/documents/${id}/versions`, { label: 'Manual save' })
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }, [id])

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

  const handlePropertiesUpdate = useCallback(() => {
    if (id) {
      analyzeDocument(id)
      reloadDocument()
    }
  }, [id, analyzeDocument, reloadDocument])

  const handleUndo = useCallback(async () => {
    try {
      await undo()
      if (id) {
        await reloadDocument()
        analyzeDocument(id)
      }
    } catch {
      setOperationError('Nothing to undo')
      setTimeout(() => setOperationError(null), 3000)
    }
  }, [undo, id, reloadDocument, analyzeDocument])

  const handleRedo = useCallback(async () => {
    try {
      await redo()
      if (id) {
        await reloadDocument()
        analyzeDocument(id)
      }
    } catch {
      setOperationError('Nothing to redo')
      setTimeout(() => setOperationError(null), 3000)
    }
  }, [redo, id, reloadDocument, analyzeDocument])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setShowFindReplace((v) => !v)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowFindReplace(true)
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomIn()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomOut()
      }
      if (e.key === 'Escape') {
        setShowFindReplace(false)
        selectBlock(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo, handleRedo, selectBlock, zoomIn, zoomOut])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) zoomIn()
        else zoomOut()
      }
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut])

  useEffect(() => {
    if (pages.length === 0) return
    const container = scrollContainerRef.current
    if (!container) return
    const pageWidth = pages[0].getViewport({ scale: 1 }).width
    const containerWidth = container.clientWidth - 32 // account for padding
    if (containerWidth > 0 && pageWidth > 0) {
      fitToWidth(containerWidth, pageWidth)
    }
  }, [pages, fitToWidth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
          >
            Go back
          </button>
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
        documentId={id}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onScaleChange={setScale}
        onBack={() => navigate('/dashboard')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={() => setShowExportDialog(true)}
        onShowHistory={() => setShowVersionPanel(true)}
        onSave={handleSave}
        onSign={() => setShowSignature(true)}
        onFindReplace={() => setShowFindReplace((v) => !v)}
        editorMode={editorMode}
        onModeChange={setEditorMode}
      />

      <AnnotationToolbar
        visible={editorMode === 'annotate'}
        documentId={id}
        onImageInserted={() => { reloadDocument(); if (id) analyzeDocument(id) }}
      />

      <div className="flex-1 flex overflow-hidden">
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

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onClick={() => selectBlock(null)}
          className="flex-1 overflow-auto py-6 px-4"
          style={{ background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)' }}
        >
          {pages.map((page, index) => (
            <PageRenderer
              key={page.pageNumber}
              page={page}
              scale={viewport.scale}
              pageNumber={index + 1}
              showOverlay={editorMode === 'edit' && !analysisLoading}
              documentId={id}
              onDocumentChanged={reloadDocument}
              onError={(msg) => { setOperationError(msg); setTimeout(() => setOperationError(null), 5000) }}
            />
          ))}
        </div>

        {editorMode === 'edit' && selectedBlock && id && (
          <PropertiesPanel
            block={selectedBlock.block}
            documentId={id}
            pageNumber={selectedBlock.pageNumber}
            onUpdate={handlePropertiesUpdate}
            onClose={() => selectBlock(null)}
          />
        )}

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

      {id && (
        <SignatureDialog
          documentId={id}
          pageNumber={currentPage}
          open={showSignature}
          onClose={() => setShowSignature(false)}
          onSigned={() => { reloadDocument(); if (id) analyzeDocument(id) }}
        />
      )}

      {id && (
        <FindReplaceDialog
          documentId={id}
          open={showFindReplace}
          onClose={() => setShowFindReplace(false)}
          onReplaced={() => { reloadDocument(); if (id) analyzeDocument(id) }}
        />
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Saving...
        </div>
      )}

      {operationError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <span>{operationError}</span>
          <button onClick={() => setOperationError(null)} className="text-white/80 hover:text-white font-bold">×</button>
        </div>
      )}
    </div>
  )
}
