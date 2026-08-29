import { useState } from 'react'
import type { TextBlockData } from '../../stores/editorStore'
import api from '../../lib/api'

interface PropertiesPanelProps {
  block: TextBlockData
  documentId: string
  pageNumber: number
  onUpdate: () => void
}

export default function PropertiesPanel({ block, documentId, pageNumber, onUpdate }: PropertiesPanelProps) {
  const [fontSize, setFontSize] = useState(block.fontSize)
  const [color, setColor] = useState(rgbToHex(block.color))

  const handleFontSizeChange = async (newSize: number) => {
    setFontSize(newSize)
    try {
      await api.post(`/documents/${documentId}/edit`, {
        pageNumber,
        textBlockId: block.id,
        operation: 'FONT_SIZE_CHANGE',
        oldText: block.text,
        fontSize: newSize,
      })
      onUpdate()
    } catch { /* ignore */ }
  }

  const handleColorChange = async (hexColor: string) => {
    setColor(hexColor)
    const rgb = hexToRgb(hexColor)
    try {
      await api.post(`/documents/${documentId}/edit`, {
        pageNumber,
        textBlockId: block.id,
        operation: 'TEXT_COLOR_CHANGE',
        oldText: block.text,
        color: rgb,
      })
      onUpdate()
    } catch { /* ignore */ }
  }

  return (
    <div className="w-60 bg-white border-l p-4 space-y-4 shrink-0 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700">Properties</h3>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Text</label>
        <p className="text-sm text-gray-800 break-words">{block.text}</p>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Font</label>
        <p className="text-sm text-gray-800">{block.fontName}</p>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Size</label>
        <input
          type="number"
          value={fontSize}
          onChange={(e) => handleFontSizeChange(parseFloat(e.target.value) || block.fontSize)}
          min={4}
          max={144}
          step={0.5}
          className="w-20 px-2 py-1 border rounded text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Editability</label>
        <div className={`text-xs px-2 py-1 rounded ${
          block.editability.canEdit ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        }`}>
          {block.editability.canEdit ? 'Editable' : block.editability.reason || 'Not editable'}
        </div>
      </div>
    </div>
  )
}

function rgbToHex(rgb: number[]): string {
  return '#' + rgb.map((c) => {
    const hex = Math.round(c * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ]
}
