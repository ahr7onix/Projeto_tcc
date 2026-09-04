import { useState, useEffect, useCallback } from 'react'
import { Card, PageHeader, ChipGroup, EmptyState, AlertBanner, Paginacao, usePaginacao } from '../../components/ui'
import { api, extractError } from '../../lib/api'

type Filtro = 'tudo' | 'glicemia' | 'refeicao'

interface Alerta {
  classificacao: string
  severidade: 'critico' | 'atencao' | 'normal'
  mensagem: string
}

interface Registro {
  id: string
  pacienteNome: string
  tipo: 'glicemia' | 'refeicao'
  valor: number | null
  alerta: Alerta | null
  momento: string | null
  descricao: string | null
  tipoRefeicao: string | null
  carboidratos: number | null
  observacao: string | null
  dataHora: string
}

// Os valores são os do ENUM do banco (database/schema.sql), não os apelidos
// curtos que o app manda no POST — a API traduz `pre`/`pos` antes de gravar.
const momentoLabel: Record<string, string> = {
  jejum: 'Jejum',
  pre_prandial: 'Pré-refeição',
  pos_prandial: 'Pós-refeição',
  antes_dormir: 'Antes de dormir',
  madrugada: 'Madrugada',
  aleatorio: 'Aleatório',
}
const tipoRefeicaoLabel: Record<string, string> = {
  cafe_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

const severidadeCor: Record<string, { bg: string; fg: string }> = {
  critico: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  atencao: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  normal: { bg: 'var(--success-soft)', fg: 'var(--success)' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function RegistrosPage() {
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [meta, setMeta] = useState({ glicemiaCount: 0, refeicaoCount: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pag = usePaginacao(registros, 20, filtro)

  // `cancelado` evita a troca rápida de filtro entregar a lista errada: sem a
  // guarda, a resposta mais lenta chegava por último e sobrescrevia a certa —
  // a tela mostrava tudo com "glicemia" selecionado, sem nada indicar o engano.
  //
  // O `setError(null)` no começo também não é enfeite: sem ele, uma oscilação
  // de rede deixava o aviso de erro na tela para sempre, inclusive depois de
  // recarregamentos bem-sucedidos, até alguém apertar F5.
  const fetchRegistros = useCallback(async (ativo: () => boolean) => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { dias: '7' }
      if (filtro !== 'tudo') params.tipo = filtro
      const { data } = await api.get('/registros', { params })
      if (!ativo()) return
      setRegistros(data.data)
      setMeta(data.meta)
    } catch (err) {
      if (ativo()) setError(extractError(err))
    } finally {
      if (ativo()) setLoading(false)
    }
  }, [filtro])

  useEffect(() => {
    let cancelado = false
    fetchRegistros(() => !cancelado)
    return () => {
      cancelado = true
    }
  }, [fetchRegistros])

  return (
    <div>
      <PageHeader
        eyebrow="Histórico"
        title="Registros"
        subtitle="Acompanhe as medições de glicemia e as refeições dos seus pacientes."
      />

      {error && <div style={{ marginBottom: 16 }}><AlertBanner message={error} /></div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Registros glicemia · 7d', value: String(meta.glicemiaCount), bg: 'var(--primary-soft)', fg: 'var(--primary)', icon: <DropIcon /> },
          { label: 'Refeições · 7d', value: String(meta.refeicaoCount), bg: 'var(--success-soft)', fg: 'var(--success)', icon: <ForkIcon /> },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '18px 20px',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card title="Linha do tempo">
        <ChipGroup
          options={[{ value: 'tudo', label: 'Tudo' }, { value: 'glicemia', label: 'Glicemia' }, { value: 'refeicao', label: 'Refeições' }]}
          value={filtro}
          onChange={(v) => setFiltro(v as Filtro)}
        />
        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Carregando...</div>
        ) : registros.length === 0 ? (
          <EmptyState icon={<HourglassIcon />} title="Sem registros ainda" message="Assim que seus pacientes registrarem glicemias ou refeições pelo aplicativo, elas aparecem aqui." />
        ) : (
          <div>
            {pag.visiveis.map((r, i) => {
              const glicemia = r.tipo === 'glicemia'
              // A bolinha segue a gravidade da medição: é o que o nutricionista
              // procura ao bater o olho na lista.
              const tint = glicemia
                ? severidadeCor[r.alerta?.severidade ?? 'normal']
                : { bg: 'var(--success-soft)', fg: 'var(--success)' }

              return (
                <div key={`${r.tipo}-${r.id}`} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0',
                  borderBottom: i < pag.visiveis.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: tint.bg, color: tint.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {glicemia ? <DropIcon /> : <ForkIcon />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                        {glicemia
                          ? `${r.valor} mg/dL — ${momentoLabel[r.momento ?? ''] ?? r.momento}`
                          : tipoRefeicaoLabel[r.tipoRefeicao ?? ''] ?? r.tipoRefeicao}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.pacienteNome}</span>
                    </div>
                    {glicemia && r.alerta && r.alerta.severidade !== 'normal' && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: tint.fg, marginTop: 2 }}>{r.alerta.mensagem}</div>
                    )}
                    {r.descricao && <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 2 }}>{r.descricao}</div>}
                    {r.carboidratos != null && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.carboidratos} g de carboidrato</div>}
                    {r.observacao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.observacao}</div>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{formatDate(r.dataHora)}</span>
                </div>
              )
            })}
            <Paginacao
              pagina={pag.pagina}
              totalPaginas={pag.totalPaginas}
              total={pag.total}
              primeiro={pag.primeiro}
              ultimo={pag.ultimo}
              onChange={pag.irPara}
              rotulo="registros"
            />
          </div>
        )}
      </Card>
    </div>
  )
}

function DropIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> }
function ForkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
function HourglassIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg> }
