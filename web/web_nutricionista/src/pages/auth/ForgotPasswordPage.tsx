import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, extractError } from '../../lib/api'
import styles from './LoginPage.module.css'

type DevHints = { previewUrl?: string; resetUrl?: string }

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [devHints, setDevHints] = useState<DevHints>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDevHints({})
    try {
      const { data } = await api.post('/auth/esqueci-senha', { email })
      setDevHints({
        previewUrl: data.previewUrl,
        resetUrl: data.resetUrl,
      })
      setSuccess(true)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container} style={{ width: 480, minHeight: 420 }}>
        <div className={styles.formContainer} style={{ width: '100%', position: 'relative' }}>
          {success ? (
            <div className={styles.form}>
              <div className={styles.brand}>NutriCare</div>
              <h1 className={styles.title}>Verifique seu e-mail</h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
                Se existir uma conta para <strong>{email}</strong>, enviamos um link para redefinir a senha.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.45 }}>
                Não chegou? Confira o spam. O link vale por 1 hora.
              </p>

              {(devHints.previewUrl || devHints.resetUrl) && (
                <div className={styles.error} style={{ background: 'rgba(162,82,255,0.18)', borderColor: 'rgba(162,82,255,0.4)', color: '#e9d5ff' }}>
                  <strong>Modo desenvolvimento</strong>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {devHints.previewUrl && (
                      <a href={devHints.previewUrl} target="_blank" rel="noreferrer" className={styles.forgot}>
                        Abrir prévia do e-mail
                      </a>
                    )}
                    {devHints.resetUrl && (
                      <a href={devHints.resetUrl} className={styles.forgot}>
                        Abrir link de redefinição
                      </a>
                    )}
                  </div>
                </div>
              )}

              <button type="button" className={styles.btn} onClick={() => setSuccess(false)}>
                Tentar outro e-mail
              </button>
              <Link to="/login" className={styles.forgot} style={{ marginTop: 24 }}>
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.brand}>NutriCare</div>
              <h1 className={styles.title}>Recuperar senha</h1>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '-8px 0 12px', lineHeight: 1.45 }}>
                Informe seu e-mail e enviaremos um link para redefinir a senha.
              </p>
              {error && <div className={styles.error}>{error}</div>}
              <input
                className={styles.input}
                type="email"
                placeholder="Endereço de e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
              <Link to="/login" className={styles.forgot} style={{ marginTop: 24 }}>
                Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
