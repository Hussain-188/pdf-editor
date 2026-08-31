import { create } from 'zustand'
import api from '../lib/api'

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
  documentId: string | null
  pageAnalyses: Map<number, PageAnalysis>
  selectedBlockId: string | null
  analysisLoading: boolean

  setDocumentId: (id: string) => void
  analyzeDocument: (id: string) => Promise<void>
  analyzePage: (id: string, pageNumber: number) => Promise<void>
  selectBlock: (blockId: string | null) => void
  getPageAnalysis: (pageNumber: number) => PageAnalysis | undefined
  undo: () => Promise<void>
  redo: () => Promise<void>
}

export const useEditorStore = create<EditorState>((set, get) => ({
  documentId: null,
  pageAnalyses: new Map(),
  selectedBlockId: null,
  analysisLoading: false,

  setDocumentId: (id) => set({ documentId: id }),

  analyzeDocument: async (id) => {
    set({ analysisLoading: true })
    try {
      const { data } = await api.post(`/documents/${id}/analyze`)
      const analyses = new Map<number, PageAnalysis>()
      for (const page of data) {
        analyses.set(page.pageNumber, page)
      }
      set({ pageAnalyses: analyses, analysisLoading: false })
    } catch {
      set({ analysisLoading: false })
    }
  },

  analyzePage: async (id, pageNumber) => {
    try {
      const { data } = await api.get(`/documents/${id}/pages/${pageNumber}/analysis`)
      const analyses = new Map(get().pageAnalyses)
      analyses.set(pageNumber, data)
      set({ pageAnalyses: analyses })
    } catch { /* ignore */ }
  },

  selectBlock: (blockId) => set({ selectedBlockId: blockId }),

  getPageAnalysis: (pageNumber) => get().pageAnalyses.get(pageNumber),

  undo: async () => {
    const id = get().documentId
    if (!id) return
    await api.post(`/documents/${id}/undo`)
  },

  redo: async () => {
    const id = get().documentId
    if (!id) return
    await api.post(`/documents/${id}/redo`)
  },
}))
