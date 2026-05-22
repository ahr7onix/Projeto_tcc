import React, { useState, useEffect, useCallback } from 'react'
import { Card, PageHeader, ChipGroup, EmptyState, Btn, Input, Textarea, Select, AlertBanner } from '../../components/ui'
import { api, extractError } from '../../lib/api'

type Filtro = 'tudo' | 'glicemia' | 'refeicao'
type Momento = 'jejum' | 'pre' | 'pos' | 'aleatorio'

interface Registro {
  id: string
  pacienteNome: string
  tipo: 'glicemia' | 'refeicao'
  valor: number | null
  momento: string | null
  descricao: string | null
  tipo_refeicao: string | null
  observacao: string
  criadoEm: string
}

const momentoOpts = [
  { value: 'jejum', label: 'Jejum' },
  { value: 'pre', label: 'Pré-refeição' },
  { value: 'pos', label: 'Pós-refeição' },
  { value: 'aleatorio', label: 'Aleatório' },
]
const tipoRefeicao = [
  { value: 'cafe', label: 'Café da manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'lanche', label: 'Lanche' },
  { value: 'jantar', label: 'Jantar' },
  { value: 'ceia', label: 'Ceia' },
]

const momentoLabel: Record<string, string> = {
  jejum: 'Jejum', pre: 'Pré-refeição', pos: 'Pós-refeição', aleatorio: 'Aleatório',
}
const tipoRefeicaoLabel: Record<string, string> = {
  cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function RegistrosPage() {
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [tab, setTab] = useState<'lista' | 'novo-glicemia' | 'nova-refeicao'>('lista')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [meta, setMeta] = useState({ glicemiaCount: 0, refeicaoCount: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Glicemia form
  const [gValor, setGValor] = useState('')
  const [gMomento, setGMomento] = useState<Momento>('jejum')
  const [gObs, setGObs] = useState('')
  const [gSaving, setGSaving] = useState(false)

  // Refeicao form
  const [rTipo, setRTipo] = useState('almoco')
  const [rDesc, setRDesc] = useState('')
  const [rCarb, setRCarb] = useState('')
  const [rObs, setRObs] = useState('')
  const [rSaving, setRSaving] = useState(false)

  const fetchRegistros = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { dias: '7' }
      if (filtro !== 'tudo') params.tipo = filtro
      const { data } = await api.get('/registros', { params })
      setRegistros(data.data)
      setMeta(data.meta)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => {
    if (tab === 'lista') fetchRegistros()
  }, [tab, fetchRegistros])

  const handleSaveGlicemia = async () => {
    if (!gValor) return
    setGSaving(true)
    setError(null)
    try {
      await api.post('/registros/glicemia', {
        valor: Number(gValor),
        momento: gMomento,
        observacao: gObs,
      })
      setTab('lista')
      setGValor('')
      setGObs('')
      setGMomento('jejum')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setGSaving(false)
    }
  }

  const handleSaveRefeicao = async () => {
    if (!rDesc) return
    setRSaving(true)
    setError(null)
    try {
      await api.post('/registros/refeicao', {
        descricao: rDesc,
        tipo_refeicao: rTipo,
        carboidratos: rCarb ? Number(rCarb) : undefined,
        observacao: rObs,
      })
      setTab('lista')
      setRDesc('')
      setRCarb('')
      setRObs('')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setRSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Histórico"
        title="Registros"
        subtitle="Acompanhe medições de glicemia e refeições dos pacientes."
        action={
          tab === 'lista' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" size="sm" icon={<DropIcon />} onClick={() => setTab('novo-glicemia')}>Glicemia</Btn>
              <Btn size="sm" icon={<ForkIcon />} onClick={() => setTab('nova-refeicao')}>Refeição</Btn>
            </div>
          ) : (
            <Btn variant="ghost" size="sm" onClick={() => setTab('lista')}>← Voltar</Btn>
          )
        }
      />

      {error && <div style={{ marginBottom: 16 }}><AlertBanner message={error} /></div>}

      {tab === 'lista' && (
        <>
          {/* Summary stats */}
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
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <Card title="Linha do tempo">
            <ChipGroup
              options={[
                { value: 'tudo', label: 'Tudo' },
                { value: 'glicemia', label: 'Glicemia' },
                { value: 'refeicao', label: 'Refeições' },
              ]}
              value={filtro}
              onChange={(v) => setFiltro(v as Filtro)}
            />

            {loading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Carregando...</div>
            ) : registros.length === 0 ? (
              <EmptyState
                icon={<HourglassIcon />}
                title="Sem registros ainda"
                message="Comece registrando uma medição de glicemia ou uma refeição."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {registros.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 0',
                    borderBottom: i < registros.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: r.tipo === 'glicemia' ? 'var(--primary-soft)' : 'var(--success-soft)',
                      color: r.tipo === 'glicemia' ? 'var(--primary)' : 'var(--success)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {r.tipo === 'glicemia' ? <DropIcon /> : <ForkIcon />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                          {r.tipo === 'glicemia'
                            ? `${r.valor} mg/dL — ${momentoLabel[r.momento ?? ''] ?? r.momento}`
                            : tipoRefeicaoLabel[r.tipo_refeicao ?? ''] ?? r.tipo_refeicao}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.pacienteNome}</span>
                      </div>
                      {r.descricao && (
                        <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 2 }}>{r.descricao}</div>
                      )}
                      {r.observacao && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.observacao}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{formatDate(r.criadoEm)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'novo-glicemia' && (
        <div style={{ maxWidth: 560 }}>
          <Card title="Nova medição de glicemia">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Valor (mg/dL)"
                type="number"
                placeholder="Ex.: 110"
                value={gValor}
                onChange={(e) => setGValor(e.target.value)}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 8 }}>Momento</div>
                <ChipGroup options={momentoOpts} value={gMomento} onChange={(v) => setGMomento(v as Momento)} />
              </div>
              <Textarea
                label="Observações"
                placeholder="Sintomas, atividade física, medicação..."
                value={gObs}
                onChange={(e) => setGObs(e.target.value)}
              />
              <Btn size="lg" style={{ width: '100%', justifyContent: 'center' }} loading={gSaving} onClick={handleSaveGlicemia} icon={<CheckIcon />}>
                Salvar registro
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === 'nova-refeicao' && (
        <div style={{ maxWidth: 560 }}>
          <Card title="Nova refeição">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Select label="Tipo de refeição" value={rTipo} onChange={(e) => setRTipo(e.target.value)} options={tipoRefeicao} />
              <Textarea
                label="O que foi consumido?"
                placeholder="Ex.: arroz, feijão, frango grelhado, salada"
                value={rDesc}
                onChange={(e) => setRDesc(e.target.value)}
              />
              <Input
                label="Carboidratos estimados (g) — opcional"
                type="number"
                placeholder="Quantidade estimada"
                value={rCarb}
                onChange={(e) => setRCarb(e.target.value)}
              />
              <Textarea
                label="Observações"
                placeholder="Como o paciente se sentiu, dificuldades..."
                value={rObs}
                onChange={(e) => setRObs(e.target.value)}
              />
              <Btn size="lg" style={{ width: '100%', justifyContent: 'center' }} loading={rSaving} onClick={handleSaveRefeicao} icon={<CheckIcon />}>
                Salvar registro
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function DropIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> }
function ForkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
function CheckIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function HourglassIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg> }
