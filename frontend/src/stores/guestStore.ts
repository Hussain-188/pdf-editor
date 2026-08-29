import { create } from 'zustand'
import api from '../lib/api'

interface GuestState {
  sessionToken: string | null
  expiresAt: string | null
  maxDocuments: number
  initSession: () => Promise<string>
  clearSession: () => void
}

export const useGuestStore = create<GuestState>((set, get) => ({
  sessionToken: localStorage.getItem('guestToken'),
  expiresAt: localStorage.getItem('guestExpiresAt'),
  maxDocuments: 3,

  initSession: async () => {
    const existing = get().sessionToken
    const expiresAt = get().expiresAt
    if (existing && expiresAt && new Date(expiresAt) > new Date()) {
      try {
        await api.get('/guest/session/validate', { params: { guestToken: existing } })
        return existing
      } catch {
        get().clearSession()
      }
    }

    const { data } = await api.post('/guest/session')
    localStorage.setItem('guestToken', data.sessionToken)
    localStorage.setItem('guestExpiresAt', data.expiresAt)
    set({
      sessionToken: data.sessionToken,
      expiresAt: data.expiresAt,
      maxDocuments: data.maxDocuments,
    })
    return data.sessionToken
  },

  clearSession: () => {
    localStorage.removeItem('guestToken')
    localStorage.removeItem('guestExpiresAt')
    set({ sessionToken: null, expiresAt: null })
  },
}))
