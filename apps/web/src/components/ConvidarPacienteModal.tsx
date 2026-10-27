import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertBanner, Btn, Input } from './ui'
import { extractError } from '../lib/api'
import {
  cancelarConvite,
  convidarPaciente,
  listarConvites,
  type ConviteEnviado,
} from '../lib/vinculos'

interface Props {
  onClose: () => void
  /** Avisa a tela quando a lista de convites pendentes mudou. */
  onConvitesAlterados: (total: number) => void
}

/**
 * O nutricionista convida pelo e-mail que o paciente usou no aplicativo. O
 * paciente só entra na lista depois de aceitar — até lá, o convite fica aqui,
 * aguardando resposta.
 */
export default function ConvidarPacienteModal({ onClose, onConvitesAlterados }: Props) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [convites, setConvites] = useState<ConviteEnviado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  // Cada consulta leva um número, e só a mais recente pode escrever na tela.
  // Sem isso, a lista inicial que chegasse depois de um convite novo
  // sobrescrevia a lista com uma foto anterior a ele, e o convite sumia.
  const ultimaConsulta = useRef(0)

  const recarregar = useCallback(async () => {
    const consulta = ++ultimaConsulta.current
    try {
      const lista = await listarConvites()
      if (consulta !== ultimaConsulta.current) return
      setConvites(lista)
      onConvitesAlterados(lista.length)
    } catch (err) {
      if (consulta === ultimaConsulta.current) setErro(extractError(err))
    } finally {
      if (consulta === ultimaConsulta.current) setCarregando(false)
    }
  }, [onConvitesAlterados])

  useEffect(() => {
    recarregar()
    return () => {
      ultimaConsulta.current++
    }
  }, [recarregar])

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErro('Informe o e-mail que o paciente usou no aplicativo.')
      return
    }
    setErro(null)
    setSucesso(null)
    setEnviando(true)
    try {
      const convite = await convidarPaciente(email.trim())
      await recarregar()
      setSucesso(
        `Convite enviado para ${convite.paciente.nome}. Quando for aceito pelo aplicativo, o nome passa a aparecer na sua lista.`,
      )
      setEmail('')
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setEnviando(false)
    }
  }

  async function handleCancelar(convite: ConviteEnviado) {
    try {
      setCancelandoId(convite.id)
      setErro(null)
      await cancelarConvite(convite.id)
      await recarregar()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setCancelandoId(null)
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>
            <div style={eyebrow}>Convidar</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              Acompanhar um paciente
            </h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={body}>
          {erro && <AlertBanner message={erro} />}
          {sucesso && <AlertBanner type="success" message={sucesso} />}

          <div style={aviso}>
            Dado de saúde é dado sensível: o histórico do paciente só fica visível
            para você depois que o convite for aceito pelo aplicativo.
          </div>

          <form onSubmit={handleConvidar} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                label="E-mail do paciente"
                type="email"
                placeholder="O mesmo usado no aplicativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Btn type="submit" loading={enviando}>
              Enviar convite
            </Btn>
          </form>

          <div>
            <div style={subtitulo}>Aguardando resposta</div>
            {carregando ? (
              <div style={nota}>Carregando...</div>
            ) : convites.length === 0 ? (
              <div style={nota}>Nenhum convite pendente.</div>
            ) : (
              convites.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                    borderBottom: i < convites.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={avatar}>{c.paciente.nome.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {c.paciente.nome}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.paciente.email} · enviado em{' '}
                      {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <Btn
                    variant="ghost"
                    size="sm"
                    loading={cancelandoId === c.id}
                    onClick={() => handleCancelar(c)}
                  >
                    Cancelar
                  </Btn>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={footer}>
          <Btn variant="secondary" onClick={onClose}>
            Fechar
          </Btn>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(16, 24, 40, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  width: '100%', maxWidth: 560, maxHeight: '85vh',
  display: 'flex', flexDirection: 'column',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-raised)',
}
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid var(--border)',
}
const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4,
}
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 26, lineHeight: 1, color: 'var(--text-muted)',
}
const body: React.CSSProperties = {
  padding: '20px 24px', overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 14,
}
const aviso: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 12px',
}
const subtitulo: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 4,
}
const nota: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', padding: '6px 0' }
const avatar: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: 'var(--primary-soft)', color: 'var(--primary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 600, fontSize: 14, flexShrink: 0,
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end',
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
