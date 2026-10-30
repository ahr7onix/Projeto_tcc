import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageHeader, EmptyState, AlertBanner, Btn, Paginacao, usePaginacao } from '../../components/ui'
import { api, extractError } from '../../lib/api'
import ConvidarPacienteModal from '../../components/ConvidarPacienteModal'
import {
  cancelarConvite,
  desvincularPaciente,
  listarConvites,
  type ConviteEnviado,
} from '../../lib/vinculos'
import PatientPicker from '../../components/PatientPicker'
import s from './PacientesPage.module.css'

interface Paciente {
  id: string
  nome: string
  email: string
  glicemiaMedia: number | null
  ultimoRegistro: string | null
  status: 'ativo' | 'inativo'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Sem registros'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`
  const meses = Math.floor(days / 30)
  return `${meses} ${meses === 1 ? 'mês' : 'meses'} atrás`
}

function glicemiaColor(val: number | null): string {
  if (!val) return 'var(--text-muted)'
  if (val < 100) return 'var(--success)'
  if (val < 140) return 'var(--warning)'
  return 'var(--danger)'
}

export default function PacientesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const acompanhamento = location.pathname.startsWith('/acompanhamento')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  // A lista encolhe com a busca, mas o resumo é da carteira inteira: durante uma
  // busca por "Jo" a tela dizia "2 cadastrados".
  const [carteira, setCarteira] = useState({ cadastrados: 0, ativos: 0 })
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [convidarAberto, setConvidarAberto] = useState(false)
  // Os convites pendentes ficam visíveis na própria tela, cada um com o seu
  // "Cancelar convite" (ideia trazida do PR #7): antes só havia um contador
  // que abria a janela de convite.
  const [convitesPendentes, setConvitesPendentes] = useState<ConviteEnviado[]>([])
  const [cancelandoConviteId, setCancelandoConviteId] = useState<string | null>(null)
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarConvites()
      .then((lista) => {
        if (!cancelado) setConvitesPendentes(lista)
      })
      .catch(() => undefined)
    return () => {
      cancelado = true
    }
  }, [])

  async function handleCancelarConvite(convite: ConviteEnviado) {
    try {
      setCancelandoConviteId(convite.id)
      await cancelarConvite(convite.id)
      setConvitesPendentes((atual) => atual.filter((c) => c.id !== convite.id))
    } catch (err) {
      setError(extractError(err))
    } finally {
      setCancelandoConviteId(null)
    }
  }

  const fetchPacientes = useCallback(async (q: string, ativo: () => boolean) => {
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (q) params.busca = q
      const { data } = await api.get('/pacientes', { params })
      if (!ativo()) return
      setPacientes(data.data)
      if (!q) {
        const lista: Paciente[] = data.data
        setCarteira({ cadastrados: lista.length, ativos: lista.filter(p => p.status === 'ativo').length })
      }
    } catch (err) {
      if (ativo()) setError(extractError(err))
    } finally {
      if (ativo()) setLoading(false)
    }
  }, [])

  // O debounce sozinho não resolvia a busca: ele cancela o timer pendente, mas
  // não a requisição que já saiu. Digitar rápido deixava duas no ar e a mais
  // lenta chegava por último, devolvendo o resultado de um termo antigo. Daí a
  // guarda `cancelado`, que a limpeza do efeito liga.
  //
  // Este efeito também cobre o primeiro carregamento (busca vazia dispara na
  // hora, sem timer). Antes havia um segundo efeito só para isso, e os dois
  // disparavam juntos na montagem — duas requisições iguais competindo.
  useEffect(() => {
    let cancelado = false
    const ativo = () => !cancelado

    if (!busca) {
      fetchPacientes('', ativo)
      return () => {
        cancelado = true
      }
    }

    const timer = setTimeout(() => fetchPacientes(busca, ativo), 300)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [busca, fetchPacientes])

  const filtrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const pag = usePaginacao(filtrados, POR_PAGINA, busca)
  const raizFicha = acompanhamento ? '/acompanhamento' : '/pacientes'

  async function handleDesvincular(e: React.MouseEvent, p: Paciente) {
    e.stopPropagation()
    if (!window.confirm(`Desvincular ${p.nome}? Você perderá o acesso aos dados deste paciente.`)) return
    try {
      setDesvinculandoId(p.id)
      await desvincularPaciente(p.id)
      setPacientes(atual => atual.filter(x => x.id !== p.id))
      setCarteira(atual => ({
        cadastrados: atual.cadastrados - 1,
        ativos: atual.ativos - (p.status === 'ativo' ? 1 : 0),
      }))
    } catch (err) {
      setError(extractError(err))
    } finally {
      setDesvinculandoId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Gerenciamento"
        title={acompanhamento ? 'Acompanhamento' : 'Pacientes'}
        subtitle={acompanhamento ? 'Selecione um paciente para registrar e acompanhar todas as informações em uma única ficha.' : 'Pacientes que aceitaram o seu acompanhamento pelo aplicativo.'}
        action={<Btn onClick={() => setConvidarAberto(true)}>+ Convidar paciente</Btn>}
      />

      {error && <div style={{ marginBottom: 16 }}><AlertBanner message={error} /></div>}

      {convitesPendentes.length > 0 && (
        <div style={caixaConvites}>
          <div style={tituloConvites}>
            Convites aguardando resposta ({convitesPendentes.length})
          </div>
          {convitesPendentes.map((c) => (
            <div key={c.id} style={linhaConvite}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text)' }}>
                {c.paciente.nome}{' '}
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {c.paciente.email} · enviado em {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <Btn
                size="sm"
                variant="secondary"
                loading={cancelandoConviteId === c.id}
                onClick={() => handleCancelarConvite(c)}
              >
                Cancelar convite
              </Btn>
            </div>
          ))}
        </div>
      )}

      {}
      {!loading && carteira.cadastrados > 0 && (
        <div className={s.resumo}>
          {[
            { label: 'Cadastrados', value: carteira.cadastrados, color: 'var(--primary)', bg: 'var(--primary-soft)' },
            { label: 'Ativos', value: carteira.ativos, color: 'var(--success)', bg: 'var(--success-soft)' },
            { label: 'Inativos', value: carteira.cadastrados - carteira.ativos, color: 'var(--text-soft)', bg: 'var(--surface-alt)' },
          ].map(item => (
            <div key={item.label} className={s.resumoItem} style={{ background: item.bg }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: item.color }}>{item.value}</span>
              <span style={{ fontSize: 13, color: item.color, fontWeight: 600, opacity: 0.8 }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {}
      <div className={s.lista}>
        {}
        <div className={s.busca}>
          <PatientPicker
            patients={pacientes}
            value={busca}
            label="Localizar paciente"
            placeholder="Digite o nome do paciente..."
            onChange={setBusca}
            onSelect={(patient) => navigate(`${raizFicha}/${patient.id}/informacoes`)}
          />
        </div>

        {}
        {!loading && filtrados.length > 0 && (
          <div className={s.cabecalho}>
            <span>Paciente</span>
            <span>Status</span>
            <span>Glicemia média</span>
            <span>Último registro</span>
            <span>Ações</span>
            <span />
          </div>
        )}

        {}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Carregando pacientes...
          </div>
        ) : filtrados.length > 0 ? (
          <div>
            {pag.visiveis.map((p) => (
              <div
                key={p.id}
                className={s.linha}
                onClick={() => navigate(`${raizFicha}/${p.id}/informacoes`)}
              >
                {}
                <div className={s.identidade}>
                  <div className={s.avatar}>{p.nome.charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    {/* O nome é um link de verdade: a linha inteira só responde ao
                        mouse, e por teclado não dava para abrir a ficha. */}
                    <Link
                      to={`${raizFicha}/${p.id}/informacoes`}
                      className={s.nome}
                      onClick={e => e.stopPropagation()}
                    >
                      {p.nome}
                    </Link>
                    <span className={s.email}>{p.email}</span>
                  </div>
                </div>

                {}
                <div className={s.status}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: p.status === 'ativo' ? 'var(--success-soft)' : 'var(--surface-alt)',
                    color: p.status === 'ativo' ? 'var(--success)' : 'var(--text-muted)',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                    {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {}
                <div className={s.glicemia} style={{ color: glicemiaColor(p.glicemiaMedia) }}>
                  {p.glicemiaMedia ? `${p.glicemiaMedia.toLocaleString('pt-BR')} mg/dL` : '—'}
                </div>

                {}
                <div className={s.registro}>
                  {timeAgo(p.ultimoRegistro)}
                </div>

                <div className={s.acoes} onClick={e => e.stopPropagation()}>
                  <Btn variant="secondary" size="sm" onClick={() => navigate(`/relatorios/${p.id}`)}>
                    Ver Relatório
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => navigate(`/pacientes/${p.id}/anotacoes`)}>
                    Registrar Nova Informação
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    loading={desvinculandoId === p.id}
                    onClick={(e) => handleDesvincular(e, p)}
                  >
                    Desvincular
                  </Btn>
                </div>

                <div className={s.seta}>
                  <ChevronIcon />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '8px 0 8px' }}>
            <EmptyState
              icon={<PatientsIcon />}
              title="Nenhum paciente encontrado"
              message={busca ? 'Tente um nome diferente.' : 'Clique em "Convidar paciente" para começar a acompanhar alguém.'}
            />
          </div>
        )}

        {!loading && (
          <Paginacao
            pagina={pag.pagina}
            totalPaginas={pag.totalPaginas}
            total={pag.total}
            primeiro={pag.primeiro}
            ultimo={pag.ultimo}
            onChange={pag.irPara}
            rotulo="pacientes"
            style={{ margin: 0, padding: '12px 20px' }}
          />
        )}
      </div>

      {convidarAberto && (
        <ConvidarPacienteModal
          onClose={() => setConvidarAberto(false)}
          onConvitesAlterados={setConvitesPendentes}
        />
      )}
    </div>
  )
}

/** As linhas são altas, com três botões: dez pacientes já ocupam a tela toda. */
const POR_PAGINA = 10

const caixaConvites: React.CSSProperties = {
  marginBottom: 24, padding: '12px 16px',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
}
const tituloConvites: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
}
const linhaConvite: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', flexWrap: 'wrap',
}

function PatientsIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ChevronIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg> }
