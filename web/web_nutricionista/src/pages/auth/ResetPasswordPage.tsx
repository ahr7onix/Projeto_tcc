import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, extractError } from '../../lib/api'
import styles from './LoginPage.module.css'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token')?.trim() || '', [params])

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('Link inválido. Solicite uma nova redefinição de senha.')
      return
    }
    if (senha.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha: senha })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1800)
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
              <h1 className={styles.title}>Senha atualizada</h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5 }}>
                Tudo certo. Redirecionando para o login...
              </p>
              <Link to="/login" className={styles.forgot} style={{ marginTop: 24 }}>
                Ir para o login agora
              </Link>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.brand}>NutriCare</div>
              <h1 className={styles.title}>Nova senha</h1>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '-8px 0 12px', lineHeight: 1.45 }}>
                Escolha uma senha forte para sua conta.
              </p>
              {!token && (
                <div className={styles.error}>
                  Link incompleto. Peça um novo e-mail em “Esqueceu a senha?”.
                </div>
              )}
              {error && <div className={styles.error}>{error}</div>}
              <input
                className={styles.input}
                type="password"
                placeholder="Nova senha (mín. 8)"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <input
                className={styles.input}
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button type="submit" className={styles.btn} disabled={loading || !token}>
                {loading ? 'Salvando...' : 'Salvar senha'}
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
