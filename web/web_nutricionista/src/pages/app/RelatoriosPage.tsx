import { useCallback, useEffect, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Btn,
  Card,
  EmptyState,
  PageHeader,
  Select,
} from '../../components/ui'
import { api, extractError } from '../../lib/api'
import { MOMENTO_LABEL } from '../../lib/alertas'
import { baixarCsv, gerarRelatorio, type Relatorio } from '../../lib/relatorios'

interface PacienteOption {
  id: string
  nome: string
}

const PERIODOS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
]

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function corSeveridade(severidade: string): string {
  if (severidade === 'critico') return 'var(--danger)'
  if (severidade === 'atencao') return 'var(--warning)'
  return 'var(--success)'
}

export default function RelatoriosPage() {
  const [pacientes, setPacientes] = useState<PacienteOption[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [dias, setDias] = useState('30')
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/pacientes')
      .then(({ data }) => {
        const lista: PacienteOption[] = data.data.map((p: PacienteOption) => ({
          id: p.id,
          nome: p.nome,
        }))
        setPacientes(lista)
        if (lista.length) setPacienteId(lista[0].id)
      })
      .catch((err) => setErro(extractError(err)))
  }, [])

  const carregar = useCallback(async () => {
    if (!pacienteId) return
    try {
      setLoading(true)
      setErro(null)
      setRelatorio(await gerarRelatorio(pacienteId, Number(dias)))
    } catch (err) {
      setErro(extractError(err))
      setRelatorio(null)
    } finally {
      setLoading(false)
    }
  }, [pacienteId, dias])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function handleCsv() {
    if (!pacienteId) return
    try {
      setBaixando(true)
      setErro(null)
      await baixarCsv(pacienteId, Number(dias))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setBaixando(false)
    }
  }

  const g = relatorio?.glicemia

  return (
    <div>
      <PageHeader
        eyebrow="Análise clínica"
        title="Relatórios"
        subtitle="Consolide os registros do paciente e exporte para acompanhamento ou prontuário."
        action={
          <div style={{ display: 'flex', gap: 8 }} className="no-print">
            <Btn variant="secondary" onClick={() => window.print()} disabled={!relatorio}>
              Imprimir / PDF
            </Btn>
            <Btn onClick={handleCsv} loading={baixando} disabled={!relatorio}>
              Baixar CSV
            </Btn>
          </div>
        }
      />

      {erro && <AlertBanner message={erro} />}

      <div className="no-print">
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240, flex: 1 }}>
              <Select
                label="Paciente"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                options={
                  pacientes.length
                    ? pacientes.map((p) => ({ value: p.id, label: p.nome }))
                    : [{ value: '', label: 'Nenhum paciente vinculado' }]
                }
              />
            </div>
            <div style={{ minWidth: 200 }}>
              <Select
                label="Período"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                options={PERIODOS}
              />
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <Card>
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            Gerando relatório...
          </div>
        </Card>
      ) : !relatorio ? (
        <Card>
          <EmptyState
            icon={<ChartIcon />}
            title="Nenhum relatório disponível"
            message="Selecione um paciente vinculado para gerar o consolidado do período."
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="Identificação">
            <div style={grid}>
              <Campo label="Paciente" valor={relatorio.paciente.nome} />
              <Campo label="E-mail" valor={relatorio.paciente.email} />
              <Campo label="Tipo de diabetes" valor={relatorio.paciente.tipoDiabetes ?? '—'} />
              <Campo
                label="Peso / Altura"
                valor={
                  relatorio.paciente.peso && relatorio.paciente.altura
                    ? `${relatorio.paciente.peso} kg · ${relatorio.paciente.altura} m`
                    : '—'
                }
              />
              <Campo label="IMC" valor={relatorio.paciente.imc ? String(relatorio.paciente.imc) : '—'} />
              <Campo
                label="Restrições"
                valor={relatorio.paciente.restricoesAlergias ?? 'Nenhuma registrada'}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Período: {relatorio.periodo.dias} dias · gerado em{' '}
              {formatarDataHora(relatorio.periodo.geradoEm)}
            </div>
          </Card>

          <Card title="Controle glicêmico">
            {g && g.total === 0 ? (
              <EmptyState
                icon={<ChartIcon />}
                title="Sem medições no período"
                message="O paciente não registrou glicemia nesse intervalo."
              />
            ) : (
              g && (
                <>
                  <div style={grid}>
                    <Metrica label="Medições" valor={g.total} />
                    <Metrica label="Média" valor={g.media ? `${g.media} mg/dL` : '—'} />
                    <Metrica
                      label="Mín / Máx"
                      valor={g.minimo != null ? `${g.minimo} / ${g.maximo} mg/dL` : '—'}
                    />
                    <Metrica
                      label="Desvio padrão"
                      valor={g.desvioPadrao != null ? `${g.desvioPadrao} mg/dL` : '—'}
                    />
                    <Metrica
                      label="Tempo na faixa"
                      valor={g.percentualNaFaixa != null ? `${g.percentualNaFaixa}%` : '—'}
                      cor={
                        g.percentualNaFaixa != null && g.percentualNaFaixa >= 70
                          ? 'var(--success)'
                          : 'var(--warning)'
                      }
                    />
                    <Metrica
                      label="Eventos críticos"
                      valor={g.criticos}
                      cor={g.criticos > 0 ? 'var(--danger)' : 'var(--text)'}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                    <Badge label={`${g.hipoglicemias} hipoglicemias`} tint="warning" />
                    <Badge label={`${g.hiperglicemias} hiperglicemias`} tint="danger" />
                  </div>

                  {g.porMomento.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={subtitulo}>Média por momento da medição</div>
                      {g.porMomento.map((m, i) => (
                        <div
                          key={m.momento}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 0',
                            borderBottom:
                              i < g.porMomento.length - 1 ? '1px solid var(--border)' : 'none',
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: 'var(--text)' }}>
                            {MOMENTO_LABEL[m.momento] ?? m.momento}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {m.media ?? '—'} mg/dL · {m.total} medições
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            )}
          </Card>

          <Card title="Alimentação">
            <div style={grid}>
              <Metrica label="Refeições registradas" valor={relatorio.alimentacao.total} />
              <Metrica
                label="Carboidratos (média)"
                valor={
                  relatorio.alimentacao.carboidratosMedia != null
                    ? `${relatorio.alimentacao.carboidratosMedia} g`
                    : '—'
                }
              />
            </div>
          </Card>

          {g && g.registros.length > 0 && (
            <Card title="Medições do período">
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {g.registros
                  .slice()
                  .reverse()
                  .map((r, i) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: i < g.registros.length - 1 ? '1px solid var(--border)' : 'none',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ width: 110, color: 'var(--text-muted)', fontSize: 12 }}>
                        {formatarDataHora(r.dataHora)}
                      </span>
                      <span
                        style={{
                          width: 80,
                          fontWeight: 700,
                          color: corSeveridade(r.severidade),
                        }}
                      >
                        {r.valor} mg/dL
                      </span>
                      <span style={{ flex: 1, color: 'var(--text-muted)' }}>
                        {MOMENTO_LABEL[r.momento] ?? r.momento}
                        {r.observacao ? ` · ${r.observacao}` : ''}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={rotulo}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{valor}</div>
    </div>
  )
}

function Metrica({
  label,
  valor,
  cor = 'var(--text)',
}: {
  label: string
  valor: string | number
  cor?: string
}) {
  return (
    <div>
      <div style={rotulo}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>{valor}</div>
    </div>
  )
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
}
const rotulo: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: 3,
}
const subtitulo: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-soft)',
  marginBottom: 4,
}

function ChartIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
