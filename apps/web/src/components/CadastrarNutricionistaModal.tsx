import { useState } from 'react'
import { AlertBanner, Btn, Input } from './ui'
import { extractError } from '../lib/api'
import { cadastrarNutricionista, type CadastroNutricionistaResultado } from '../lib/admin'

interface Props {
  onClose: () => void
  onCadastrado: () => void
}

/**
 * Cadastro de nutricionista pela administração. A conta já nasce aprovada e
 * sem senha: o link para criar a senha vai só para o e-mail do nutricionista.
 */
export default function CadastrarNutricionistaModal({ onClose, onCadastrado }: Props) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [crn, setCrn] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<CadastroNutricionistaResultado | null>(null)

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (nome.trim().length < 2) {
      setErro('Informe o nome do nutricionista.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErro('Informe um e-mail válido: é por ele que chega o link para criar a senha.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      const r = await cadastrarNutricionista({
        nome: nome.trim(),
        email: email.trim(),
        crn: crn.trim() || undefined,
        especialidade: especialidade.trim() || undefined,
      })
      setResultado(r)
      onCadastrado()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>
            <div style={eyebrow}>Administração</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              Cadastrar nutricionista
            </h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        {resultado ? (
          <div style={body}>
            {resultado.emailEnviado ? (
              <AlertBanner
                type="success"
                message={`Cadastro de ${resultado.nutricionista.nome} criado e já aprovado. O link para criar a senha foi enviado para ${resultado.nutricionista.email}.`}
              />
            ) : (
              <div style={alerta}>
                Cadastro de {resultado.nutricionista.nome} criado e já aprovado, mas este
                servidor não tem envio de e-mail configurado: o link para criar a senha não
                chegou. Depois que o e-mail estiver configurado (docs/PUBLICAR.md), basta usar
                “Esqueceu a senha?” no login do painel com {resultado.nutricionista.email}.
              </div>
            )}
            {resultado.linkDefinirSenha && (
              <div style={nota}>
                Link de teste, só aparece fora de produção:{' '}
                <a
                  href={resultado.linkDefinirSenha}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', wordBreak: 'break-all' }}
                >
                  {resultado.linkDefinirSenha}
                </a>
              </div>
            )}
          </div>
        ) : (
          <form id="cadastro-nutricionista" onSubmit={handleSalvar} style={body}>
            {erro && <AlertBanner message={erro} />}
            <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input
              label="E-mail"
              type="email"
              placeholder="O link para criar a senha chega aqui"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div style={grade}>
              <Input
                label="CRN"
                placeholder="Ex.: CRN-3/12345"
                maxLength={20}
                value={crn}
                onChange={(e) => setCrn(e.target.value)}
              />
              <Input
                label="Especialidade — opcional"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
              />
            </div>
          </form>
        )}

        <div style={footer}>
          {resultado ? (
            <Btn onClick={onClose}>Concluir</Btn>
          ) : (
            <>
              <Btn variant="secondary" onClick={onClose} type="button">
                Cancelar
              </Btn>
              <Btn type="submit" form="cadastro-nutricionista" loading={salvando}>
                Cadastrar
              </Btn>
            </>
          )}
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
  width: '100%', maxWidth: 560, maxHeight: '90vh',
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
const grade: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12,
}
const alerta: React.CSSProperties = {
  fontSize: 13, color: 'var(--warning)', lineHeight: 1.5,
  background: 'var(--warning-soft)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 12px',
}
const nota: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)' }
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
