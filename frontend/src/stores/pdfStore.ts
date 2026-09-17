import { create } from 'zustand'

interface PdfState {
  pdfBytes: Uint8Array | null
  fileName: string
  setPdf: (bytes: Uint8Array, name: string) => void
  updatePdf: (bytes: Uint8Array) => void
  clear: () => void
}

export const usePdfStore = create<PdfState>((set) => ({
  pdfBytes: null,
  fileName: '',
  setPdf: (bytes, name) => set({ pdfBytes: bytes, fileName: name }),
  updatePdf: (bytes) => set({ pdfBytes: bytes }),
  clear: () => set({ pdfBytes: null, fileName: '' }),
}))
