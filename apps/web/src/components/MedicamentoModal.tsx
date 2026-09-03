import { useState } from 'react'
import { AlertBanner, Btn, Input, Textarea } from './ui'
import { extractError } from '../lib/api'
import {
  atualizarMedicamento,
  criarMedicamento,
  type Medicamento,
} from '../lib/medicamentos'

interface Props {
  pacienteId: string
  pacienteNome: string
  medicamento?: Medicamento | null
  onClose: () => void
  onSaved: (medicamento: Medicamento) => void
}

export default function MedicamentoModal({
  pacienteId,
  pacienteNome,
  medicamento,
  onClose,
  onSaved,
}: Props) {
  const editando = Boolean(medicamento)

  const [nome, setNome] = useState(medicamento?.nome ?? '')
  const [dosagem, setDosagem] = useState(medicamento?.dosagem ?? '')
  const [frequencia, setFrequencia] = useState(medicamento?.frequencia ?? '')
  const [horarioInicial, setHorarioInicial] = useState(
    medicamento?.horarioInicial?.slice(0, 5) ?? '08:00',
  )
  const [observacoes, setObservacoes] = useState(medicamento?.observacoes ?? '')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validar(): string | null {
    if (nome.trim().length < 2) return 'Informe o nome do medicamento.'
    if (!dosagem.trim()) return 'Informe a dosagem (ex: 10 UI, 500 mg).'
    if (!frequencia.trim()) return 'Informe a frequência (ex: 1x ao dia).'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horarioInicial)) {
      return 'Informe o horário no formato HH:MM.'
    }
    return null
  }

  async function handleSalvar() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    const dados = {
      nome: nome.trim(),
      dosagem: dosagem.trim(),
      frequencia: frequencia.trim(),
      horarioInicial,
      // `null` quando fica vazio: é assim que a API entende "apagar".
      observacoes: observacoes.trim() || null,
    }

    setErro(null)
    setSalvando(true)
    try {
      const salvo = medicamento
        ? await atualizarMedicamento(medicamento.id, pacienteId, dados)
        : await criarMedicamento({ pacienteId, ...dados })
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
        <div style={header}>
          <div>
            <div style={eyebrow}>{editando ? 'Editar' : 'Novo'} medicamento</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{pacienteNome}</h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={body}>
          {erro && <AlertBanner message={erro} />}

          <Input
            label="Medicamento"
            placeholder="Ex: Insulina NPH"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <div style={grade}>
            <Input
              label="Dosagem"
              placeholder="Ex: 10 UI"
              value={dosagem}
              onChange={(e) => setDosagem(e.target.value)}
            />
            <Input
              label="Frequência"
              placeholder="Ex: 8 em 8 horas"
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)}
            />
            <Input
              label="Primeiro horário do dia"
              type="time"
              value={horarioInicial}
              onChange={(e) => setHorarioInicial(e.target.value)}
            />
          </div>

          <Textarea
            label="Observações (opcional)"
            placeholder="Ex: tomar junto com a refeição; suspender se houver hipoglicemia."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={500}
            style={{ minHeight: 90 }}
          />

          <div style={aviso}>
            O horário informado é o ponto de partida dos lembretes que o paciente
            recebe no aplicativo. As observações aparecem junto do medicamento no
            aplicativo dele.
          </div>
        </div>

        <div style={footer}>
          <Btn variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Btn>
          <Btn onClick={handleSalvar} loading={salvando} type="button">
            {editando ? 'Salvar alterações' : 'Adicionar medicamento'}
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
  width: '100%', maxWidth: 560,
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
  padding: '20px 24px',
  display: 'flex', flexDirection: 'column', gap: 14,
}
const grade: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
}
const aviso: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 12px',
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
