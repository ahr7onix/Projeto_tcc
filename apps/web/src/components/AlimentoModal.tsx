import { useState } from 'react'
import { AlertBanner, Btn, Input } from './ui'
import { extractError } from '../lib/api'
import {
  atualizarAlimento,
  criarAlimento,
  type Alimento,
  type AlimentoPayload,
} from '../lib/alimentos'

interface Props {
  alimento?: Alimento | null
  onClose: () => void
  onSaved: (alimento: Alimento) => void
}

/** Campo numérico vazio some do envio; a API distingue "zero" de "não informado". */
const numero = (texto: string): number | undefined => {
  const limpo = texto.trim().replace(',', '.')
  if (!limpo) return undefined
  const valor = Number(limpo)
  return Number.isNaN(valor) ? undefined : valor
}

const texto = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '' : String(valor)

export default function AlimentoModal({ alimento, onClose, onSaved }: Props) {
  const editando = Boolean(alimento)

  const [nome, setNome] = useState(alimento?.nome ?? '')
  const [grupo, setGrupo] = useState(alimento?.grupo ?? '')
  const [medidaCaseira, setMedidaCaseira] = useState(alimento?.medidaCaseira ?? '')
  const [medidaCaseiraG, setMedidaCaseiraG] = useState(texto(alimento?.medidaCaseiraG))
  const [porcaoG, setPorcaoG] = useState(texto(alimento?.porcaoG) || '100')
  const [kcal, setKcal] = useState(texto(alimento?.kcal))
  const [carboidratosG, setCarboidratosG] = useState(texto(alimento?.carboidratosG))
  const [proteinasG, setProteinasG] = useState(texto(alimento?.proteinasG))
  const [lipidiosG, setLipidiosG] = useState(texto(alimento?.lipidiosG))
  const [fibrasG, setFibrasG] = useState(texto(alimento?.fibrasG))
  const [indiceGlicemico, setIndiceGlicemico] = useState(texto(alimento?.indiceGlicemico))
  const [fonte, setFonte] = useState(alimento?.fonte ?? '')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validar(): string | null {
    if (nome.trim().length < 2) return 'Informe o nome do alimento.'
    const obrigatorios: [string, string][] = [
      ['calorias', kcal],
      ['carboidratos', carboidratosG],
      ['proteínas', proteinasG],
      ['lipídios', lipidiosG],
    ]
    const faltando = obrigatorios.filter(([, valor]) => numero(valor) === undefined)
    if (faltando.length) {
      return `Informe ${faltando.map(([rotulo]) => rotulo).join(', ')} da porção.`
    }
    if (medidaCaseira.trim() && numero(medidaCaseiraG) === undefined) {
      return 'Informe quantos gramas tem a medida caseira.'
    }
    const ig = numero(indiceGlicemico)
    if (ig !== undefined && (ig < 0 || ig > 150)) {
      return 'O índice glicêmico deve estar entre 0 e 150.'
    }
    return null
  }

  async function handleSalvar() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    const payload: AlimentoPayload = {
      nome: nome.trim(),
      grupo: grupo.trim() || undefined,
      medidaCaseira: medidaCaseira.trim() || undefined,
      medidaCaseiraG: medidaCaseira.trim() ? numero(medidaCaseiraG) : undefined,
      porcaoG: numero(porcaoG),
      kcal: numero(kcal) as number,
      carboidratosG: numero(carboidratosG) as number,
      proteinasG: numero(proteinasG) as number,
      lipidiosG: numero(lipidiosG) as number,
      fibrasG: numero(fibrasG),
      indiceGlicemico: numero(indiceGlicemico),
      fonte: fonte.trim() || undefined,
    }

    setErro(null)
    setSalvando(true)
    try {
      const salvo = alimento
        ? await atualizarAlimento(alimento.id, payload)
        : await criarAlimento(payload)
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
            <div style={eyebrow}>{editando ? 'Editar' : 'Novo'} alimento</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              Tabela de alimentos
            </h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={body}>
          {erro && <AlertBanner message={erro} />}

          <div style={grade}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Nome"
                placeholder="Ex: Arroz integral cozido"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <Input
              label="Grupo"
              placeholder="Ex: Cereais"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
            />
            <Input
              label="Porção de referência (g)"
              type="number"
              min="0.01"
              step="1"
              value={porcaoG}
              onChange={(e) => setPorcaoG(e.target.value)}
            />
          </div>

          <div style={aviso}>
            Os valores abaixo são os da porção de referência informada acima
            (normalmente 100 g).
          </div>

          <div style={grade}>
            <Input
              label="Calorias (kcal)"
              type="number"
              min="0"
              step="0.1"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
            <Input
              label="Carboidratos (g)"
              type="number"
              min="0"
              step="0.1"
              value={carboidratosG}
              onChange={(e) => setCarboidratosG(e.target.value)}
            />
            <Input
              label="Proteínas (g)"
              type="number"
              min="0"
              step="0.1"
              value={proteinasG}
              onChange={(e) => setProteinasG(e.target.value)}
            />
            <Input
              label="Lipídios (g)"
              type="number"
              min="0"
              step="0.1"
              value={lipidiosG}
              onChange={(e) => setLipidiosG(e.target.value)}
            />
            <Input
              label="Fibras (g) — opcional"
              type="number"
              min="0"
              step="0.1"
              value={fibrasG}
              onChange={(e) => setFibrasG(e.target.value)}
            />
            <Input
              label="Índice glicêmico — opcional"
              type="number"
              min="0"
              max="150"
              step="1"
              value={indiceGlicemico}
              onChange={(e) => setIndiceGlicemico(e.target.value)}
            />
          </div>

          <div style={grade}>
            <Input
              label="Medida caseira — opcional"
              placeholder="Ex: 1 colher de sopa"
              value={medidaCaseira}
              onChange={(e) => setMedidaCaseira(e.target.value)}
            />
            <Input
              label="Peso da medida caseira (g)"
              type="number"
              min="0.01"
              step="0.1"
              value={medidaCaseiraG}
              onChange={(e) => setMedidaCaseiraG(e.target.value)}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Fonte dos dados — opcional"
                placeholder="Ex: TACO 4ª edição"
                value={fonte}
                onChange={(e) => setFonte(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={footer}>
          <Btn variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Btn>
          <Btn onClick={handleSalvar} loading={salvando} type="button">
            {editando ? 'Salvar alterações' : 'Cadastrar alimento'}
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
  width: '100%', maxWidth: 680, maxHeight: '90vh',
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
const aviso: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 12px',
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
