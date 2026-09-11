import { useState, useCallback } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useCoordinateTransform } from '../../hooks/useCoordinateTransform'
import InlineTextEditor from './InlineTextEditor'

interface TextBlockOverlayProps {
  pageNumber: number
  pageWidth: number
  pageHeight: number
  scale: number
  documentId?: string
  onDocumentChanged?: () => void
  onError?: (message: string) => void
}

export default function TextBlockOverlay({ pageNumber, pageWidth, pageHeight, scale, documentId, onDocumentChanged, onError }: TextBlockOverlayProps) {
  const analysis = useEditorStore((s) => s.getPageAnalysis(pageNumber))
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId)
  const selectBlock = useEditorStore((s) => s.selectBlock)
  const analyzeDocument = useEditorStore((s) => s.analyzeDocument)
  const docId = useEditorStore((s) => s.documentId)
  const { pdfRectToScreen } = useCoordinateTransform(scale, pageWidth, pageHeight)

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)

  const effectiveDocId = documentId || docId

  const handleEditComplete = useCallback((changed: boolean) => {
    setEditingBlockId(null)
    selectBlock(null)
    if (changed && effectiveDocId) {
      analyzeDocument(effectiveDocId)
      onDocumentChanged?.()
    }
  }, [effectiveDocId, analyzeDocument, selectBlock, onDocumentChanged])

  if (!analysis) return null

  return (
    <div className="absolute inset-0">
      {analysis.textBlocks.map((block) => {
        const rect = pdfRectToScreen({
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
        })

        const isEditing = editingBlockId === block.id
        const isSelected = selectedBlockId === block.id

        if (isEditing && effectiveDocId) {
          return (
            <InlineTextEditor
              key={block.id}
              block={block}
              pageNumber={pageNumber}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              scale={scale}
              documentId={effectiveDocId}
              onEditComplete={handleEditComplete}
              onError={onError}
            />
          )
        }

        return (
          <div
            key={block.id}
            onClick={(e) => {
              e.stopPropagation()
              selectBlock(block.id)
              setEditingBlockId(block.id)
            }}
            className={`absolute pointer-events-auto transition-colors duration-100 ${
              isSelected
                ? 'border-2 border-blue-500 bg-blue-500/5 cursor-text'
                : 'border border-transparent hover:border-blue-400/50 hover:bg-blue-50/30 cursor-text'
            }`}
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            title="Click to edit"
          />
        )
      })}
    </div>
  )
}
