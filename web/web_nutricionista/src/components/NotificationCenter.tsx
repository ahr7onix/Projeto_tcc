import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assinarMensagens, type EventoMensagem } from '../lib/mensagens-stream'
import { api } from '../lib/api'
import { listarAlertas, type Alerta } from '../lib/alertas'
import { type Mensagem } from '../lib/mensagens'

interface Paciente { id: string; nome: string; ultimoRegistro: string | null }
interface Persistida { id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; criadoEm: string }
type Filtro = 'pendentes' | 'todos' | 'alertas' | 'mensagens'
type Prioridade = 'critico' | 'atencao' | 'informativo'
interface Item { id: string; tipo: 'alerta' | 'mensagem' | 'atencao' | 'informativo'; prioridade: Prioridade; titulo: string; descricao: string; criadoEm: string; pacienteId?: string; pacienteNome?: string; conversaId?: string; lida: boolean }

const READ_KEY = '@NutriCare:notification-center-read'
const prioridadeOrdem: Record<Prioridade, number> = { critico: 0, atencao: 1, informativo: 2 }

function lerIds(): string[] { try { return JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[] } catch { return [] } }
function textoData(iso: string) { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }

export default function NotificationCenter() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('pendentes')
  const [itens, setItens] = useState<Item[]>([])
  const [toast, setToast] = useState<Item | null>(null)

  const carregar = useCallback(async () => {
    try {
      const [persistidas, alertas, pacientes] = await Promise.all([
        api.get('/notificacoes', { params: { limite: 100 } }),
        listarAlertas({ dias: 7 }),
        api.get('/pacientes'),
      ])
      const lidas = new Set(lerIds())
      const base: Item[] = (persistidas.data.data as Persistida[]).map((item) => ({
        id: `notificacao-${item.id}`, tipo: item.tipo === 'alerta_glicemia' ? 'alerta' : 'informativo', prioridade: item.tipo === 'alerta_glicemia' ? 'atencao' : 'informativo', titulo: item.titulo, descricao: item.mensagem, criadoEm: item.criadoEm, lida: item.lida || lidas.has(`notificacao-${item.id}`),
      }))
      const clinicos: Item[] = (alertas as Alerta[]).map((alerta) => ({
        id: `alerta-${alerta.id}`, tipo: 'alerta', prioridade: alerta.severidade === 'critico' ? 'critico' : 'atencao', titulo: alerta.severidade === 'critico' ? 'Alerta glicêmico crítico' : 'Alerta glicêmico', descricao: `${alerta.pacienteNome} registrou ${alerta.valor} mg/dL (${alerta.mensagem}).`, criadoEm: String(alerta.dataHora), pacienteId: alerta.pacienteId, pacienteNome: alerta.pacienteNome, lida: lidas.has(`alerta-${alerta.id}`),
      }))
      const agora = Date.now()
      const semRegistro: Item[] = (pacientes.data.data as Paciente[]).filter((paciente) => !paciente.ultimoRegistro || agora - new Date(paciente.ultimoRegistro).getTime() >= 7 * 86400000).map((paciente) => ({
        id: `sem-registro-${paciente.id}`, tipo: 'atencao', prioridade: 'atencao', titulo: 'Paciente sem registros', descricao: `${paciente.nome} não registra informações há 7 dias ou mais.`, criadoEm: paciente.ultimoRegistro ?? new Date().toISOString(), pacienteId: paciente.id, pacienteNome: paciente.nome, lida: lidas.has(`sem-registro-${paciente.id}`),
      }))
      setItens((atual) => [...clinicos, ...semRegistro, ...base, ...atual.filter((item) => item.tipo === 'mensagem' && !base.some((novo) => novo.id === item.id))].filter((item, index, lista) => lista.findIndex((outro) => outro.id === item.id) === index))
    } catch { /* A central não deve bloquear a navegação se um endpoint estiver indisponível. */ }
  }, [])

  useEffect(() => {
    void carregar()
    const timer = window.setInterval(carregar, 5_000)
    const cancelar = assinarMensagens((evento: EventoMensagem) => {
      const mensagem: Mensagem = evento.mensagem
      const item: Item = { id: `mensagem-${mensagem.id}`, tipo: 'mensagem', prioridade: 'informativo', titulo: `Nova mensagem de ${mensagem.remetenteNome}`, descricao: mensagem.conteudo, criadoEm: mensagem.criadoEm, pacienteId: evento.contraparteId, pacienteNome: mensagem.remetenteNome, conversaId: evento.contraparteId, lida: false }
      setItens((atual) => [item, ...atual.filter((existente) => existente.id !== item.id)])
      setToast(item)
      window.setTimeout(() => setToast((atual) => atual?.id === item.id ? null : atual), 6000)
      void carregar()
    })
    return () => { window.clearInterval(timer); cancelar() }
  }, [carregar])

  const filtrados = useMemo(() => itens.filter((item) => {
    if (filtro === 'pendentes') return !item.lida
    if (filtro === 'alertas') return item.tipo === 'alerta' || item.tipo === 'atencao'
    if (filtro === 'mensagens') return item.tipo === 'mensagem'
    return true
  }).sort((a, b) => prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade] || new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()), [filtro, itens])
  const naoLidas = itens.filter((item) => !item.lida).length

  function marcarLida(item: Item) {
    const ids = new Set(lerIds()); ids.add(item.id); localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
    setItens((atual) => atual.map((existente) => existente.id === item.id ? { ...existente, lida: true } : existente))
    if (item.id.startsWith('notificacao-')) void api.patch(`/notificacoes/${item.id.replace('notificacao-', '')}/ler`).catch(() => undefined)
  }
  function abrir(item: Item) { marcarLida(item); setAberto(false); if (item.conversaId) navigate(`/mensagens/${item.conversaId}`); else if (item.pacienteId) navigate(`/acompanhamento/${item.pacienteId}`) }
  async function marcarTodas() {
    const ids = itens.filter((item) => !item.lida).map((item) => item.id)
    if (ids.length === 0) return
    setItens((atual) => atual.map((item) => ({ ...item, lida: true })))
    localStorage.setItem(READ_KEY, JSON.stringify([...new Set([...lerIds(), ...ids])]))
    await api.patch('/notificacoes/ler-todas').catch(() => undefined)
  }

  return <>
    <button type="button" aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ''}`} title="Abrir notificações" onClick={() => setAberto((valor) => !valor)} style={styles.bell}><BellIcon />{naoLidas > 0 && <span style={styles.badge}>{naoLidas > 99 ? '99+' : naoLidas}</span>}</button>
    {toast && !aberto && <button type="button" onClick={() => abrir(toast)} style={styles.toast}><div style={styles.toastTitle}><BellIcon /> {toast.titulo}</div><div style={styles.toastText}>{toast.descricao.length > 90 ? `${toast.descricao.slice(0, 90)}...` : toast.descricao}</div><div style={styles.toastTime}>{textoData(toast.criadoEm)}</div></button>}
    {aberto && <aside style={styles.panel} aria-label="Central de notificações"><div style={styles.panelHeader}><div><strong style={styles.panelTitle}>Notificações</strong><div style={styles.panelSub}>{naoLidas} não lidas</div></div><button type="button" onClick={() => setAberto(false)} style={styles.close}>×</button></div><div style={styles.tabs}>{(['pendentes', 'todos', 'alertas', 'mensagens'] as Filtro[]).map((aba) => <button key={aba} type="button" onClick={() => setFiltro(aba)} style={{ ...styles.tab, ...(filtro === aba ? styles.tabActive : {}) }}>{aba === 'pendentes' ? `Pendentes${naoLidas ? ` (${naoLidas})` : ''}` : aba === 'todos' ? 'Todas' : aba === 'alertas' ? 'Alertas' : 'Mensagens'}</button>)}<button type="button" onClick={marcarTodas} style={styles.readAll} disabled={!naoLidas}>Marcar todas</button></div><div style={styles.list}>{filtrados.length === 0 ? <div style={styles.empty}>{filtro === 'pendentes' ? 'Nenhuma notificação pendente.' : 'Nenhuma notificação encontrada.'}</div> : filtrados.map((item) => <article key={item.id} style={{ ...styles.item, ...(item.lida ? {} : styles.unread) }}><button type="button" onClick={() => abrir(item)} style={styles.itemButton}><span style={{ ...styles.itemIcon, color: item.prioridade === 'critico' ? 'var(--danger)' : item.prioridade === 'atencao' ? 'var(--warning)' : 'var(--primary)' }}><TypeIcon tipo={item.tipo} /></span><span style={styles.itemBody}><strong>{item.titulo}</strong>{item.pacienteNome && <small>{item.pacienteNome}</small>}<span>{item.descricao}</span><time>{textoData(item.criadoEm)}</time></span>{!item.lida && <span style={styles.dot} />}</button>{!item.lida && <button type="button" onClick={() => marcarLida(item)} style={styles.mark}>Marcar como lida</button>}</article>)}</div></aside>}
  </>
}

const styles: Record<string, React.CSSProperties> = { bell: { position: 'fixed', right: 22, bottom: 22, zIndex: 50, width: 48, height: 48, borderRadius: '50%', border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }, badge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99, background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }, panel: { position: 'fixed', right: 22, bottom: 82, zIndex: 49, width: 'min(390px, calc(100vw - 28px))', maxHeight: 'min(650px, calc(100vh - 110px))', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: '0 18px 50px rgba(15, 35, 45, .18)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }, panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', padding: '18px 18px 12px', borderBottom: '1px solid var(--border)' }, panelTitle: { fontSize: 17, color: 'var(--text)' }, panelSub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }, close: { border: 0, background: 'transparent', color: 'var(--text-muted)', fontSize: 25, cursor: 'pointer' }, tabs: { display: 'flex', gap: 4, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }, tab: { border: 0, background: 'transparent', color: 'var(--text-muted)', padding: '6px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }, tabActive: { background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 700 }, readAll: { marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--primary)', fontSize: 11, cursor: 'pointer' }, list: { overflowY: 'auto' }, item: { padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }, unread: { background: 'var(--primary-soft)' }, itemButton: { width: '100%', display: 'flex', gap: 10, textAlign: 'left', border: 0, background: 'transparent', color: 'var(--text)', cursor: 'pointer', padding: 0 }, itemIcon: { flexShrink: 0, display: 'flex', paddingTop: 2 }, itemBody: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }, 'itemBody strong': { fontSize: 13 }, 'itemBody small': { color: 'var(--primary)', fontSize: 11, fontWeight: 600 }, 'itemBody span': { color: 'var(--text-soft)', fontSize: 12, lineHeight: 1.35 }, 'itemBody time': { color: 'var(--text-muted)', fontSize: 10 }, dot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 5 }, mark: { border: 0, background: 'transparent', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', padding: '7px 0 0 28px' }, empty: { padding: 30, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }, toast: { position: 'fixed', right: 22, bottom: 82, zIndex: 51, width: 'min(340px, calc(100vw - 28px))', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: '12px 14px', color: 'var(--text)', cursor: 'pointer' }, toastTitle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }, toastText: { fontSize: 12, color: 'var(--text-soft)', marginTop: 6, lineHeight: 1.4 }, toastTime: { color: 'var(--text-muted)', fontSize: 10, marginTop: 7 } }

function BellIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg> }
function TypeIcon({ tipo }: { tipo: Item['tipo'] }) { if (tipo === 'mensagem') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" /></svg>; if (tipo === 'alerta' || tipo === 'atencao') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m10.3 3.9-8.4 14a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3l-8.4-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>; return <BellIcon /> }
