import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Upload, Loader2, AlertCircle,
  GitCompareArrows, CheckCircle2, X,
} from 'lucide-react'
import api from '../lib/api'

interface PageDiff {
  page: number
  status: 'identical' | 'changed' | 'added' | 'removed'
  diffImage?: string
}

interface CompareResult {
  pages1: number
  pages2: number
  textMatch: boolean
  pageDiffs: PageDiff[]
}

export default function ComparePage() {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const file1Ref = useRef<HTMLInputElement>(null)
  const file2Ref = useRef<HTMLInputElement>(null)

  const handleCompare = useCallback(async () => {
    if (!file1 || !file2) return
    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file1', file1)
    formData.append('file2', file2)

    try {
      const { data } = await api.post('/tools/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Comparison failed')
    }
    setLoading(false)
  }, [file1, file2])

  const statusColor = (status: string) => {
    switch (status) {
      case 'identical': return 'bg-green-50 border-green-200 text-green-700'
      case 'changed': return 'bg-orange-50 border-orange-200 text-orange-700'
      case 'added': return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'removed': return 'bg-red-50 border-red-200 text-red-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
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

      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link
          to="/tools"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          All tools
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
            <div className="text-purple-600">
              <GitCompareArrows className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Compare PDFs</h2>
              <p className="text-sm text-gray-500">Upload two PDFs to find differences page by page</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { file: file1, setFile: setFile1, ref: file1Ref, label: 'Original PDF' },
                { file: file2, setFile: setFile2, ref: file2Ref, label: 'Modified PDF' },
              ].map(({ file, setFile: setF, ref, label }, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
                  {file ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-red-500 shrink-0" />
                      <span className="text-sm text-gray-800 truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => { setF(null); setResult(null) }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => ref.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-gray-50 transition-all"
                    >
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-500">Choose file</p>
                    </button>
                  )}
                  <input
                    ref={ref}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      setF(e.target.files?.[0] || null)
                      setResult(null)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </div>
              ))}
            </div>

            {file1 && file2 && !result && (
              <button
                onClick={handleCompare}
                disabled={loading}
                className="w-full py-3 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompareArrows className="w-4 h-4" />
                    Compare PDFs
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{result.pages1}</p>
                    <p className="text-xs text-gray-500">Original pages</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{result.pages2}</p>
                    <p className="text-xs text-gray-500">Modified pages</p>
                  </div>
                  <div className={`p-3 rounded-lg ${result.textMatch ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <p className={`text-2xl font-bold ${result.textMatch ? 'text-green-600' : 'text-orange-600'}`}>
                      {result.textMatch ? 'Match' : 'Differ'}
                    </p>
                    <p className="text-xs text-gray-500">Text content</p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Page-by-page comparison</h3>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {result.pageDiffs.map((diff) => (
                    <div key={diff.page} className={`p-3 rounded-lg border ${statusColor(diff.status)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Page {diff.page}</span>
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {diff.status === 'identical' && <><CheckCircle2 className="w-3 h-3 inline mr-1" />Identical</>}
                          {diff.status === 'changed' && 'Changed'}
                          {diff.status === 'added' && 'Added in modified'}
                          {diff.status === 'removed' && 'Removed in modified'}
                        </span>
                      </div>
                      {diff.diffImage && (
                        <img src={diff.diffImage} alt={`Diff page ${diff.page}`} className="w-full rounded border border-gray-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
