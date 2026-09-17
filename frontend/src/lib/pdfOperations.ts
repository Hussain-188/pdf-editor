import api from './api'
import { usePdfStore } from '../stores/pdfStore'

export async function sendPdfOperation(
  endpoint: string,
  extraFormData?: (fd: FormData) => void,
): Promise<Uint8Array> {
  const { pdfBytes } = usePdfStore.getState()
  if (!pdfBytes) throw new Error('No PDF loaded')

  const formData = new FormData()
  formData.append('file', new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }), 'document.pdf')
  extraFormData?.(formData)

  const { data } = await api.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'arraybuffer',
  })
  return new Uint8Array(data)
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
