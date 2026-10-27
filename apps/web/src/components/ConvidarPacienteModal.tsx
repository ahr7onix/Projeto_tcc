import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertBanner, Btn, ChipGroup, Input, Select } from './ui'
import { extractError } from '../lib/api'
import {
  cadastrarPaciente,
  type CadastroPacientePayload,
  type CadastroPacienteResultado,
} from '../lib/pacientes'
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

type Modo = 'convite' | 'cadastro'

/**
 * Duas portas para o mesmo resultado — um convite que o paciente aceita pelo
 * aplicativo: convidar quem já tem conta, ou cadastrar quem chegou ao
 * consultório sem conta. Em nenhuma das duas o paciente entra na lista antes
 * de aceitar.
 */
export default function ConvidarPacienteModal({ onClose, onConvitesAlterados }: Props) {
  const [modo, setModo] = useState<Modo>('convite')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cadastro, setCadastro] = useState<CadastroPacienteResultado | null>(null)
  const [convites, setConvites] = useState<ConviteEnviado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [sexo, setSexo] = useState('')
  const [tipoDiabetes, setTipoDiabetes] = useState('')

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

  function trocarModo(novo: Modo) {
    setModo(novo)
    setErro(null)
    setSucesso(null)
    setInfo(null)
    setCadastro(null)
  }

  const emailValido = () => /^\S+@\S+\.\S+$/.test(email.trim())

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault()
    if (!emailValido()) {
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
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        // Ninguém com este e-mail: em vez de parar no erro, abre o cadastro
        // já com o e-mail preenchido.
        trocarModo('cadastro')
        setInfo('Nenhuma conta de paciente usa este e-mail. Preencha os dados abaixo para cadastrar.')
      } else {
        setErro(extractError(err))
      }
    } finally {
      setEnviando(false)
    }
  }

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()
    if (nome.trim().length < 2) {
      setErro('Informe o nome do paciente.')
      return
    }
    if (!emailValido()) {
      setErro('Informe um e-mail válido: é por ele que chega o link para criar a senha.')
      return
    }
    setErro(null)
    setSucesso(null)
    setInfo(null)
    setEnviando(true)
    try {
      const payload: CadastroPacientePayload = {
        nome: nome.trim(),
        email: email.trim(),
        dataNascimento: dataNascimento || undefined,
        sexo: (sexo || undefined) as CadastroPacientePayload['sexo'],
        tipoDiabetes: (tipoDiabetes || undefined) as CadastroPacientePayload['tipoDiabetes'],
      }
      const resultado = await cadastrarPaciente(payload)
      setCadastro(resultado)
      await recarregar()
      setNome('')
      setEmail('')
      setDataNascimento('')
      setSexo('')
      setTipoDiabetes('')
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
          <ChipGroup
            value={modo}
            onChange={(v) => trocarModo(v as Modo)}
            options={[
              { value: 'convite', label: 'Já usa o aplicativo' },
              { value: 'cadastro', label: 'Cadastrar novo paciente' },
            ]}
          />

          {erro && <AlertBanner message={erro} />}
          {sucesso && <AlertBanner type="success" message={sucesso} />}
          {info && <div style={aviso}>{info}</div>}
          {cadastro && <ResultadoCadastro resultado={cadastro} />}

          <div style={aviso}>
            Dado de saúde é dado sensível: o histórico do paciente só fica visível
            para você depois que o convite for aceito pelo aplicativo.
          </div>

          {modo === 'convite' ? (
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
          ) : (
            <form onSubmit={handleCadastrar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                label="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <Input
                label="E-mail do paciente"
                type="email"
                placeholder="O link para criar a senha chega aqui"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div style={grade}>
                <Input
                  label="Data de nascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
                <Select
                  label="Sexo"
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  options={[
                    { value: '', label: 'Não informado' },
                    { value: 'feminino', label: 'Feminino' },
                    { value: 'masculino', label: 'Masculino' },
                    { value: 'outro', label: 'Outro' },
                  ]}
                />
                <Select
                  label="Tipo de diabetes"
                  value={tipoDiabetes}
                  onChange={(e) => setTipoDiabetes(e.target.value)}
                  options={[
                    { value: '', label: 'Não informado' },
                    { value: 'tipo1', label: 'Tipo 1' },
                    { value: 'tipo2', label: 'Tipo 2' },
                    { value: 'gestacional', label: 'Gestacional' },
                    { value: 'pre', label: 'Pré-diabetes' },
                    { value: 'outro', label: 'Outro' },
                  ]}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Btn type="submit" loading={enviando}>
                  Cadastrar e convidar
                </Btn>
              </div>
            </form>
          )}

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

/**
 * O painel diz a verdade sobre o e-mail: sem servidor de e-mail configurado,
 * o link não chegou a ninguém, e o paciente precisa saber o que fazer.
 */
function ResultadoCadastro({ resultado }: { resultado: CadastroPacienteResultado }) {
  const { paciente, emailEnviado, linkDefinirSenha } = resultado
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {emailEnviado ? (
        <AlertBanner
          type="success"
          message={`Cadastro de ${paciente.nome} criado. O link para criar a senha foi enviado para ${paciente.email}; ao entrar no aplicativo, o convite de acompanhamento aparece para aceitar.`}
        />
      ) : (
        <div style={alerta}>
          Cadastro de {paciente.nome} criado, mas este servidor não tem envio de e-mail
          configurado: o link para criar a senha não chegou. Depois que o e-mail estiver
          configurado (docs/PUBLICAR.md), o paciente pode usar “Esqueci minha senha” no
          aplicativo com {paciente.email}.
        </div>
      )}
      {linkDefinirSenha && (
        <div style={nota}>
          Link de teste, só aparece fora de produção:{' '}
          <a href={linkDefinirSenha} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>
            {linkDefinirSenha}
          </a>
        </div>
      )}
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
  width: '100%', maxWidth: 600, maxHeight: '90vh',
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
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
}
const aviso: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 12px',
}
const alerta: React.CSSProperties = {
  fontSize: 13, color: 'var(--warning)', lineHeight: 1.5,
  background: 'var(--warning-soft)', border: '1px solid var(--border)',
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
