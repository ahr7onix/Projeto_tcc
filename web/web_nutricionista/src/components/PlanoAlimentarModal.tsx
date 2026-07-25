import { useState } from 'react'
import { Btn, Input, Textarea, Select, AlertBanner } from './ui'
import { extractError } from '../lib/api'
import {
  atualizarPlano,
  criarPlano,
  type PlanoAlimentar,
  type RefeicaoPlano,
} from '../lib/planos'

interface PacienteOption {
  id: string
  nome: string
}

interface Props {
  pacientes: PacienteOption[]

  plano?: PlanoAlimentar | null
  onClose: () => void
  onSaved: (plano: PlanoAlimentar) => void
}

const REFEICAO_PADRAO: RefeicaoPlano[] = [
  { nome: 'Café da manhã', horario: '07:30', itens: '' },
  { nome: 'Almoço', horario: '12:00', itens: '' },
  { nome: 'Lanche', horario: '16:00', itens: '' },
  { nome: 'Jantar', horario: '19:30', itens: '' },
]

const hoje = () => new Date().toISOString().slice(0, 10)

export default function PlanoAlimentarModal({
  pacientes,
  plano,
  onClose,
  onSaved,
}: Props) {
  const editando = Boolean(plano)

  const [pacienteId, setPacienteId] = useState(plano?.pacienteId ?? '')
  const [dataInicio, setDataInicio] = useState(plano?.dataInicio ?? hoje())
  const [dataFim, setDataFim] = useState(plano?.dataFim ?? '')
  const [refeicoes, setRefeicoes] = useState<RefeicaoPlano[]>(
    plano?.refeicoes?.length ? plano.refeicoes : REFEICAO_PADRAO,
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function alterarRefeicao(index: number, campo: keyof RefeicaoPlano, valor: string) {
    setRefeicoes((atual) =>
      atual.map((r, i) => (i === index ? { ...r, [campo]: valor } : r)),
    )
  }

  function adicionarRefeicao() {
    setRefeicoes((atual) => [...atual, { nome: '', horario: '08:00', itens: '' }])
  }

  function removerRefeicao(index: number) {
    setRefeicoes((atual) => atual.filter((_, i) => i !== index))
  }

  function validar(): string | null {
    if (!editando && !pacienteId) return 'Selecione o paciente.'
    if (!dataInicio) return 'Informe a data de início.'
    if (dataFim && dataFim < dataInicio)
      return 'A data final não pode ser anterior à data de início.'
    if (!refeicoes.length) return 'Adicione ao menos uma refeição.'
    const incompleta = refeicoes.find((r) => !r.nome.trim() || !r.itens.trim())
    if (incompleta) return 'Preencha o nome e os itens de todas as refeições.'
    return null
  }

  async function handleSalvar() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setErro(null)
    setSalvando(true)
    try {
      const salvo = plano
        ? await atualizarPlano(plano.id, { dataInicio, dataFim, refeicoes })
        : await criarPlano({ pacienteId, dataInicio, dataFim, refeicoes })
      onSaved(salvo)
      onClose()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {}
        <div style={header}>
          <div>
            <div style={eyebrow}>{editando ? 'Editar' : 'Novo'} plano</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
              Plano alimentar
            </h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        {}
        <div style={body}>
          {erro && <AlertBanner message={erro} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {!editando && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Select
                  label="Paciente"
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  options={[
                    { value: '', label: 'Selecione um paciente' },
                    ...pacientes.map((p) => ({ value: p.id, label: p.nome })),
                  ]}
                />
              </div>
            )}

            <Input
              label="Início"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <Input
              label="Término (opcional)"
              type="date"
              min={dataInicio}
              value={dataFim ?? ''}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          {}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-soft)' }}>
              Refeições ({refeicoes.length})
            </div>
            <Btn variant="ghost" size="sm" onClick={adicionarRefeicao} type="button">
              + Adicionar
            </Btn>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {refeicoes.map((r, i) => (
              <div key={i} style={refeicaoCard}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'end' }}>
                  <Input
                    label="Refeição"
                    placeholder="Ex: Café da manhã"
                    value={r.nome}
                    onChange={(e) => alterarRefeicao(i, 'nome', e.target.value)}
                  />
                  <Input
                    label="Horário"
                    type="time"
                    value={r.horario}
                    onChange={(e) => alterarRefeicao(i, 'horario', e.target.value)}
                  />
                  <Btn
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => removerRefeicao(i)}
                    disabled={refeicoes.length === 1}
                    style={{ marginBottom: 2 }}
                  >
                    Remover
                  </Btn>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Textarea
                    label="Itens"
                    placeholder="Ex: 1 fatia de pão integral, 1 ovo cozido, 200ml de leite desnatado"
                    value={r.itens}
                    onChange={(e) => alterarRefeicao(i, 'itens', e.target.value)}
                    style={{ minHeight: 64 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        <div style={footer}>
          <Btn variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Btn>
          <Btn onClick={handleSalvar} loading={salvando} type="button">
            {editando ? 'Salvar alterações' : 'Criar plano'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  width: '100%', maxWidth: 680, maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
}
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid var(--border)',
}
const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--primary)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4,
}
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 26, lineHeight: 1, color: 'var(--text-muted)',
}
const body: React.CSSProperties = {
  padding: '20px 24px', overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 14,
}
const refeicaoCard: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  padding: 14, background: 'var(--bg)',
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
