import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  const [googleReady, setGoogleReady] = useState(false)

  const [nome, setNome] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regSenha, setRegSenha] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  const loginGoogleRef = useRef<HTMLDivElement | null>(null)
  const signupGoogleRef = useRef<HTMLDivElement | null>(null)
  const isSignUpRef = useRef(isSignUp)
  isSignUpRef.current = isSignUp

  const setActiveError = useCallback((message: string | null) => {
    if (isSignUpRef.current) {
      setRegError(message)
      setLoginError(null)
    } else {
      setLoginError(message)
      setRegError(null)
    }
  }, [])

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setActiveError(null)
    setGoogleLoading(true)
    try {
      const { data } = await api.post('/auth/google/nutricionista', {
        credential: response.credential,
      })
      const destino = DESTINO_POR_PERFIL[data.user.role]
      if (!destino) {
        setActiveError(ERRO_PERFIL)
        return
      }
      login(data.user, data.accessToken, data.refreshToken)
      navigate(destino)
    } catch (err) {
      setActiveError(extractError(err))
    } finally {
      setGoogleLoading(false)
    }
  }, [login, navigate, setActiveError])

  const handleGoogleCallbackRef = useRef(handleGoogleCallback)
  handleGoogleCallbackRef.current = handleGoogleCallback

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    const scriptId = 'google-gsi-script'
    let cancelled = false

    const initGoogle = () => {
      if (cancelled || !window.google || !GOOGLE_CLIENT_ID) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          void handleGoogleCallbackRef.current(response)
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      setGoogleReady(true)
    }

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!existing) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogle
      document.head.appendChild(script)
    } else if (window.google) {
      initGoogle()
    } else {
      existing.addEventListener('load', initGoogle)
    }

    return () => {
      cancelled = true
      window.google?.accounts.id.cancel()
    }
  }, [])

  // Renderiza o botão oficial só no painel visível, depois da animação.
  // O iframe do Google fica em branco se montar durante o transform.
  useEffect(() => {
    if (!googleReady || !window.google || !GOOGLE_CLIENT_ID) return

    const target = isSignUp ? signupGoogleRef.current : loginGoogleRef.current
    const other = isSignUp ? loginGoogleRef.current : signupGoogleRef.current
    if (other) other.innerHTML = ''
    if (!target) return

    const timer = window.setTimeout(() => {
      target.innerHTML = ''
      const width = Math.max(240, Math.min(Math.floor(target.offsetWidth || 320), 360))
      window.google?.accounts.id.renderButton(target, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        locale: 'pt-BR',
        width,
      })
    }, 650)

    return () => {
      window.clearTimeout(timer)
    }
  }, [googleReady, isSignUp])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email: loginEmail, senha: loginSenha })
      const destino = DESTINO_POR_PERFIL[data.user.role]
      if (!destino) {
        setLoginError(ERRO_PERFIL)
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

  const goSignUp = () => {
    setLoginError(null)
    setRegError(null)
    navigate('/cadastro')
  }
  const goSignIn = () => {
    setLoginError(null)
    setRegError(null)
    navigate('/login')
  }

  const googleSlot = (ref: React.RefObject<HTMLDivElement | null>, visible: boolean) => (
    <div className={styles.googleWrap}>
      {GOOGLE_CLIENT_ID ? (
        <>
          <div
            ref={ref}
            className={`${styles.googleBtn} ${googleLoading ? styles.googleBusy : ''}`}
            aria-hidden={!visible}
          />
          {!googleReady && (
            <button type="button" className={styles.googleFallback} disabled>
              <GoogleIcon /> Carregando Google...
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          className={styles.googleFallback}
          onClick={() =>
            setActiveError('Configure VITE_GOOGLE_CLIENT_ID no .env para ativar o login com Google.')
          }
        >
          <GoogleIcon /> Continuar com Google
        </button>
      )}
    </div>
  )

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

            {googleSlot(signupGoogleRef, isSignUp)}

            <div className={styles.divider}>
              <div className={styles.dividerLine} />
              <span>ou e-mail</span>
              <div className={styles.dividerLine} />
            </div>

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
            <button type="submit" className={styles.btn} disabled={regLoading || googleLoading}>
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

            {googleSlot(loginGoogleRef, !isSignUp)}

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
