import { useEffect, useState } from 'react'
import { X, Save, RotateCcw, Clock, Loader2 } from 'lucide-react'
import api from '../../lib/api'

interface Version {
  id: string
  versionNumber: number
  label: string
  fileSizeBytes: number
  createdAt: string
}

interface VersionHistoryPanelProps {
  documentId: string
  open: boolean
  onClose: () => void
  onRestore: () => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function VersionHistoryPanel({ documentId, open, onClose, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    if (open) loadVersions()
  }, [open, documentId])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/documents/${documentId}/versions`)
      setVersions(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId)
    try {
      await api.post(`/documents/${documentId}/versions/${versionId}/restore`)
      onRestore()
    } catch { /* ignore */ }
    setRestoring(null)
  }

  const handleCreateSnapshot = async () => {
    setSaving(true)
    try {
      await api.post(`/documents/${documentId}/versions`, { label: 'Manual snapshot' })
      await loadVersions()
    } catch { /* ignore */ }
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Save button */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          onClick={handleCreateSnapshot}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Current Version'}
        </button>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No versions saved yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Save" to create a checkpoint</p>
          </div>
        ) : (
          <div className="py-1">
            {versions.map((v, i) => (
              <div
                key={v.id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {v.label || `Version ${v.versionNumber}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{formatDate(v.createdAt)}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{formatSize(v.fileSizeBytes)}</span>
                    </div>
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() => handleRestore(v.id)}
                      disabled={restoring !== null}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50 shrink-0"
                    >
                      {restoring === v.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      Restore
                    </button>
                  )}
                </div>
                {i === 0 && (
                  <span className="inline-block mt-1.5 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
