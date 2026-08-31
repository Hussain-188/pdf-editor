import { create } from 'zustand'
import api from '../lib/api'

export type AnnotationType = 'textbox' | 'highlight' | 'freehand' | 'shape' | 'sticky' | 'underline' | 'strikethrough' | 'whiteout'

export interface Annotation {
  id: string
  type: AnnotationType
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
  color: string
  strokeWidth: number
  points?: { x: number; y: number }[]
  shapeType?: 'rectangle' | 'circle' | 'arrow' | 'line'
}

interface AnnotationState {
  annotations: Annotation[]
  documentId: string | null
  activeTool: AnnotationType | null
  activeColor: string
  activeStrokeWidth: number
  selectedAnnotationId: string | null
  loading: boolean

  setActiveTool: (tool: AnnotationType | null) => void
  setActiveColor: (color: string) => void
  setActiveStrokeWidth: (width: number) => void
  loadAnnotations: (documentId: string) => Promise<void>
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string | null) => void
  getPageAnnotations: (pageNumber: number) => Annotation[]
  clearAnnotations: () => void
}

let tempIdCounter = 1

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  documentId: null,
  activeTool: null,
  activeColor: '#FFD700',
  activeStrokeWidth: 2,
  selectedAnnotationId: null,
  loading: false,

  setActiveTool: (tool) => set({ activeTool: tool, selectedAnnotationId: null }),
  setActiveColor: (color) => set({ activeColor: color }),
  setActiveStrokeWidth: (width) => set({ activeStrokeWidth: width }),

  loadAnnotations: async (documentId: string) => {
    set({ loading: true, documentId })
    try {
      const { data } = await api.get(`/documents/${documentId}/annotations`)
      set({ annotations: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  addAnnotation: (annotation) => {
    const tempId = `temp-${tempIdCounter++}`
    const optimistic = { ...annotation, id: tempId }
    set((s) => ({ annotations: [...s.annotations, optimistic] }))

    const docId = get().documentId
    if (!docId) return

    const payload: Record<string, unknown> = {
      pageNumber: annotation.pageNumber,
      type: annotation.type,
      x: annotation.x,
      y: annotation.y,
      width: annotation.width,
      height: annotation.height,
      text: annotation.text,
      color: annotation.color,
      strokeWidth: annotation.strokeWidth,
      points: annotation.points,
      shapeType: annotation.shapeType,
    }

    api.post(`/documents/${docId}/annotations`, payload)
      .then(({ data }) => {
        set((s) => ({
          annotations: s.annotations.map((a) => (a.id === tempId ? { ...a, id: data.id } : a)),
        }))
      })
      .catch(() => {
        set((s) => ({ annotations: s.annotations.filter((a) => a.id !== tempId) }))
      })
  },

  updateAnnotation: (id, updates) => {
    set((s) => ({
      annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }))

    const docId = get().documentId
    if (!docId || id.startsWith('temp-')) return

    const ann = get().annotations.find((a) => a.id === id)
    if (!ann) return

    api.put(`/documents/${docId}/annotations/${id}`, {
      x: ann.x,
      y: ann.y,
      width: ann.width,
      height: ann.height,
      text: ann.text,
      color: ann.color,
      strokeWidth: ann.strokeWidth,
      points: ann.points,
    }).catch(() => {})
  },

  deleteAnnotation: (id) => {
    set((s) => ({
      annotations: s.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: s.selectedAnnotationId === id ? null : s.selectedAnnotationId,
    }))

    const docId = get().documentId
    if (!docId || id.startsWith('temp-')) return

    api.delete(`/documents/${docId}/annotations/${id}`).catch(() => {})
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  getPageAnnotations: (pageNumber) => get().annotations.filter((a) => a.pageNumber === pageNumber),

  clearAnnotations: () => set({ annotations: [], documentId: null }),
}))
