import { useEditorStore } from '../../stores/editorStore'
import { useCoordinateTransform } from '../../hooks/useCoordinateTransform'

interface TextBlockOverlayProps {
  pageNumber: number
  pageHeight: number
  scale: number
}

export default function TextBlockOverlay({ pageNumber, pageHeight, scale }: TextBlockOverlayProps) {
  const analysis = useEditorStore((s) => s.getPageAnalysis(pageNumber))
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId)
  const selectBlock = useEditorStore((s) => s.selectBlock)
  const { pdfRectToScreen } = useCoordinateTransform(scale, pageHeight)

  if (!analysis) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {analysis.textBlocks.map((block) => {
        const rect = pdfRectToScreen({
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
        })

        const isSelected = selectedBlockId === block.id
        const editClass = block.editability.canEdit
          ? 'border-green-400/50 hover:border-green-500 hover:bg-green-500/5'
          : 'border-yellow-400/50 hover:border-yellow-500 hover:bg-yellow-500/5'

        return (
          <div
            key={block.id}
            onClick={(e) => {
              e.stopPropagation()
              selectBlock(isSelected ? null : block.id)
            }}
            className={`absolute border cursor-pointer pointer-events-auto transition-colors ${
              isSelected ? 'border-primary-500 bg-primary-500/10 border-2' : editClass
            }`}
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            title={block.editability.canEdit ? block.text : `Not editable: ${block.editability.reason}`}
          />
        )
      })}
    </div>
  )
}
