import { create } from 'zustand'
import api from '../lib/api'
import { usePdfStore } from './pdfStore'

export interface TextRunData {
  text: string
  x: number
  y: number
  width: number
  fontSize: number
  fontName: string
  contentStreamIndex: number
  operatorIndex: number
  operatorType: string | null
}

export interface EditabilityData {
  canEdit: boolean
  canAddCharacters: boolean
  canChangeFont: boolean
  reason: string | null
  confidence: number
}

export interface TextBlockData {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
  color: number[]
  editability: EditabilityData
  runs: TextRunData[]
}

export interface PageAnalysis {
  pageNumber: number
  width: number
  height: number
  textBlocks: TextBlockData[]
}

interface EditorState {
  pageAnalyses: Map<number, PageAnalysis>
  selectedBlockId: string | null
  analysisLoading: boolean

  analyzeDocument: () => Promise<void>
  analyzePage: (pageNumber: number) => Promise<void>
  selectBlock: (blockId: string | null) => void
  getPageAnalysis: (pageNumber: number) => PageAnalysis | undefined
  clearAnalyses: () => void
}

function makePdfFormData(): FormData | null {
  const { pdfBytes } = usePdfStore.getState()
  if (!pdfBytes) return null
  const formData = new FormData()
  formData.append('file', new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }), 'document.pdf')
  return formData
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pageAnalyses: new Map(),
  selectedBlockId: null,
  analysisLoading: false,

  analyzeDocument: async () => {
    const formData = makePdfFormData()
    if (!formData) return
    set({ analysisLoading: true })
    try {
      const { data } = await api.post('/editor/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const analyses = new Map<number, PageAnalysis>()
      for (const page of data) {
        analyses.set(page.pageNumber, page)
      }
      set({ pageAnalyses: analyses, analysisLoading: false })
    } catch {
      set({ analysisLoading: false })
    }
  },

  analyzePage: async (pageNumber) => {
    const formData = makePdfFormData()
    if (!formData) return
    formData.append('pageNumber', String(pageNumber))
    try {
      const { data } = await api.post('/editor/analyze-page', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const analyses = new Map(get().pageAnalyses)
      analyses.set(pageNumber, data)
      set({ pageAnalyses: analyses })
    } catch { /* ignore */ }
  },

  selectBlock: (blockId) => set({ selectedBlockId: blockId }),

  getPageAnalysis: (pageNumber) => get().pageAnalyses.get(pageNumber),

  clearAnalyses: () => set({ pageAnalyses: new Map(), selectedBlockId: null }),
}))
