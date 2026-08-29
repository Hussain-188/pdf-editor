import { create } from 'zustand'
import api from '../lib/api'

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
  ocrPage: (documentId: string, pageNumber: number) => Promise<void>
  ocrAllPages: (documentId: string) => Promise<void>
  getPageResult: (pageNumber: number) => OcrResult | undefined
}

export const useOcrStore = create<OcrState>((set, get) => ({
  results: new Map(),
  loading: false,

  ocrPage: async (documentId, pageNumber) => {
    set({ loading: true })
    try {
      const { data } = await api.post(`/documents/${documentId}/ocr/${pageNumber}`)
      set((s) => {
        const results = new Map(s.results)
        results.set(pageNumber, data)
        return { results, loading: false }
      })
    } catch {
      set({ loading: false })
    }
  },

  ocrAllPages: async (documentId) => {
    set({ loading: true })
    try {
      const { data } = await api.post<OcrResult[]>(`/documents/${documentId}/ocr`)
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
