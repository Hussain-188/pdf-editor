import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDocument } from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import '../lib/pdfWorker'
import { usePdfStore } from '../stores/pdfStore'
import { sendPdfOperation, downloadPdf } from '../lib/pdfOperations'
import { useViewport } from '../hooks/useViewport'
import { useEditorStore } from '../stores/editorStore'
import { useAnnotationStore } from '../stores/annotationStore'
import Toolbar, { type EditorMode } from '../components/editor/Toolbar'
import AnnotationToolbar from '../components/editor/AnnotationToolbar'
import PageRenderer from '../components/editor/PageRenderer'
import PagePanel from '../components/editor/PagePanel'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import ExportDialog from '../components/editor/ExportDialog'
import FindReplaceDialog from '../components/editor/FindReplaceDialog'
import SignatureDialog from '../components/editor/SignatureDialog'
import { Upload } from 'lucide-react'

export default function EditorPage() {
  const navigate = useNavigate()
  const { viewport, zoomIn, zoomOut, setScale } = useViewport(1.0)
  const pdfBytes = usePdfStore((s) => s.pdfBytes)
  const fileName = usePdfStore((s) => s.fileName)
  const updatePdf = usePdfStore((s) => s.updatePdf)
  const setPdf = usePdfStore((s) => s.setPdf)
  const analyzeDocument = useEditorStore((s) => s.analyzeDocument)
  const analysisLoading = useEditorStore((s) => s.analysisLoading)
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId)
  const pageAnalyses = useEditorStore((s) => s.pageAnalyses)
  const selectBlock = useEditorStore((s) => s.selectBlock)
  const clearAnalyses = useEditorStore((s) => s.clearAnalyses)
  const clearAnnotations = useAnnotationStore((s) => s.clearAnnotations)
  const setActiveTool = useAnnotationStore((s) => s.setActiveTool)

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')

  useEffect(() => {
    if (editorMode !== 'annotate') setActiveTool(null)
  }, [editorMode, setActiveTool])

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<number, string>>(new Map())
  const [operationError, setOperationError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null
    for (const [pageNum, analysis] of pageAnalyses) {
      const block = analysis.textBlocks.find((b) => b.id === selectedBlockId)
      if (block) return { block, pageNumber: pageNum }
    }
    return null
  }, [selectedBlockId, pageAnalyses])

  const generateThumbnails = useCallback(async (doc: PDFDocumentProxy) => {
    const newThumbnails = new Map<number, string>()
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 0.2 })
      const canvas = document.createElement('canvas')
      canvas.width = vp.width
      canvas.height = vp.height
      await page.render({ canvas, viewport: vp }).promise
      newThumbnails.set(i, canvas.toDataURL())
    }
    setThumbnailUrls(newThumbnails)
  }, [])

  const loadFromBytes = useCallback(async (bytes: Uint8Array) => {
    try {
      const doc = await getDocument({ data: bytes.buffer.slice(0) as ArrayBuffer }).promise
      setPdfDoc(doc)

      const loadedPages: PDFPageProxy[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        loadedPages.push(await doc.getPage(i))
      }
      setPages(loadedPages)
      setLoading(false)

      generateThumbnails(doc)
      analyzeDocument()
    } catch (err: any) {
      setError(err.message || 'Failed to load PDF')
      setLoading(false)
    }
  }, [generateThumbnails, analyzeDocument])

  useEffect(() => {
    if (!pdfBytes) {
      setLoading(false)
      return
    }
    loadFromBytes(pdfBytes)

    return () => {
      pdfDoc?.cleanup()
      clearAnnotations()
      clearAnalyses()
    }
  }, [])

  const reloadFromBytes = useCallback(async (bytes: Uint8Array) => {
    pdfDoc?.cleanup()
    const doc = await getDocument({ data: bytes.buffer.slice(0) as ArrayBuffer }).promise
    setPdfDoc(doc)

    const loadedPages: PDFPageProxy[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      loadedPages.push(await doc.getPage(i))
    }
    setPages(loadedPages)
    generateThumbnails(doc)
    analyzeDocument()
  }, [pdfDoc, generateThumbnails, analyzeDocument])

  const handlePageAction = useCallback(async (
    endpoint: string,
    extraFormData?: (fd: FormData) => void,
  ) => {
    try {
      const newBytes = await sendPdfOperation(endpoint, extraFormData)
      updatePdf(newBytes)
      await reloadFromBytes(newBytes)
    } catch (err: any) {
      setOperationError(err.response?.data?.error || err.message || 'Operation failed')
      setTimeout(() => setOperationError(null), 5000)
    }
  }, [updatePdf, reloadFromBytes])

  const handleRotate = useCallback((page: number, degrees: number) => {
    handlePageAction('/editor/rotate-page', (fd) => {
      fd.append('pageNumber', String(page))
      fd.append('degrees', String(degrees))
    })
  }, [handlePageAction])

  const handleDeletePage = useCallback((page: number) => {
    handlePageAction('/editor/delete-page', (fd) => {
      fd.append('pageNumber', String(page))
    })
  }, [handlePageAction])

  const handleDuplicate = useCallback((page: number) => {
    handlePageAction('/editor/duplicate-page', (fd) => {
      fd.append('pageNumber', String(page))
    })
  }, [handlePageAction])

  const handleInsertBlank = useCallback((afterPage: number) => {
    handlePageAction('/editor/insert-blank', (fd) => {
      fd.append('afterPage', String(afterPage))
    })
  }, [handlePageAction])

  const handleReorder = useCallback((newOrder: number[]) => {
    handlePageAction('/editor/reorder', (fd) => {
      fd.append('order', JSON.stringify(newOrder))
    })
  }, [handlePageAction])

  const handleDownload = useCallback(() => {
    const bytes = usePdfStore.getState().pdfBytes
    if (bytes) {
      const name = fileName.replace('.pdf', '') + '_edited.pdf'
      downloadPdf(bytes, name)
    }
  }, [fileName])

  const handleFileOpen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    setPdf(bytes, file.name)
    setLoading(true)
    setError('')
    loadFromBytes(bytes)
  }, [setPdf, loadFromBytes])

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
    const bytes = usePdfStore.getState().pdfBytes
    if (bytes) reloadFromBytes(bytes)
  }, [reloadFromBytes])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setShowFindReplace((v) => !v)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowFindReplace(true)
      }
      if (e.key === 'Escape') {
        setShowFindReplace(false)
        selectBlock(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectBlock])

  if (!pdfBytes && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No PDF loaded</h2>
          <p className="text-sm text-gray-500 mb-6">Upload a PDF to start editing</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Open PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileOpen}
            className="hidden"
          />
          <button
            onClick={() => navigate('/')}
            className="block mx-auto mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

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
            onClick={() => navigate('/')}
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
        documentTitle={fileName.replace('.pdf', '')}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onScaleChange={setScale}
        onBack={() => navigate('/')}
        onExport={() => setShowExportDialog(true)}
        onDownload={handleDownload}
        onSign={() => setShowSignature(true)}
        onFindReplace={() => setShowFindReplace((v) => !v)}
        editorMode={editorMode}
        onModeChange={setEditorMode}
      />

      <AnnotationToolbar
        visible={editorMode === 'annotate'}
        onPdfChanged={async () => {
          const bytes = usePdfStore.getState().pdfBytes
          if (bytes) await reloadFromBytes(bytes)
        }}
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
              key={index}
              page={page}
              scale={viewport.scale}
              pageNumber={index + 1}
              showOverlay={editorMode === 'edit' && !analysisLoading}
              onDocumentChanged={async () => {
                const bytes = usePdfStore.getState().pdfBytes
                if (bytes) await reloadFromBytes(bytes)
              }}
              onError={(msg) => { setOperationError(msg); setTimeout(() => setOperationError(null), 5000) }}
            />
          ))}
        </div>

        {editorMode === 'edit' && selectedBlock && (
          <PropertiesPanel
            block={selectedBlock.block}
            pageNumber={selectedBlock.pageNumber}
            onUpdate={handlePropertiesUpdate}
            onClose={() => selectBlock(null)}
          />
        )}
      </div>

      <ExportDialog
        pageCount={pages.length}
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      <SignatureDialog
        pageNumber={currentPage}
        open={showSignature}
        onClose={() => setShowSignature(false)}
        onSigned={async () => {
          const bytes = usePdfStore.getState().pdfBytes
          if (bytes) await reloadFromBytes(bytes)
        }}
      />

      <FindReplaceDialog
        open={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        onReplaced={async () => {
          const bytes = usePdfStore.getState().pdfBytes
          if (bytes) await reloadFromBytes(bytes)
        }}
      />

      {operationError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <span>{operationError}</span>
          <button onClick={() => setOperationError(null)} className="text-white/80 hover:text-white font-bold">x</button>
        </div>
      )}
    </div>
  )
}
