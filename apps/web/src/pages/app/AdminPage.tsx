import { useCallback, useEffect, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Btn,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Paginacao,
  Select,
  StatTile,
  TabelaRolavel,
  usePaginacao,
} from '../../components/ui'
import CadastrarNutricionistaModal from '../../components/CadastrarNutricionistaModal'
import GraficoBarras, { type BarraDados } from '../../components/GraficoBarras'
import GraficoLinha from '../../components/GraficoLinha'
import { useAuth } from '../../contexts/AuthContext'
import { extractError } from '../../lib/api'
import {
  aprovarNutricionista,
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

const ROTULO_TIPO: Record<string, string> = {
  paciente: 'Paciente',
  nutricionista: 'Nutricionista',
  administrador: 'Administrador',
}

/** O teto da API. Sem pedir, ela devolve 50 e o resto some sem aviso. */
const LIMITE_USUARIOS = 200
const USUARIOS_POR_PAGINA = 15

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

/** O CRN costuma ser digitado já com a sigla ("CRN-3/12345"); não repete. */
function rotuloCrn(crn: string): string {
  return /^crn/i.test(crn.trim()) ? crn.trim() : `CRN ${crn.trim()}`
}

export default function AdminPage() {
  const { user } = useAuth()
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null)
  const [analise, setAnalise] = useState<AnaliseAdmin | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [pendentes, setPendentes] = useState<UsuarioAdmin[]>([])
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [aprovandoId, setAprovandoId] = useState<string | null>(null)
  const [cadastrando, setCadastrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const ehAdmin = user?.role === 'administrador'
  const pagUsuarios = usePaginacao(usuarios, USUARIOS_POR_PAGINA, `${tipo}|${busca}`)

  // `ativo` é opcional: `carregar` também roda como recarga depois de excluir
  // um usuário, fora de efeito, onde não há filtro novo para invalidar.
  const carregar = useCallback(async (ativo: () => boolean = () => true) => {
    try {
      setLoading(true)
      setErro(null)
      const [m, u, an, p] = await Promise.all([
        obterMetricas(),
        listarUsuarios({ tipo: tipo || undefined, busca: busca || undefined, limite: LIMITE_USUARIOS }),
        obterAnalise(90),
        listarUsuarios({ pendentes: true }),
      ])
      if (!ativo()) return
      setMetricas(m)
      setUsuarios(u)
      setAnalise(an)
      setPendentes(p)
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

  async function aprovar(u: UsuarioAdmin) {
    try {
      setAprovandoId(u.id)
      setErro(null)
      await aprovarNutricionista(u.id)
      setPendentes((atual) => atual.filter((x) => x.id !== u.id))
      setUsuarios((atual) => atual.map((x) => (x.id === u.id ? { ...x, aprovado: true } : x)))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setAprovandoId(null)
    }
  }

  async function excluir(u: UsuarioAdmin, recusandoCadastro = false) {
    const pergunta = recusandoCadastro
      ? `Recusar o cadastro de ${u.nome}?\n\nA conta é removida e a pessoa não entra no painel.`
      : `Remover ${u.nome}?\n\n${
          u.tipo === 'paciente'
            ? 'Todos os registros clínicos, planos e mensagens deste paciente serão apagados permanentemente.'
            : 'Os vínculos e conteúdos vinculados a este usuário serão afetados.'
        }\n\nEsta ação não pode ser desfeita.`

    if (!window.confirm(pergunta)) return

    try {
      setRemovendoId(u.id)
      setErro(null)
      await removerUsuario(u.id)
      setUsuarios((atual) => atual.filter((x) => x.id !== u.id))
      setPendentes((atual) => atual.filter((x) => x.id !== u.id))
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
        action={<Btn onClick={() => setCadastrando(true)}>+ Cadastrar nutricionista</Btn>}
      />

      {erro && <AlertBanner message={erro} />}

      {/* Antes dos números: é o único bloco da tela que espera uma ação. O CRN
          não tem consulta pública automatizada, então a conferência é manual. */}
      {pendentes.length > 0 && (
        <Card
          title="Aguardando aprovação"
          subtitle="Confira o CRN no site do conselho regional antes de aprovar. Só depois disso a pessoa entra no painel."
          style={{ marginBottom: 24 }}
        >
          {pendentes.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '12px 0',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{u.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {u.email} · cadastro em {formatarData(u.criadoEm)}
                </div>
              </div>
              <div style={{ fontSize: 13, color: u.crn ? 'var(--text)' : 'var(--warning)', minWidth: 160 }}>
                {u.crn ? rotuloCrn(u.crn) : 'CRN não informado'}
                {u.especialidade && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.especialidade}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn
                  variant="ghost"
                  size="sm"
                  loading={removendoId === u.id}
                  onClick={() => excluir(u, true)}
                >
                  Recusar
                </Btn>
                <Btn size="sm" loading={aprovandoId === u.id} onClick={() => aprovar(u)}>
                  Aprovar
                </Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatTile
          label="Pacientes"
          value={metricas?.pacientes ?? '...'}
          icon={<UsersIcon tamanho={20} />}
          tint="primary"
          sub={metricas ? `${metricas.pacientesAtivos7d} ativos em 7d` : undefined}
        />
        <StatTile
          label="Nutricionistas"
          value={metricas?.nutricionistas ?? '...'}
          icon={<UsersIcon tamanho={20} />}
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
              icon={<UsersIcon tamanho={20} />}
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

      {loading ? (
        <Card>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando...
          </div>
        </Card>
      ) : usuarios.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UsersIcon />}
            title="Nenhum usuário encontrado"
            message="Ajuste os filtros para ver outros resultados."
          />
        </Card>
      ) : (
        <Card flush>
          <TabelaRolavel rotulo="Usuários do sistema">
            <table style={tabelaUsuarios}>
              <thead>
                <tr>
                  <th style={thUsuario}>Usuário</th>
                  <th style={thUsuario}>Perfil</th>
                  <th style={thUsuario}>Situação</th>
                  <th style={thUsuario}>Cadastro</th>
                  <th style={thUsuario} aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {pagUsuarios.visiveis.map((u) => (
                  <tr key={u.id}>
                    <td style={tdUsuario}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                        {u.nome}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={tdUsuario}>
                      <Badge label={ROTULO_TIPO[u.tipo] ?? u.tipo} tint={TINT_TIPO[u.tipo] ?? 'primary'} />
                    </td>
                    <td style={{ ...tdUsuario, fontSize: 12, color: u.aprovado === false ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {u.tipo === 'nutricionista'
                        ? u.aprovado === false
                          ? 'Aguardando aprovação'
                          : u.crn
                            ? rotuloCrn(u.crn)
                            : 'CRN pendente'
                        : u.tipo === 'paciente'
                          ? `${u.vinculos} ${u.vinculos === 1 ? 'vínculo' : 'vínculos'}`
                          : '—'}
                    </td>
                    <td style={{ ...tdUsuario, fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatarData(u.criadoEm)}
                    </td>
                    <td style={{ ...tdUsuario, textAlign: 'right' }}>
                      <Btn
                        variant="danger"
                        size="sm"
                        loading={removendoId === u.id}
                        disabled={u.id === String(user?.id)}
                        onClick={() => excluir(u)}
                      >
                        Remover
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelaRolavel>
          <Paginacao
            pagina={pagUsuarios.pagina}
            totalPaginas={pagUsuarios.totalPaginas}
            total={pagUsuarios.total}
            primeiro={pagUsuarios.primeiro}
            ultimo={pagUsuarios.ultimo}
            onChange={pagUsuarios.irPara}
            rotulo="usuários"
            style={{ margin: 0, padding: '12px 18px' }}
          />
        </Card>
      )}

      {cadastrando && (
        <CadastrarNutricionistaModal
          onClose={() => setCadastrando(false)}
          onCadastrado={() => carregar()}
        />
      )}
    </div>
  )
}

const tabelaUsuarios: React.CSSProperties = {
  width: '100%',
  minWidth: 720,
  borderCollapse: 'collapse',
}
const thUsuario: React.CSSProperties = {
  padding: '10px 18px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
}
const tdUsuario: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--border)',
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

function UsersIcon({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  )
}
