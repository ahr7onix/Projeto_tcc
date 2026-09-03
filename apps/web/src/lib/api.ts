import axios from 'axios'
import { log, registrarErroDeApi } from './logger'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/** As unicas chaves da sessao. Ficam aqui para os dois caminhos de saida
 *  (logout no menu e sessao expirada no interceptor) limparem a mesma coisa. */
export const CHAVES_SESSAO = [
  '@NutriCare:user',
  '@NutriCare:accessToken',
  '@NutriCare:refreshToken',
] as const

/**
 * Limpa a sessao guardada no navegador.
 *
 * Antes o interceptor chamava `localStorage.clear()`, que apagava tudo o que
 * estivesse ali — inclusive a lista de notificacoes ja lidas, que voltava a
 * aparecer como nova toda vez que a sessao expirava.
 */
export function limparSessao() {
  for (const chave of CHAVES_SESSAO) localStorage.removeItem(chave)
}

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

    // Toda chamada que falha vira uma linha no console, com o requestId da API.
    registrarErroDeApi(err, rotaDeAutenticacao ? 'autenticação' : undefined)

    if (err.response?.status !== 401 || !original || original._renovacaoTentada || rotaDeAutenticacao) {
      return Promise.reject(err)
    }

    original._renovacaoTentada = true
    const novoToken = await renovarUmaVezSo()

    if (!novoToken) {
      log.warn('sessão perdida: renovação recusada, voltando ao login')
      limparSessao()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    original.headers.Authorization = `Bearer ${novoToken}`
    return api(original)
  }
)

export const extractError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const err = error as {
      code?: string
      message?: string
      response?: { status?: number; data?: { message?: string | string[] } }
    }

    if (err.response?.data?.message) {
      const msg = err.response.data.message
      return Array.isArray(msg) ? msg.join(', ') : msg
    }

    // Sem resposta HTTP = API fora do ar, CORS ou URL errada.
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
      return 'Não foi possível conectar à API. Confira se o backend está rodando em http://localhost:3000.'
    }
  }
  return 'Ocorreu um erro inesperado.'
}
