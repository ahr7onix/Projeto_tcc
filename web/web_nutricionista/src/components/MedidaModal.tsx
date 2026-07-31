import { useState } from 'react'
import { AlertBanner, Btn, Input, Textarea } from './ui'
import { extractError } from '../lib/api'
import {
  criarAntropometria,
  type AntropometriaPayload,
  type RegistroAntropometrico,
} from '../lib/antropometria'

interface Props {
  pacienteId: string
  pacienteNome: string
  /** Repetido do último registro para a nutricionista não redigitar. */
  alturaSugerida?: number | null
  onClose: () => void
  onSaved: (registro: RegistroAntropometrico) => void
}

/** Campo numérico vazio some do envio; a API distingue "zero" de "não informado". */
const numero = (texto: string): number | undefined => {
  const limpo = texto.trim().replace(',', '.')
  if (!limpo) return undefined
  const valor = Number(limpo)
  return Number.isNaN(valor) ? undefined : valor
}

const hoje = (): string => new Date().toISOString().slice(0, 10)

export default function MedidaModal({
  pacienteId,
  pacienteNome,
  alturaSugerida,
  onClose,
  onSaved,
}: Props) {
  const [dataMedicao, setDataMedicao] = useState(hoje())
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState(alturaSugerida ? String(alturaSugerida) : '')
  const [circCintura, setCircCintura] = useState('')
  const [circQuadril, setCircQuadril] = useState('')
  const [circBraco, setCircBraco] = useState('')
  const [circPanturrilha, setCircPanturrilha] = useState('')
  const [circPescoco, setCircPescoco] = useState('')
  const [observacao, setObservacao] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validar(): string | null {
    const campos = [peso, altura, circCintura, circQuadril, circBraco, circPanturrilha, circPescoco]
    if (campos.every((campo) => numero(campo) === undefined)) {
      return 'Preencha pelo menos uma medida.'
    }
    const valorAltura = numero(altura)
    if (valorAltura !== undefined && (valorAltura < 0.51 || valorAltura > 2.59)) {
      return 'A altura deve estar em metros (ex: 1.70).'
    }
    const valorPeso = numero(peso)
    if (valorPeso !== undefined && (valorPeso < 1 || valorPeso > 399)) {
      return 'O peso informado está fora do intervalo aceito.'
    }
    return null
  }

  async function handleSalvar() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    const payload: AntropometriaPayload = {
      pacienteId,
      dataMedicao,
      peso: numero(peso),
      altura: numero(altura),
      circCintura: numero(circCintura),
      circQuadril: numero(circQuadril),
      circBraco: numero(circBraco),
      circPanturrilha: numero(circPanturrilha),
      circPescoco: numero(circPescoco),
      observacao: observacao.trim() || undefined,
    }

    setErro(null)
    setSalvando(true)
    try {
      onSaved(await criarAntropometria(payload))
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
            <div style={eyebrow}>Nova medida</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{pacienteNome}</h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={body}>
          {erro && <AlertBanner message={erro} />}

          <div style={grade}>
            <Input
              label="Data da medição"
              type="date"
              value={dataMedicao}
              max={hoje()}
              onChange={(e) => setDataMedicao(e.target.value)}
            />
            <Input
              label="Peso (kg)"
              type="number"
              min="1"
              step="0.1"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
            <Input
              label="Altura (m)"
              type="number"
              min="0.51"
              max="2.59"
              step="0.01"
              placeholder="Ex: 1.70"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
            />
          </div>

          <div style={aviso}>
            O IMC, a relação cintura/quadril e as classificações de risco são
            calculados pelo sistema a partir das medidas abaixo.
          </div>

          <div style={grade}>
            <Input
              label="Cintura (cm)"
              type="number"
              min="0.1"
              step="0.1"
              value={circCintura}
              onChange={(e) => setCircCintura(e.target.value)}
            />
            <Input
              label="Quadril (cm)"
              type="number"
              min="0.1"
              step="0.1"
              value={circQuadril}
              onChange={(e) => setCircQuadril(e.target.value)}
            />
            <Input
              label="Braço (cm)"
              type="number"
              min="0.1"
              step="0.1"
              value={circBraco}
              onChange={(e) => setCircBraco(e.target.value)}
            />
            <Input
              label="Panturrilha (cm)"
              type="number"
              min="0.1"
              step="0.1"
              value={circPanturrilha}
              onChange={(e) => setCircPanturrilha(e.target.value)}
            />
            <Input
              label="Pescoço (cm)"
              type="number"
              min="0.1"
              step="0.1"
              value={circPescoco}
              onChange={(e) => setCircPescoco(e.target.value)}
            />
          </div>

          <Textarea
            label="Observação — opcional"
            placeholder="Ex: medida feita em jejum, paciente relatou edema."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            style={{ minHeight: 70 }}
          />
        </div>

        <div style={footer}>
          <Btn variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Btn>
          <Btn onClick={handleSalvar} loading={salvando} type="button">
            Registrar medida
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
  width: '100%', maxWidth: 620, maxHeight: '90vh',
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
const grade: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12,
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
