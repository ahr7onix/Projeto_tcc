import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api, extractError } from '../../lib/api'
import AuthShell from './AuthShell'
import { Input, Btn, AlertBanner } from '../../components/ui'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

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
          type: 'standard', size: 'large',
          width: btn.offsetWidth || 360,
          text: 'signin_with', shape: 'rectangular',
          logo_alignment: 'left', locale: 'pt-BR',
        })
      }
    }
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true; script.defer = true
      script.onload = initGoogle
      document.head.appendChild(script)
    } else { initGoogle() }
    return () => { window.google?.accounts.id.cancel() }
  }, [])

  async function handleGoogleCallback(response: { credential: string }) {
    setError(null); setGoogleLoading(true)
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential })
      login(data.user, data.accessToken, data.refreshToken)
      navigate('/dashboard')
    } catch (err) { setError(extractError(err)) }
    finally { setGoogleLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, senha: password })
      if (data.user.role !== 'nutricionista') {
        setError('Esta plataforma é exclusiva para nutricionistas. Use o aplicativo mobile para acesso como paciente.')
        setLoading(false); return
      }
      login(data.user, data.accessToken, data.refreshToken)
      navigate('/dashboard')
    } catch (err) { setError(extractError(err)) }
    finally { setLoading(false) }
  }

  return (
    <AuthShell title="Olá, nutricionista" subtitle="Acesse o painel profissional para acompanhar seus pacientes.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999,
          background: 'var(--primary-soft)', color: 'var(--primary)',
          fontSize: 12, fontWeight: 700, width: 'fit-content', marginBottom: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Acesso profissional
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <AlertBanner message={error} />}

        {/* Botão Google */}
        {GOOGLE_CLIENT_ID ? (
          <div style={{ position: 'relative' }}>
            <div id="google-btn-container" style={{
              width: '100%', minHeight: 44,
              opacity: googleLoading ? 0.6 : 1,
              pointerEvents: googleLoading ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }} />
            {googleLoading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: 'var(--text-muted)', gap: 8,
              }}>
                <SpinnerIcon /> Entrando com Google...
              </div>
            )}
          </div>
        ) : (
          <GoogleFallbackBtn onMissingConfig={() =>
            setError('Configure VITE_GOOGLE_CLIENT_ID no .env para ativar o login com Google.')
          } />
        )}

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>ou entre com e-mail</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="E-mail" type="email" placeholder="seu@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          />
          <div>
            <Input
              label="Senha" type="password" placeholder="Sua senha"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            />
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <Link to="/esqueci-senha" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                Esqueceu a senha?
              </Link>
            </div>
          </div>
          <Btn type="submit" size="lg" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            Acessar painel
          </Btn>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Não tem conta?{' '}
            <Link to="/cadastro" style={{ color: 'var(--primary)', fontWeight: 600 }}>Cadastre-se</Link>
          </p>
        </form>
      </div>
    </AuthShell>
  )
}

function GoogleFallbackBtn({ onMissingConfig }: { onMissingConfig: () => void }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onMissingConfig}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '11px 16px', borderRadius: 8,
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
        background: 'white', fontSize: 14, fontWeight: 500, color: 'var(--text)',
        cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
        boxShadow: hover ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        fontFamily: 'inherit',
      }}>
      <GoogleIcon />
      Continuar com Google
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
