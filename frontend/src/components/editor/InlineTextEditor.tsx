import { useState, useRef, useEffect } from 'react'
import type { TextBlockData } from '../../stores/editorStore'
import { useCoordinateTransform } from '../../hooks/useCoordinateTransform'
import api from '../../lib/api'

interface InlineTextEditorProps {
  block: TextBlockData
  pageNumber: number
  pageHeight: number
  scale: number
  documentId: string
  onEditComplete: () => void
}

export default function InlineTextEditor({
  block, pageNumber, pageHeight, scale, documentId, onEditComplete,
}: InlineTextEditorProps) {
  const [text, setText] = useState(block.text)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { pdfRectToScreen } = useCoordinateTransform(scale, pageHeight)

  const rect = pdfRectToScreen({
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
  })

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSave = async () => {
    if (text === block.text) {
      onEditComplete()
      return
    }

    setSaving(true)
    try {
      await api.post(`/documents/${documentId}/edit`, {
        pageNumber,
        textBlockId: block.id,
        operation: 'TEXT_REPLACE',
        oldText: block.text,
        newText: text,
      })
      onEditComplete()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Edit failed')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onEditComplete()
    }
  }

  return (
    <div
      className="absolute z-20"
      style={{ left: rect.x - 2, top: rect.y - 2 }}
    >
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        disabled={saving}
        className="border-2 border-primary-500 rounded px-1 bg-white/95 resize-none outline-none"
        style={{
          width: rect.width + 4,
          minHeight: rect.height + 4,
          fontSize: block.fontSize * scale,
          fontFamily: 'sans-serif',
          lineHeight: 1.2,
          color: `rgb(${block.color.map((c) => Math.round(c * 255)).join(',')})`,
        }}
      />
    </div>
  )
}
