import { useState, useRef } from 'react'
import api from '../lib/api'

interface Tool {
  id: string
  name: string
  description: string
  endpoint: string
  fields: ToolField[]
}

interface ToolField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox'
  default: string | number | boolean
  options?: { label: string; value: string }[]
}

const tools: Tool[] = [
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce file size by compressing images',
    endpoint: '/tools/compress',
    fields: [
      { name: 'quality', label: 'Image Quality', type: 'select', default: '0.5',
        options: [
          { label: 'Low (smaller file)', value: '0.3' },
          { label: 'Medium', value: '0.5' },
          { label: 'High (larger file)', value: '0.8' },
        ]},
    ],
  },
  {
    id: 'watermark',
    name: 'Add Watermark',
    description: 'Add a text watermark to every page',
    endpoint: '/tools/watermark',
    fields: [
      { name: 'text', label: 'Watermark Text', type: 'text', default: 'CONFIDENTIAL' },
      { name: 'opacity', label: 'Opacity', type: 'number', default: 0.3 },
      { name: 'rotation', label: 'Rotation', type: 'number', default: 45 },
      { name: 'fontSize', label: 'Font Size', type: 'number', default: 48 },
    ],
  },
  {
    id: 'protect',
    name: 'Protect PDF',
    description: 'Add password protection to your PDF',
    endpoint: '/tools/protect',
    fields: [
      { name: 'password', label: 'Password', type: 'text', default: '' },
      { name: 'allowPrint', label: 'Allow printing', type: 'checkbox', default: true },
      { name: 'allowCopy', label: 'Allow copying', type: 'checkbox', default: false },
    ],
  },
  {
    id: 'unlock',
    name: 'Unlock PDF',
    description: 'Remove password protection from a PDF',
    endpoint: '/tools/unlock',
    fields: [
      { name: 'password', label: 'Password', type: 'text', default: '' },
    ],
  },
  {
    id: 'page-numbers',
    name: 'Add Page Numbers',
    description: 'Add page numbers to your PDF',
    endpoint: '/tools/page-numbers',
    fields: [
      { name: 'position', label: 'Position', type: 'select', default: 'bottom-center',
        options: [
          { label: 'Bottom Center', value: 'bottom-center' },
          { label: 'Bottom Left', value: 'bottom-left' },
          { label: 'Bottom Right', value: 'bottom-right' },
          { label: 'Top Center', value: 'top-center' },
        ]},
      { name: 'startFrom', label: 'Start from', type: 'number', default: 1 },
      { name: 'fontSize', label: 'Font Size', type: 'number', default: 10 },
    ],
  },
]

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [params, setParams] = useState<Record<string, string | number | boolean>>({})
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectTool = (tool: Tool) => {
    setActiveTool(tool)
    setFile(null)
    const defaults: Record<string, string | number | boolean> = {}
    tool.fields.forEach((f) => { defaults[f.name] = f.default })
    setParams(defaults)
  }

  const handleProcess = async () => {
    if (!activeTool || !file) return
    setProcessing(true)

    const formData = new FormData()
    formData.append('file', file)
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    try {
      const response = await api.post(activeTool.endpoint, formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeTool.id}-result.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    setProcessing(false)
  }

  if (!activeTool) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">PDF Tools</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => selectTool(tool)}
                className="p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <h3 className="text-sm font-semibold text-gray-800">{tool.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{tool.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setActiveTool(null)} className="text-sm text-primary-600 hover:underline mb-4">
          &larr; Back to tools
        </button>

        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">{activeTool.name}</h2>
          <p className="text-xs text-gray-500 mb-4">{activeTool.description}</p>

          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs"
            />
          </div>

          <div className="space-y-3 mb-5">
            {activeTool.fields.map((field) => (
              <div key={field.name}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{field.label}</label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={String(params[field.name] ?? '')}
                    onChange={(e) => setParams({ ...params, [field.name]: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  />
                )}
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={Number(params[field.name] ?? 0)}
                    onChange={(e) => setParams({ ...params, [field.name]: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={String(params[field.name] ?? '')}
                    onChange={(e) => setParams({ ...params, [field.name]: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
                {field.type === 'checkbox' && (
                  <input
                    type="checkbox"
                    checked={Boolean(params[field.name])}
                    onChange={(e) => setParams({ ...params, [field.name]: e.target.checked })}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleProcess}
            disabled={!file || processing}
            className="w-full py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Process & Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
