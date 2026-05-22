import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, extractError } from '../../lib/api'
import AuthShell from './AuthShell'
import { Input, Btn, AlertBanner } from '../../components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/esqueci-senha', { email })
      setSuccess(true)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell title="Verifique seu e-mail" subtitle={`Enviamos um link de recuperação para ${email}.`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px 16px', background: 'var(--success-soft)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>
            Link enviado! Confira sua caixa de entrada ou spam.
          </div>
          <Btn variant="secondary" size="lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSuccess(false)}>
            Tentar outro e-mail
          </Btn>
          <Link to="/login" style={{ textAlign: 'center', color: 'var(--primary)', fontSize: 14, fontWeight: 600 }}>
            Voltar para o login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Informe seu e-mail e enviaremos um link para redefinir a senha.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <AlertBanner message={error} />}
        <Input label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Btn type="submit" size="lg" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
          Enviar link
        </Btn>
        <Link to="/login" style={{ textAlign: 'center', color: 'var(--primary)', fontSize: 14, fontWeight: 600 }}>
          Voltar para o login
        </Link>
      </form>
    </AuthShell>
  )
}
