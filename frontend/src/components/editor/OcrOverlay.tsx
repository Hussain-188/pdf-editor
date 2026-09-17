import { useOcrStore } from '../../stores/ocrStore'

interface OcrOverlayProps {
  pageNumber: number
  pageHeight: number
  scale: number
}

export default function OcrOverlay({ pageNumber, pageHeight, scale }: OcrOverlayProps) {
  const result = useOcrStore((s) => s.getPageResult(pageNumber))
  const ocrPage = useOcrStore((s) => s.ocrPage)
  const loading = useOcrStore((s) => s.loading)

  if (!result) {
    return (
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => ocrPage(pageNumber)}
          disabled={loading}
          className="px-2 py-1 text-[10px] bg-amber-100 text-amber-800 rounded border border-amber-300 hover:bg-amber-200 disabled:opacity-50"
        >
          {loading ? 'Running OCR...' : 'Run OCR'}
        </button>
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="absolute top-2 right-2 z-10 px-2 py-1 text-[10px] bg-red-100 text-red-700 rounded">
        OCR failed: {result.error}
      </div>
    )
  }

  return (
    <>
      {result.words.map((word, i) => {
        const screenX = word.x * scale
        const screenY = (pageHeight - word.y - word.height) * scale
        const screenW = word.width * scale
        const screenH = word.height * scale

        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: screenX,
              top: screenY,
              width: screenW,
              height: screenH,
              backgroundColor: `rgba(59, 130, 246, ${Math.max(0.05, word.confidence / 200)})`,
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
            title={`${word.text} (${Math.round(word.confidence)}%)`}
          />
        )
      })}
    </>
  )
}
