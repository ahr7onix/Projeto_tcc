import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@NutriCare:accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A API rotaciona o refresh token: cada uso revoga o anterior. Só pode existir
// uma renovação por vez, senão duas telas que tomam 401 juntas gastam o mesmo
// token e a segunda derruba a sessão.
let renovacaoEmAndamento: Promise<string | null> | null = null

async function renovarSessao(): Promise<string | null> {
  const refresh = localStorage.getItem('@NutriCare:refreshToken')
  if (!refresh) return null
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh })
    localStorage.setItem('@NutriCare:accessToken', data.accessToken)
    // Guardar o refresh token novo também: o antigo já foi revogado no banco.
    localStorage.setItem('@NutriCare:refreshToken', data.refreshToken)
    return data.accessToken
  } catch {
    return null
  }
}

function renovarUmaVezSo(): Promise<string | null> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = renovarSessao().finally(() => {
      renovacaoEmAndamento = null
    })
  }
  return renovacaoEmAndamento
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const rotaDeAutenticacao = String(original?.url ?? '').startsWith('/auth/')

    if (err.response?.status !== 401 || !original || original._renovacaoTentada || rotaDeAutenticacao) {
      return Promise.reject(err)
    }

    original._renovacaoTentada = true
    const novoToken = await renovarUmaVezSo()

    if (!novoToken) {
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    original.headers.Authorization = `Bearer ${novoToken}`
    return api(original)
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
