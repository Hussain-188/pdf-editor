import { useState, useCallback } from 'react'
import { X, Search, Replace, Loader2 } from 'lucide-react'
import api from '../../lib/api'

interface FindResult {
  pageNumber: number
  blockId: string
  text: string
  x: number
  y: number
}

interface FindReplaceDialogProps {
  documentId: string
  open: boolean
  onClose: () => void
  onReplaced: () => void
}

export default function FindReplaceDialog({
  documentId,
  open,
  onClose,
  onReplaced,
}: FindReplaceDialogProps) {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [results, setResults] = useState<FindResult[]>([])
  const [searching, setSearching] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [replaceCount, setReplaceCount] = useState<number | null>(null)
  const [error, setError] = useState('')

  const handleFind = useCallback(async () => {
    if (!searchText.trim()) return
    setSearching(true)
    setError('')
    setReplaceCount(null)
    try {
      const { data } = await api.post(`/documents/${documentId}/find`, {
        searchText: searchText.trim(),
        caseSensitive,
      })
      setResults(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed')
    }
    setSearching(false)
  }, [documentId, searchText, caseSensitive])

  const handleReplaceAll = useCallback(async () => {
    if (!searchText.trim()) return
    setReplacing(true)
    setError('')
    try {
      await api.post(`/documents/${documentId}/replace-all`, {
        searchText: searchText.trim(),
        replaceText,
        caseSensitive,
      })
      setReplaceCount(results.length)
      setResults([])
      onReplaced()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Replace failed')
    }
    setReplacing(false)
  }, [documentId, searchText, replaceText, caseSensitive, results.length, onReplaced])

  if (!open) return null

  return (
    <div className="fixed top-20 right-6 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Find & Replace</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Find</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFind()}
              placeholder="Search text..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <button
              onClick={handleFind}
              disabled={searching || !searchText.trim()}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Replace with</label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replacement text..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="rounded border-gray-300 text-primary-600"
          />
          Case sensitive
        </label>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>
        )}

        {results.length > 0 && (
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-lg">
            Found {results.length} match{results.length !== 1 ? 'es' : ''} across{' '}
            {new Set(results.map((r) => r.pageNumber)).size} page(s)
          </div>
        )}

        {replaceCount !== null && (
          <div className="text-xs text-green-700 bg-green-50 p-2 rounded-lg">
            Replaced {replaceCount} occurrence{replaceCount !== 1 ? 's' : ''}
          </div>
        )}

        {results.length > 0 && (
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
            {results.map((r, i) => (
              <div
                key={i}
                className="px-3 py-2 text-xs border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <span className="text-gray-400">Page {r.pageNumber}:</span>{' '}
                <span className="text-gray-800">{r.text.slice(0, 60)}{r.text.length > 60 ? '...' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <button
            onClick={handleReplaceAll}
            disabled={replacing}
            className="w-full py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {replacing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Replacing...
              </>
            ) : (
              <>
                <Replace className="w-4 h-4" />
                Replace All ({results.length})
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
