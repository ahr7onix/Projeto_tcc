import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api, extractError } from '../../lib/api'
import AuthShell from './AuthShell'
import { Input, Btn, AlertBanner } from '../../components/ui'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function RegisterPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
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
      const btn = document.getElementById('google-register-btn')
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          type: 'standard', size: 'large',
          width: btn.offsetWidth || 360,
          text: 'signup_with', shape: 'rectangular',
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
    e.preventDefault(); setError(null)
    if (senha !== confirmar) { setError('As senhas não coincidem.'); return }
    if (senha.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/cadastro', { nome, email, senha, role: 'nutricionista' })
      login(data.user, data.accessToken, data.refreshToken ?? '')
      navigate('/dashboard')
    } catch (err) { setError(extractError(err)) }
    finally { setLoading(false) }
  }

  return (
    <AuthShell title="Criar conta profissional" subtitle="Cadastre-se como nutricionista para acessar o painel clínico.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <AlertBanner message={error} />}

        {/* Botão Google */}
        {GOOGLE_CLIENT_ID ? (
          <div style={{ position: 'relative' }}>
            <div id="google-register-btn" style={{
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
                <SpinnerIcon /> Cadastrando com Google...
              </div>
            )}
          </div>
        ) : (
          <button type="button"
            onClick={() => setError('Configure VITE_GOOGLE_CLIENT_ID no .env para ativar o cadastro com Google.')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '11px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'white',
              fontSize: 14, fontWeight: 500, color: 'var(--text)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
            <GoogleIcon />
            Cadastrar com Google
          </button>
        )}

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>ou preencha o formulário</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nome completo" type="text" placeholder="Dra. Maria Silva" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <Input label="E-mail profissional" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Senha" type="password" placeholder="Mínimo 8 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <Input label="Confirmar senha" type="password" placeholder="Repita a senha" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />

          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--primary-soft)', fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.5,
          }}>
            ✓ Esta plataforma é exclusiva para nutricionistas. Pacientes devem usar o aplicativo mobile.
          </div>

          <Btn type="submit" size="lg" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            Criar conta
          </Btn>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Entrar</Link>
          </p>
        </form>
      </div>
    </AuthShell>
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
