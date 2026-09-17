import { useState, useRef, useEffect, useCallback } from 'react'
import type { TextBlockData } from '../../stores/editorStore'
import { useCoordinateTransform } from '../../hooks/useCoordinateTransform'
import { mapPdfFontToCSS, isBoldFont, isItalicFont } from '../../lib/fontMapper'
import { sendPdfOperation } from '../../lib/pdfOperations'
import { usePdfStore } from '../../stores/pdfStore'

interface InlineTextEditorProps {
  block: TextBlockData
  pageNumber: number
  pageHeight: number
  scale: number
  onEditComplete: (changed: boolean) => void
  onError?: (message: string) => void
}

export default function InlineTextEditor({
  block, pageNumber, pageHeight, scale, onEditComplete, onError,
}: InlineTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const originalTextRef = useRef(block.text)
  const hasBlurredRef = useRef(false)
  const { pdfRectToScreen } = useCoordinateTransform(scale, pageHeight)

  const rect = pdfRectToScreen({
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
  })

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [])

  const handleSave = useCallback(async () => {
    if (savingRef.current || hasBlurredRef.current) return
    hasBlurredRef.current = true

    const el = editorRef.current
    if (!el) {
      onEditComplete(false)
      return
    }

    const newText = el.textContent || ''
    if (newText === originalTextRef.current) {
      onEditComplete(false)
      return
    }

    savingRef.current = true
    setSaving(true)
    try {
      const editRequest = JSON.stringify({
        pageNumber,
        textBlockId: block.id,
        operation: 'TEXT_REPLACE',
        oldText: originalTextRef.current,
        newText,
      })
      const newBytes = await sendPdfOperation('/editor/edit', (fd) => {
        fd.append('editRequest', editRequest)
      })
      usePdfStore.getState().updatePdf(newBytes)
      onEditComplete(true)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Edit failed'
      onError?.(msg)
      onEditComplete(false)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [block.id, pageNumber, onEditComplete, onError])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      editorRef.current?.blur()
    }
    if (e.key === 'Escape') {
      hasBlurredRef.current = true
      onEditComplete(false)
    }
    e.stopPropagation()
  }

  const fontFamily = mapPdfFontToCSS(block.fontName)
  const bold = isBoldFont(block.fontName)
  const italic = isItalicFont(block.fontName)
  const scaledFontSize = block.fontSize * scale
  const colorStr = `rgb(${block.color.map((c) => Math.round(c * 255)).join(',')})`

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{ left: rect.x - 3, top: rect.y - 3 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="outline-none border-2 border-blue-500 bg-white px-[3px] py-[2px]"
        style={{
          minWidth: rect.width + 6,
          minHeight: rect.height + 6,
          fontSize: scaledFontSize,
          fontFamily,
          fontWeight: bold ? 700 : 400,
          fontStyle: italic ? 'italic' : 'normal',
          lineHeight: 1.2,
          color: colorStr,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          caretColor: '#2563eb',
          boxShadow: '0 2px 12px rgba(37, 99, 235, 0.2), 0 0 0 1px rgba(37, 99, 235, 0.1)',
          borderRadius: 2,
          letterSpacing: '0.01em',
        }}
      >
        {block.text}
      </div>
      {saving && (
        <div className="absolute -bottom-5 left-0 flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-[10px] text-blue-600 font-medium">Saving...</span>
        </div>
      )}
    </div>
  )
}
