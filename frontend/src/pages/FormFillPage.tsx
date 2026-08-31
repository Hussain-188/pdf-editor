import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Upload, Loader2, CheckCircle2, AlertCircle,
  Download, ClipboardList, X,
} from 'lucide-react'
import api from '../lib/api'

interface FormField {
  name: string
  type: string
  value: string
  options?: string[]
  checked?: boolean
  readOnly?: boolean
}

export default function FormFillPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setFields([])
    setValues({})
    setDone(false)
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const { data } = await api.post('/tools/form/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFields(data)
      const initialValues: Record<string, string> = {}
      data.forEach((f: FormField) => {
        initialValues[f.name] = f.value || ''
      })
      setValues(initialValues)

      if (data.length === 0) {
        setError('This PDF does not contain any form fields.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to detect form fields')
    }
    setLoading(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile?.type === 'application/pdf') handleFileSelect(droppedFile)
    },
    [handleFileSelect]
  )

  const handleFill = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    setDone(false)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('fields', JSON.stringify(values))

    try {
      const response = await api.post('/tools/form/fill', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace('.pdf', '_filled.pdf')
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fill form')
    }
    setProcessing(false)
  }

  const handleExport = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post('/tools/form/export', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace('.pdf', '_form_data.json')
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export form data')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <FileText className="w-6 h-6" />
            PDF Editor
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link
          to="/tools"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          All tools
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
            <div className="text-indigo-600">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Fill PDF Form</h2>
              <p className="text-sm text-gray-500">Detect and fill form fields in your PDF</p>
            </div>
          </div>

          <div className="p-8">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Drop your PDF form here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Upload a PDF with form fields</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-3" />
                <p className="text-sm text-gray-500">Detecting form fields...</p>
              </div>
            ) : fields.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">{fields.length} field{fields.length !== 1 ? 's' : ''} detected</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExport}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Export Data
                    </button>
                    <button
                      onClick={() => { setFile(null); setFields([]); setValues({}); setDone(false); setError('') }}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" /> Change file
                    </button>
                  </div>
                </div>

                <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-2">
                  {fields.map((field) => (
                    <div key={field.name} className="border border-gray-200 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">
                        {field.name}
                        <span className="text-xs text-gray-400 ml-2">({field.type})</span>
                        {field.readOnly && <span className="text-xs text-orange-500 ml-1">(read-only)</span>}
                      </label>
                      {field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={values[field.name] === 'Yes'}
                            onChange={(e) => setValues({ ...values, [field.name]: e.target.checked ? 'Yes' : 'Off' })}
                            disabled={field.readOnly}
                            className="rounded border-gray-300 text-primary-600"
                          />
                          <span className="text-sm text-gray-600">Checked</span>
                        </label>
                      ) : field.type === 'combobox' || field.type === 'listbox' ? (
                        <select
                          value={values[field.name] || ''}
                          onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                          disabled={field.readOnly}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white disabled:bg-gray-100"
                        >
                          <option value="">-- Select --</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={values[field.name] || ''}
                          onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                          disabled={field.readOnly}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Done! Your filled PDF has been downloaded.
              </div>
            )}

            {fields.length > 0 && (
              <button
                onClick={handleFill}
                disabled={processing}
                className="w-full py-3 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Filling form...
                  </>
                ) : done ? (
                  <>
                    <Download className="w-4 h-4" />
                    Fill & Download Again
                  </>
                ) : (
                  'Fill Form & Download'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
