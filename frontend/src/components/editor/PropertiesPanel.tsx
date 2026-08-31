import { useState, useEffect } from 'react'
import { Type, Palette, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import type { TextBlockData } from '../../stores/editorStore'
import api from '../../lib/api'

interface PropertiesPanelProps {
  block: TextBlockData
  documentId: string
  pageNumber: number
  onUpdate: () => void
  onClose: () => void
}

const PRESET_COLORS = [
  '#000000', '#374151', '#DC2626', '#EA580C',
  '#CA8A04', '#16A34A', '#2563EB', '#7C3AED',
]

export default function PropertiesPanel({ block, documentId, pageNumber, onUpdate, onClose }: PropertiesPanelProps) {
  const [fontSize, setFontSize] = useState(block.fontSize)
  const [color, setColor] = useState(rgbToHex(block.color))

  useEffect(() => {
    setFontSize(block.fontSize)
    setColor(rgbToHex(block.color))
  }, [block.id])

  const handleFontSizeChange = async (newSize: number) => {
    if (newSize < 4 || newSize > 144) return
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
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Editability */}
        <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
          block.editability.canEdit
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {block.editability.canEdit
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          }
          <span>{block.editability.canEdit ? 'This text block is editable. Double-click to edit.' : block.editability.reason || 'This text block cannot be edited.'}</span>
        </div>

        {/* Text preview */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            <Type className="w-3.5 h-3.5" />
            Text Content
          </label>
          <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 break-words leading-relaxed max-h-32 overflow-y-auto">
            {block.text}
          </p>
        </div>

        {/* Font info */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Font</label>
          <p className="text-sm text-gray-800 font-mono bg-gray-50 rounded-lg px-3 py-2">{block.fontName}</p>
        </div>

        {/* Font size */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Size</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFontSizeChange(fontSize - 1)}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-bold"
            >
              −
            </button>
            <input
              type="number"
              value={Math.round(fontSize * 10) / 10}
              onChange={(e) => handleFontSizeChange(parseFloat(e.target.value) || block.fontSize)}
              min={4}
              max={144}
              step={0.5}
              className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <button
              onClick={() => handleFontSizeChange(fontSize + 1)}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-bold"
            >
              +
            </button>
            <span className="text-xs text-gray-400">pt</span>
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            <Palette className="w-3.5 h-3.5" />
            Color
          </label>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  color === c ? 'border-primary-500 scale-110' : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <span className="text-xs text-gray-500 font-mono">{color.toUpperCase()}</span>
          </div>
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
