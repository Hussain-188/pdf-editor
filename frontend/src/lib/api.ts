import axios from 'axios'

function resolveBaseURL(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined
  if (!env) return '/api'
  const trimmed = env.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
})

export default api
