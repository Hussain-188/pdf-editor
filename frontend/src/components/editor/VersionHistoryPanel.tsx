import { useEffect, useState } from 'react'
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

export default function VersionHistoryPanel({ documentId, open, onClose, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
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
    try {
      await api.post(`/documents/${documentId}/versions`, { label: 'Manual snapshot' })
      loadVersions()
    } catch { /* ignore */ }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString()
  }

  if (!open) return null

  return (
    <div className="w-64 bg-white border-l flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Version History</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateSnapshot}
            className="text-[10px] text-primary-600 hover:text-primary-800"
          >
            Save
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">
            &times;
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-xs text-gray-500">Loading...</div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">No versions yet</div>
        ) : (
          versions.map((v) => (
            <div
              key={v.id}
              className="px-3 py-2 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-800">
                  {v.label || `v${v.versionNumber}`}
                </span>
                <button
                  onClick={() => handleRestore(v.id)}
                  disabled={restoring !== null}
                  className="text-[10px] text-primary-600 hover:underline disabled:opacity-50"
                >
                  {restoring === v.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {formatDate(v.createdAt)} &middot; {formatSize(v.fileSizeBytes)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
