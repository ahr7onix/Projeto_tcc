import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api, extractError } from '../../lib/api'
import styles from './LoginPage.module.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const DESTINO_POR_PERFIL: Record<string, string> = {
  nutricionista: '/inicio',
  administrador: '/admin',
}

const ERRO_PERFIL =
  'Esta plataforma é exclusiva para nutricionistas e administradores. Use o aplicativo mobile para acesso como paciente.'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (element: HTMLElement, config: object) => void
          cancel: () => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const isSignUp = location.pathname.startsWith('/cadastro')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [nome, setNome] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regSenha, setRegSenha] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const scriptId = 'google-gsi-script'
    const initGoogle = () => {
      if (!window.google || !GOOGLE_CLIENT_ID) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        ux_mode: 'popup',
      })
      const btn = document.getElementById('google-btn-container')
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          type: 'standard',
          size: 'large',
          width: Math.min(btn.offsetWidth || 320, 320),
          text: 'signin_with',
          shape: 'pill',
          theme: 'filled_black',
          logo_alignment: 'left',
          locale: 'pt-BR',
        })
      }
    }
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogle
      document.head.appendChild(script)
    } else {
      initGoogle()
    }
    return () => { window.google?.accounts.id.cancel() }
  }, [])

  async function handleGoogleCallback(response: { credential: string }) {
    setLoginError(null)
    setGoogleLoading(true)
    try {
      const { data } = await api.post('/auth/google/nutricionista', {
        credential: response.credential,
      })
      const destino = DESTINO_POR_PERFIL[data.user.role]
      if (!destino) {
        setLoginError(ERRO_PERFIL)
        setGoogleLoading(false)
        return
      }
      login(data.user, data.accessToken, data.refreshToken)
      navigate(destino)
    } catch (err) {
      setLoginError(extractError(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email: loginEmail, senha: loginSenha })
      const destino = DESTINO_POR_PERFIL[data.user.role]
      if (!destino) {
        setLoginError(ERRO_PERFIL)
        setLoginLoading(false)
        return
      }
      login(data.user, data.accessToken, data.refreshToken)
      navigate(destino)
    } catch (err) {
      setLoginError(extractError(err))
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError(null)
    if (regSenha.length < 8) {
      setRegError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setRegLoading(true)
    try {
      const { data } = await api.post('/auth/cadastro/nutricionista', {
        nome,
        email: regEmail,
        senha: regSenha,
      })
      const destino = DESTINO_POR_PERFIL[data.user.role]
      if (!destino) {
        setRegError(ERRO_PERFIL)
        setRegLoading(false)
        return
      }
      login(data.user, data.accessToken, data.refreshToken ?? '')
      navigate(destino)
    } catch (err) {
      setRegError(extractError(err))
    } finally {
      setRegLoading(false)
    }
  }

  const goSignUp = () => navigate('/cadastro')
  const goSignIn = () => navigate('/login')

  return (
    <div className={styles.page}>
      <div
        className={`${styles.container} ${isSignUp ? styles.rightPanelActive : ''}`}
        id="main-container"
      >
        {/* Cadastro */}
        <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
          <form className={styles.form} onSubmit={handleRegister} noValidate>
            <div className={styles.brand}>NutriCare</div>
            <h1 className={styles.title}>Criar conta</h1>
            {regError && <div className={styles.error}>{regError}</div>}
            <input
              className={styles.input}
              type="text"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
            />
            <input
              className={styles.input}
              type="email"
              placeholder="E-mail profissional"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Senha (mín. 8 caracteres)"
              value={regSenha}
              onChange={(e) => setRegSenha(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
            <button type="submit" className={styles.btn} disabled={regLoading}>
              {regLoading ? 'Criando...' : 'Cadastrar'}
            </button>
            <button type="button" className={styles.mobileToggle} onClick={goSignIn}>
              Já tem conta? Entrar
            </button>
          </form>
        </div>

        {/* Login */}
        <div className={`${styles.formContainer} ${styles.signInContainer}`}>
          <form className={styles.form} onSubmit={handleLogin} noValidate>
            <div className={styles.brand}>NutriCare</div>
            <h1 className={styles.title}>Bem-vindo de volta</h1>
            {loginError && <div className={styles.error}>{loginError}</div>}

            {GOOGLE_CLIENT_ID ? (
              <div className={styles.googleWrap}>
                <div
                  id="google-btn-container"
                  className={`${styles.googleBtn} ${googleLoading ? styles.googleBusy : ''}`}
                />
              </div>
            ) : (
              <button
                type="button"
                className={styles.googleFallback}
                onClick={() =>
                  setLoginError('Configure VITE_GOOGLE_CLIENT_ID no .env para ativar o login com Google.')
                }
              >
                <GoogleIcon /> Continuar com Google
              </button>
            )}

            <div className={styles.divider}>
              <div className={styles.dividerLine} />
              <span>ou e-mail</span>
              <div className={styles.dividerLine} />
            </div>

            <input
              className={styles.input}
              type="email"
              placeholder="Endereço de e-mail"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Senha"
              value={loginSenha}
              onChange={(e) => setLoginSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Link to="/esqueci-senha" className={styles.forgot}>
              Esqueceu a senha?
            </Link>
            <button type="submit" className={styles.btn} disabled={loginLoading || googleLoading}>
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" className={styles.mobileToggle} onClick={goSignUp}>
              Novo por aqui? Criar conta
            </button>
          </form>
        </div>

        {/* Overlay deslizante */}
        <div className={styles.overlayContainer}>
          <div className={styles.overlay}>
            <div className={`${styles.overlayPanel} ${styles.overlayLeft}`}>
              <h1>Bem-vindo de volta!</h1>
              <p>
                Entre com seus dados para acompanhar pacientes, alertas e planos alimentares no NutriCare.
              </p>
              <button type="button" className={styles.btnGhost} onClick={goSignIn}>
                Entrar
              </button>
            </div>
            <div className={`${styles.overlayPanel} ${styles.overlayRight}`}>
              <h1>Novo por aqui?</h1>
              <p>
                Cadastre-se como nutricionista e comece a usar o painel profissional do NutriCare.
                Pacientes devem usar o aplicativo mobile.
              </p>
              <button type="button" className={styles.btnGhost} onClick={goSignUp}>
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
