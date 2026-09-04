import { useCallback, useEffect, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Btn,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatTile,
} from '../../components/ui'
import GraficoBarras, { type BarraDados } from '../../components/GraficoBarras'
import GraficoLinha from '../../components/GraficoLinha'
import { useAuth } from '../../contexts/AuthContext'
import { extractError } from '../../lib/api'
import {
  listarUsuarios,
  obterAnalise,
  obterMetricas,
  removerUsuario,
  type AnaliseAdmin,
  type CategoriaAnalise,
  type MetricasAdmin,
  type UsuarioAdmin,
} from '../../lib/admin'

const TIPOS = [
  { value: '', label: 'Todos os perfis' },
  { value: 'paciente', label: 'Pacientes' },
  { value: 'nutricionista', label: 'Nutricionistas' },
  { value: 'administrador', label: 'Administradores' },
]

const TINT_TIPO: Record<string, 'primary' | 'success' | 'warning'> = {
  paciente: 'primary',
  nutricionista: 'success',
  administrador: 'warning',
}

/** "2026-09" vira "set/26": o eixo do grafico precisa de algo curto. */
function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`
}

/**
 * As barras de perfil sao magnitude, nao identidade: uma categoria nao "e" azul
 * nem verde, so tem mais ou menos casos. Por isso a serie inteira usa um tom so,
 * e o que diferencia cada linha e o rotulo escrito ao lado.
 */
const paraBarras = (categorias: CategoriaAnalise[]): BarraDados[] =>
  categorias.map((c) => ({ rotulo: c.rotulo, valor: c.total }))

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function AdminPage() {
  const { user } = useAuth()
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null)
  const [analise, setAnalise] = useState<AnaliseAdmin | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const ehAdmin = user?.role === 'administrador'

  // `ativo` é opcional: `carregar` também roda como recarga depois de excluir
  // um usuário, fora de efeito, onde não há filtro novo para invalidar.
  const carregar = useCallback(async (ativo: () => boolean = () => true) => {
    try {
      setLoading(true)
      setErro(null)
      const [m, u, an] = await Promise.all([
        obterMetricas(),
        listarUsuarios({ tipo: tipo || undefined, busca: busca || undefined }),
        obterAnalise(90),
      ])
      if (!ativo()) return
      setMetricas(m)
      setUsuarios(u)
      setAnalise(an)
    } catch (err) {
      if (ativo()) setErro(extractError(err))
    } finally {
      if (ativo()) setLoading(false)
    }
  }, [tipo, busca])

  // O debounce segura a consulta por tecla, mas não desfaz a que já saiu:
  // trocar o tipo no meio de uma busca deixava as duas no ar e a mais lenta
  // vencia, mostrando a lista do filtro anterior.
  useEffect(() => {
    if (!ehAdmin) {
      setLoading(false)
      return
    }
    let cancelado = false
    const timer = setTimeout(() => carregar(() => !cancelado), busca ? 300 : 0)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [carregar, ehAdmin, busca])

  async function excluir(u: UsuarioAdmin) {
    const aviso =
      u.tipo === 'paciente'
        ? 'Todos os registros clínicos, planos e mensagens deste paciente serão apagados permanentemente.'
        : 'Os vínculos e conteúdos vinculados a este usuário serão afetados.'

    if (!window.confirm(`Remover ${u.nome}?\n\n${aviso}\n\nEsta ação não pode ser desfeita.`)) return

    try {
      setRemovendoId(u.id)
      setErro(null)
      await removerUsuario(u.id)
      setUsuarios((atual) => atual.filter((x) => x.id !== u.id))
      obterMetricas().then(setMetricas).catch(() => undefined)
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setRemovendoId(null)
    }
  }

  if (!ehAdmin) {
    return (
      <div>
        <PageHeader eyebrow="Restrito" title="Administração" />
        <Card>
          <EmptyState
            icon={<LockIcon />}
            title="Acesso restrito"
            message="Esta área é exclusiva para administradores do sistema."
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sistema"
        title="Administração"
        subtitle="Gestão de usuários e visão geral da plataforma."
      />

      {erro && <AlertBanner message={erro} />}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatTile
          label="Pacientes"
          value={metricas?.pacientes ?? '...'}
          icon={<UsersIcon />}
          tint="primary"
          sub={metricas ? `${metricas.pacientesAtivos7d} ativos em 7d` : undefined}
        />
        <StatTile
          label="Nutricionistas"
          value={metricas?.nutricionistas ?? '...'}
          icon={<UsersIcon />}
          tint="success"
          sub={
            metricas && metricas.nutricionistasSemCrn > 0
              ? `${metricas.nutricionistasSemCrn} sem CRN`
              : undefined
          }
        />
        <StatTile label="Vínculos ativos" value={metricas?.vinculos ?? '...'} icon={<LinkIcon />} tint="primary" />
        <StatTile
          label="Registros (30d)"
          value={metricas ? metricas.glicemias30d + metricas.refeicoes30d : '...'}
          icon={<ChartIcon />}
          tint="warning"
        />
      </div>

      {analise && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
            <Card
              title="Quem a associação atende"
              subtitle={`${analise.perfil.totalPacientes} paciente${analise.perfil.totalPacientes === 1 ? '' : 's'} cadastrado${analise.perfil.totalPacientes === 1 ? '' : 's'}, por tipo de diabetes`}
            >
              <GraficoBarras
                dados={paraBarras(analise.perfil.porTipoDiabetes)}
                maximo={analise.perfil.totalPacientes}
                vazio="Nenhum paciente cadastrado ainda."
              />
            </Card>

            <Card title="Faixa etária" subtitle="Idade dos pacientes cadastrados">
              <GraficoBarras
                dados={paraBarras(analise.perfil.porFaixaEtaria)}
                maximo={analise.perfil.totalPacientes}
                vazio="Nenhum paciente cadastrado ainda."
              />
            </Card>
          </div>

          <Card
            title="Controle glicêmico do grupo"
            subtitle={`${analise.controle.totalMedicoes} medições nos últimos ${analise.periodoDias} dias`}
            style={{ marginBottom: 20 }}
          >
            {analise.controle.totalMedicoes === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Sem medições registradas no período.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                <div>
                  {/* Um número só, e grande: é a resposta da pergunta que a
                      associação faz primeiro. Gráfico aqui seria enfeite. */}
                  <div style={{ fontSize: 44, fontWeight: 700, color: 'var(--success)', lineHeight: 1 }}>
                    {analise.controle.percentualNaFaixa}
                    <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>%</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 6, marginBottom: 18 }}>
                    das medições ficaram dentro da faixa esperada para o momento do dia
                  </div>

                  <GraficoBarras
                    dados={analise.controle.porClassificacao.map((c) => ({
                      rotulo: c.rotulo,
                      valor: c.total,
                      tint:
                        c.severidade === 'critico'
                          ? 'danger'
                          : c.severidade === 'atencao'
                            ? 'warning'
                            : 'success',
                    }))}
                    maximo={analise.controle.totalMedicoes}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 10 }}>
                    Evolução mês a mês
                  </div>
                  <GraficoLinha
                    pontos={analise.controle.evolucaoMensal
                      .filter((m) => m.percentualNaFaixa !== null)
                      .map((m) => ({ data: `${m.mes}-01`, valor: m.percentualNaFaixa as number }))}
                    unidade="%"
                    cor="var(--success)"
                    altura={200}
                    limites={{ min: 0, max: 100 }}
                    rotuloData={(iso) => rotuloMes(iso.slice(0, 7))}
                    vazio="Ainda não há meses suficientes para comparar."
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Percentual de medições dentro da faixa em cada mês:{' '}
                    {analise.controle.evolucaoMensal
                      .filter((m) => m.percentualNaFaixa !== null)
                      .map((m) => `${rotuloMes(m.mes)} ${m.percentualNaFaixa}%`)
                      .join(' · ') || 'sem dados'}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatTile
              label="Registraram nos últimos 7 dias"
              value={analise.acompanhamento.ativos7d}
              icon={<ChartIcon />}
              tint="success"
              sub={`de ${analise.acompanhamento.totalPacientes} pacientes`}
            />
            <StatTile
              label="Registraram nos últimos 30 dias"
              value={analise.acompanhamento.ativos30d}
              icon={<ChartIcon />}
              tint="primary"
              sub={`de ${analise.acompanhamento.totalPacientes} pacientes`}
            />
            <StatTile
              label="Sem registro há mais de 30 dias"
              value={analise.acompanhamento.semRegistro30d}
              icon={<UsersIcon />}
              tint={analise.acompanhamento.semRegistro30d > 0 ? 'warning' : 'success'}
              sub="pacientes a procurar"
            />
            <StatTile
              label="Sem nutricionista"
              value={analise.acompanhamento.semNutricionista}
              icon={<LinkIcon />}
              tint={analise.acompanhamento.semNutricionista > 0 ? 'warning' : 'success'}
              sub="sem acompanhamento vinculado"
            />
          </div>
        </>
      )}

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <Input
              label="Buscar"
              placeholder="Nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <Select
              label="Perfil"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              options={TIPOS}
            />
          </div>
        </div>
      </Card>

      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando...
          </div>
        ) : usuarios.length === 0 ? (
          <div style={{ padding: '8px 0' }}>
            <EmptyState
              icon={<UsersIcon />}
              title="Nenhum usuário encontrado"
              message="Ajuste os filtros para ver outros resultados."
            />
          </div>
        ) : (
          usuarios.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 130px 110px 100px 120px',
                alignItems: 'center',
                gap: 12,
                padding: '14px 20px',
                borderBottom: i < usuarios.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                  {u.nome}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
              </div>

              <Badge label={u.tipo} tint={TINT_TIPO[u.tipo] ?? 'primary'} />

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {u.tipo === 'nutricionista'
                  ? u.crn
                    ? `CRN ${u.crn}`
                    : 'CRN pendente'
                  : u.tipo === 'paciente'
                    ? `${u.vinculos} vínculo(s)`
                    : '—'}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatarData(u.criadoEm)}
              </div>

              <div style={{ textAlign: 'right' }}>
                <Btn
                  variant="danger"
                  size="sm"
                  loading={removendoId === u.id}
                  disabled={u.id === String(user?.id)}
                  onClick={() => excluir(u)}
                >
                  Remover
                </Btn>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  )
}
