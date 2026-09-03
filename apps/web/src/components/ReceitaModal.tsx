import { useState } from 'react'
import { AlertBanner, Btn, Input, Textarea } from './ui'
import { extractError } from '../lib/api'
import {
  atualizarReceita,
  criarReceita,
  type Receita,
  type ReceitaPayload,
} from '../lib/receitas'

interface Props {
  receita?: Receita | null
  onClose: () => void
  onSaved: (receita: Receita) => void
}

/** Campo numérico vazio some do envio; a API distingue "zero" de "não informado". */
const numero = (texto: string): number | undefined => {
  const limpo = texto.trim().replace(',', '.')
  if (!limpo) return undefined
  const valor = Number(limpo)
  return Number.isNaN(valor) ? undefined : valor
}

const inteiro = (texto: string): number | undefined => {
  const valor = numero(texto)
  return valor === undefined ? undefined : Math.round(valor)
}

const texto = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '' : String(valor)

export default function ReceitaModal({ receita, onClose, onSaved }: Props) {
  const editando = Boolean(receita)

  const [titulo, setTitulo] = useState(receita?.titulo ?? '')
  const [resumo, setResumo] = useState(receita?.resumo ?? '')
  const [categoria, setCategoria] = useState(receita?.categoria ?? '')
  const [ingredientes, setIngredientes] = useState(receita?.ingredientes ?? '')
  const [modoPreparo, setModoPreparo] = useState(receita?.modoPreparo ?? '')
  const [porcoes, setPorcoes] = useState(texto(receita?.porcoes))
  const [tempoPreparoMin, setTempoPreparoMin] = useState(texto(receita?.tempoPreparoMin))
  const [kcalPorcao, setKcalPorcao] = useState(texto(receita?.kcalPorcao))
  const [carboidratosPorcao, setCarboidratosPorcao] = useState(texto(receita?.carboidratosPorcao))
  const [proteinasPorcao, setProteinasPorcao] = useState(texto(receita?.proteinasPorcao))
  const [lipidiosPorcao, setLipidiosPorcao] = useState(texto(receita?.lipidiosPorcao))
  const [publicado, setPublicado] = useState(receita?.publicado ?? false)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validar(): string | null {
    if (titulo.trim().length < 3) return 'Informe o título da receita.'
    if (ingredientes.trim().length < 3) return 'Informe os ingredientes.'
    if (modoPreparo.trim().length < 3) return 'Informe o modo de preparo.'
    return null
  }

  async function handleSalvar() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    const payload: ReceitaPayload = {
      titulo: titulo.trim(),
      resumo: resumo.trim() || undefined,
      ingredientes: ingredientes.trim(),
      modoPreparo: modoPreparo.trim(),
      porcoes: inteiro(porcoes),
      tempoPreparoMin: inteiro(tempoPreparoMin),
      kcalPorcao: numero(kcalPorcao),
      carboidratosPorcao: numero(carboidratosPorcao),
      proteinasPorcao: numero(proteinasPorcao),
      lipidiosPorcao: numero(lipidiosPorcao),
      categoria: categoria.trim() || undefined,
      publicado,
    }

    setErro(null)
    setSalvando(true)
    try {
      const salvo = receita
        ? await atualizarReceita(receita.id, payload)
        : await criarReceita(payload)
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
            <div style={eyebrow}>{editando ? 'Editar' : 'Nova'} receita</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              Receita saudável
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
                label="Título"
                placeholder="Ex: Panqueca de aveia com banana"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
            <Input
              label="Categoria"
              placeholder="Ex: Café da manhã"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
            <Input
              label="Porções que rende"
              type="number"
              min="1"
              step="1"
              value={porcoes}
              onChange={(e) => setPorcoes(e.target.value)}
            />
            <Input
              label="Tempo de preparo (min)"
              type="number"
              min="1"
              step="1"
              value={tempoPreparoMin}
              onChange={(e) => setTempoPreparoMin(e.target.value)}
            />
          </div>

          <Textarea
            label="Resumo — opcional"
            placeholder="Uma frase curta que aparece na lista do aplicativo."
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            style={{ minHeight: 60 }}
          />

          <Textarea
            label="Ingredientes (um por linha)"
            placeholder={'2 ovos\n1 banana madura\n3 colheres de aveia'}
            value={ingredientes}
            onChange={(e) => setIngredientes(e.target.value)}
            style={{ minHeight: 130 }}
          />

          <Textarea
            label="Modo de preparo"
            placeholder="Descreva o passo a passo."
            value={modoPreparo}
            onChange={(e) => setModoPreparo(e.target.value)}
            style={{ minHeight: 130 }}
          />

          <div style={aviso}>
            Os valores abaixo são por porção e são opcionais. Preencha só o que
            você já tiver calculado.
          </div>

          <div style={grade}>
            <Input
              label="Calorias (kcal)"
              type="number"
              min="0"
              step="1"
              value={kcalPorcao}
              onChange={(e) => setKcalPorcao(e.target.value)}
            />
            <Input
              label="Carboidratos (g)"
              type="number"
              min="0"
              step="0.1"
              value={carboidratosPorcao}
              onChange={(e) => setCarboidratosPorcao(e.target.value)}
            />
            <Input
              label="Proteínas (g)"
              type="number"
              min="0"
              step="0.1"
              value={proteinasPorcao}
              onChange={(e) => setProteinasPorcao(e.target.value)}
            />
            <Input
              label="Lipídios (g)"
              type="number"
              min="0"
              step="0.1"
              value={lipidiosPorcao}
              onChange={(e) => setLipidiosPorcao(e.target.value)}
            />
          </div>

          {/* Enquanto não estiver publicada, a receita não aparece para os pacientes. */}
          <label style={checkbox}>
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
            />
            <span>
              Publicar para os pacientes
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                Desmarcado, a receita fica como rascunho e só você enxerga.
              </span>
            </span>
          </label>
        </div>

        <div style={footer}>
          <Btn variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Btn>
          <Btn onClick={handleSalvar} loading={salvando} type="button">
            {editando ? 'Salvar alterações' : 'Cadastrar receita'}
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
const checkbox: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', cursor: 'pointer',
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
