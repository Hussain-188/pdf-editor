import { create } from 'zustand'

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
  activeTool: AnnotationType | null
  activeColor: string
  activeStrokeWidth: number
  selectedAnnotationId: string | null

  setActiveTool: (tool: AnnotationType | null) => void
  setActiveColor: (color: string) => void
  setActiveStrokeWidth: (width: number) => void
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
  activeTool: null,
  activeColor: '#FFD700',
  activeStrokeWidth: 2,
  selectedAnnotationId: null,

  setActiveTool: (tool) => set({ activeTool: tool, selectedAnnotationId: null }),
  setActiveColor: (color) => set({ activeColor: color }),
  setActiveStrokeWidth: (width) => set({ activeStrokeWidth: width }),

  addAnnotation: (annotation) => {
    const id = `ann-${tempIdCounter++}`
    set((s) => ({ annotations: [...s.annotations, { ...annotation, id }] }))
  },

  updateAnnotation: (id, updates) => {
    set((s) => ({
      annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }))
  },

  deleteAnnotation: (id) => {
    set((s) => ({
      annotations: s.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: s.selectedAnnotationId === id ? null : s.selectedAnnotationId,
    }))
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  getPageAnnotations: (pageNumber) => get().annotations.filter((a) => a.pageNumber === pageNumber),

  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null }),
}))
