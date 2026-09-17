import { create } from 'zustand'
import api from '../lib/api'
import { usePdfStore } from './pdfStore'

export interface OcrWord {
  text: string
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export interface OcrResult {
  pageNumber: number
  text: string
  words: OcrWord[]
  error: string | null
}

interface OcrState {
  results: Map<number, OcrResult>
  loading: boolean
  ocrPage: (pageNumber: number) => Promise<void>
  ocrAllPages: () => Promise<void>
  getPageResult: (pageNumber: number) => OcrResult | undefined
}

function makePdfFormData(): FormData | null {
  const { pdfBytes } = usePdfStore.getState()
  if (!pdfBytes) return null
  const formData = new FormData()
  formData.append('file', new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }), 'document.pdf')
  return formData
}

export const useOcrStore = create<OcrState>((set, get) => ({
  results: new Map(),
  loading: false,

  ocrPage: async (pageNumber) => {
    const formData = makePdfFormData()
    if (!formData) return
    formData.append('pageNumber', String(pageNumber))
    set({ loading: true })
    try {
      const { data } = await api.post('/editor/ocr-page', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      set((s) => {
        const results = new Map(s.results)
        results.set(pageNumber, data)
        return { results, loading: false }
      })
    } catch {
      set({ loading: false })
    }
  },

  ocrAllPages: async () => {
    const formData = makePdfFormData()
    if (!formData) return
    set({ loading: true })
    try {
      const { data } = await api.post<OcrResult[]>('/editor/ocr-all', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      set((s) => {
        const results = new Map(s.results)
        data.forEach((r: OcrResult) => results.set(r.pageNumber, r))
        return { results, loading: false }
      })
    } catch {
      set({ loading: false })
    }
  },

  getPageResult: (pageNumber) => get().results.get(pageNumber),
}))
