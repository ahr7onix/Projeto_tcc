import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@NutriCare:accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('@NutriCare:refreshToken')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh })
          localStorage.setItem('@NutriCare:accessToken', data.accessToken)
          err.config.headers.Authorization = `Bearer ${data.accessToken}`
          return api(err.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export const extractError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as { response?: { data?: { message?: string | string[] } } }
    if (err.response?.data?.message) {
      const msg = err.response.data.message
      return Array.isArray(msg) ? msg.join(', ') : msg
    }
  }
  return 'Ocorreu um erro inesperado.'
}
