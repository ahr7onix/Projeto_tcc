import { useMemo, useState } from 'react'
import { Badge } from './ui'
import { CLASSIFICACAO_LABEL, MOMENTO_LABEL, type Classificacao } from '../lib/alertas'

export interface RegistroCalendario {
  id: string
  valor: number
  momento: string
  observacao: string | null
  dataHora: string
  classificacao: string
  severidade: 'critico' | 'atencao' | 'normal'
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/**
 * Faixa de referência geral usada no rótulo de tempo na faixa. As faixas por
 * momento do dia continuam valendo na classificação de cada medição — aqui o
 * 70–180 aparece só para nomear o alvo, como fazem os relatórios de glicemia.
 */
const FAIXA_GERAL = { min: 70, max: 180 }

/** Chave local do dia ("2026-09-03"), sem passar por fuso. */
function chaveDoDia(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const hora = (iso: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const rotuloClassificacao = (c: string): string =>
  CLASSIFICACAO_LABEL[c as Classificacao] ?? c

type Estado = 'critico' | 'atencao' | 'normal' | 'vazio'

const COR: Record<Estado, { fundo: string; marca: string; texto: string }> = {
  critico: { fundo: 'var(--danger-soft)', marca: 'var(--danger)', texto: 'var(--danger)' },
  atencao: { fundo: 'var(--warning-soft)', marca: 'var(--warning)', texto: 'var(--warning)' },
  normal: { fundo: 'var(--success-soft)', marca: 'var(--success)', texto: 'var(--success)' },
  vazio: { fundo: 'var(--surface)', marca: 'var(--border-strong)', texto: 'var(--text-muted)' },
}

const ROTULO_ESTADO: Record<Estado, string> = {
  critico: 'Teve medição crítica',
  atencao: 'Teve medição fora do alvo',
  normal: 'Todas dentro do alvo',
  vazio: 'Sem medição',
}

/**
 * Calendário de glicemia, no formato que os relatórios clínicos usam.
 *
 * O padrão internacional de relatório de glicemia (AGP) apresenta os dias em
 * grade de calendário justamente porque a leitura que importa não é "a lista
 * inteira", e sim "que dias fugiram do padrão" — daí o profissional abre só
 * aquele dia. A lista corrida, que existia antes, obrigava a percorrer
 * cinquenta medições para achar as três que interessavam.
 *
 * O tempo na faixa no topo é a métrica de referência desses relatórios, com a
 * meta de 70% dentro do alvo.
 */
export default function CalendarioGlicemia({
  registros,
}: {
  registros: RegistroCalendario[]
}) {
  const porDia = useMemo(() => {
    const mapa = new Map<string, RegistroCalendario[]>()
    for (const r of registros) {
      const chave = chaveDoDia(r.dataHora)
      mapa.set(chave, [...(mapa.get(chave) ?? []), r])
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.dataHora.localeCompare(b.dataHora))
    }
    return mapa
  }, [registros])

  // Abre no mês da medição mais recente, que é o que o profissional quer ver.
  const ultimoDia = useMemo(() => {
    const chaves = [...porDia.keys()].sort()
    return chaves[chaves.length - 1] ?? chaveDoDia(new Date().toISOString())
  }, [porDia])

  const [mesVisivel, setMesVisivel] = useState(() => {
    const [ano, mes] = ultimoDia.split('-').map(Number)
    return { ano, mes: mes - 1 }
  })
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(ultimoDia)

  /** Tempo na faixa: a proporção de leituras abaixo, dentro e acima do alvo. */
  const tempoNaFaixa = useMemo(() => {
    if (!registros.length) return null
    const abaixo = registros.filter((r) => r.classificacao.startsWith('hipo')).length
    const acima = registros.filter((r) => r.classificacao.startsWith('hiper')).length
    const dentro = registros.length - abaixo - acima
    const pct = (n: number) => Math.round((n / registros.length) * 100)
    return {
      abaixo: pct(abaixo),
      dentro: pct(dentro),
      acima: pct(acima),
      totalAbaixo: abaixo,
      totalDentro: dentro,
      totalAcima: acima,
    }
  }, [registros])

  const estadoDoDia = (chave: string): Estado => {
    const doDia = porDia.get(chave)
    if (!doDia?.length) return 'vazio'
    if (doDia.some((r) => r.severidade === 'critico')) return 'critico'
    if (doDia.some((r) => r.severidade === 'atencao')) return 'atencao'
    return 'normal'
  }

  const celulas = useMemo(() => {
    const primeiro = new Date(mesVisivel.ano, mesVisivel.mes, 1)
    const diasNoMes = new Date(mesVisivel.ano, mesVisivel.mes + 1, 0).getDate()
    // Espaços em branco antes do dia 1 para a semana começar no domingo.
    const vazios = Array.from({ length: primeiro.getDay() }, () => null)
    const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
    return [...vazios, ...dias]
  }, [mesVisivel])

  const mudarMes = (passo: number) =>
    setMesVisivel(({ ano, mes }) => {
      const d = new Date(ano, mes + passo, 1)
      return { ano: d.getFullYear(), mes: d.getMonth() }
    })

  const chaveDe = (dia: number) =>
    `${mesVisivel.ano}-${String(mesVisivel.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const registrosDoDia = diaSelecionado ? porDia.get(diaSelecionado) ?? [] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {tempoNaFaixa && (
        <div>
          <div style={estiloRotulo}>Tempo na faixa</div>
          {/* Barra empilhada com 2px de respiro entre os trechos, para os
              blocos não se fundirem num só. */}
          <div style={barra}>
            {tempoNaFaixa.abaixo > 0 && (
              <div
                style={{ ...trecho, width: `${tempoNaFaixa.abaixo}%`, background: 'var(--danger)' }}
                title={`Abaixo de ${FAIXA_GERAL.min} mg/dL: ${tempoNaFaixa.totalAbaixo} medições`}
              />
            )}
            {tempoNaFaixa.dentro > 0 && (
              <div
                style={{ ...trecho, width: `${tempoNaFaixa.dentro}%`, background: 'var(--success)' }}
                title={`Dentro do alvo: ${tempoNaFaixa.totalDentro} medições`}
              />
            )}
            {tempoNaFaixa.acima > 0 && (
              <div
                style={{ ...trecho, width: `${tempoNaFaixa.acima}%`, background: 'var(--warning)' }}
                title={`Acima do alvo: ${tempoNaFaixa.totalAcima} medições`}
              />
            )}
          </div>
          <div style={legenda}>
            <ItemLegenda cor="var(--danger)" texto={`${tempoNaFaixa.abaixo}% abaixo`} />
            <ItemLegenda cor="var(--success)" texto={`${tempoNaFaixa.dentro}% dentro do alvo`} />
            <ItemLegenda cor="var(--warning)" texto={`${tempoNaFaixa.acima}% acima`} />
          </div>
          <div style={nota}>
            A referência usada em relatórios de glicemia é passar ao menos 70% do tempo
            dentro do alvo. Cada medição é avaliada pela faixa do seu momento do dia.
          </div>
        </div>
      )}

      <div>
        <div style={cabecalhoMes} className="no-print">
          <button style={botaoMes} onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            ‹
          </button>
          <strong style={{ fontSize: 14 }}>
            {MESES[mesVisivel.mes]} de {mesVisivel.ano}
          </strong>
          <button style={botaoMes} onClick={() => mudarMes(1)} aria-label="Próximo mês">
            ›
          </button>
        </div>

        <div style={grade}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} style={cabecalhoDia}>
              {d}
            </div>
          ))}
          {celulas.map((dia, i) => {
            if (dia === null) return <div key={`vazio-${i}`} />
            const chave = chaveDe(dia)
            const estado = estadoDoDia(chave)
            const total = porDia.get(chave)?.length ?? 0
            const selecionado = diaSelecionado === chave
            const cor = COR[estado]
            return (
              <button
                key={chave}
                onClick={() => setDiaSelecionado(chave)}
                disabled={total === 0}
                title={`${dia} — ${ROTULO_ESTADO[estado]}${total ? `: ${total} medição${total === 1 ? '' : 'ões'}` : ''}`}
                style={{
                  ...celula,
                  background: cor.fundo,
                  borderColor: selecionado ? 'var(--primary)' : 'var(--border)',
                  boxShadow: selecionado ? '0 0 0 2px var(--primary-soft)' : 'none',
                  cursor: total ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{dia}</span>
                {/* O número de medições acompanha a cor: quem não distingue
                    vermelho de âmbar ainda lê o dia pelo texto e pelo detalhe. */}
                <span style={{ fontSize: 10, color: cor.texto, fontWeight: 600 }}>
                  {total > 0 ? `${total}×` : ''}
                </span>
              </button>
            )
          })}
        </div>

        <div style={legenda}>
          <ItemLegenda cor={COR.normal.marca} texto="Todas dentro do alvo" />
          <ItemLegenda cor={COR.atencao.marca} texto="Fora do alvo" />
          <ItemLegenda cor={COR.critico.marca} texto="Crítica" />
          <ItemLegenda cor={COR.vazio.marca} texto="Sem medição" />
        </div>
      </div>

      <div>
        <div style={estiloRotulo}>
          {diaSelecionado
            ? `Medições de ${diaSelecionado.split('-').reverse().join('/')}`
            : 'Escolha um dia'}
        </div>
        {registrosDoDia.length === 0 ? (
          <div style={semRegistro}>
            {diaSelecionado
              ? 'Nenhuma medição neste dia.'
              : 'Clique num dia do calendário para ver as medições.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tabela}>
              <thead>
                <tr>
                  <th style={th}>Horário</th>
                  <th style={th}>Valor</th>
                  <th style={th}>Classificação</th>
                  <th style={th}>Momento</th>
                  <th style={th}>Observação</th>
                </tr>
              </thead>
              <tbody>
                {registrosDoDia.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{hora(r.dataHora)}</td>
                    <td style={td}>
                      <strong>{r.valor} mg/dL</strong>
                    </td>
                    <td style={td}>
                      <Badge
                        label={rotuloClassificacao(r.classificacao)}
                        tint={
                          r.severidade === 'critico'
                            ? 'danger'
                            : r.severidade === 'atencao'
                              ? 'warning'
                              : 'success'
                        }
                      />
                    </td>
                    <td style={td}>{MOMENTO_LABEL[r.momento] ?? r.momento}</td>
                    <td style={tdSuave}>{r.observacao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemLegenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: cor, flexShrink: 0 }} />
      <span>{texto}</span>
    </span>
  )
}

const estiloRotulo: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
}

const barra: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  height: 14,
  borderRadius: 999,
  overflow: 'hidden',
  background: 'var(--surface-alt)',
}

const trecho: React.CSSProperties = { borderRadius: 999 }

const legenda: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
  marginTop: 10,
  fontSize: 12,
  color: 'var(--text-soft)',
}

const nota: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginTop: 8,
  lineHeight: 1.5,
}

const cabecalhoMes: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  marginBottom: 12,
}

const botaoMes: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-soft)',
  fontSize: 16,
  lineHeight: 1,
  cursor: 'pointer',
}

const grade: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 6,
}

const cabecalhoDia: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  paddingBottom: 4,
}

const celula: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  minHeight: 48,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 4,
  font: 'inherit',
}

const semRegistro: React.CSSProperties = {
  padding: 20,
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: 13,
  background: 'var(--surface-alt)',
  borderRadius: 'var(--radius-md)',
}

const tabela: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  minWidth: 620,
  fontSize: 13,
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
  verticalAlign: 'top',
}

const tdSuave: React.CSSProperties = { ...td, color: 'var(--text-muted)' }
