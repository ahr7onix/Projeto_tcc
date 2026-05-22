import { useState, useEffect } from 'react'
import { api, extractError } from '../lib/api'
import s from './PacienteDetalhesModal.module.css'

interface ModalProps {
  pacienteId: string
  onClose: () => void
}

type Aba = 'info' | 'glicemia' | 'alimentacao' | 'saude'

const momentoLabel: Record<string, string> = {
  jejum: 'Jejum',
  pre: 'Pré-refeição',
  pos: 'Pós-refeição',
  aleatorio: 'Aleatório',
}

const refeicaoLabel: Record<string, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

function imcStatus(imc: number) {
  if (imc < 18.5) return { label: 'Abaixo do peso', color: '#3b82f6', fill: imc / 40 }
  if (imc < 25)   return { label: 'Peso normal', color: '#10b981', fill: imc / 40 }
  if (imc < 30)   return { label: 'Sobrepeso', color: '#f59e0b', fill: imc / 40 }
  return             { label: 'Obesidade', color: '#ef4444', fill: Math.min(imc / 40, 1) }
}

export default function PacienteDetalhesModal({ pacienteId, onClose }: ModalProps) {
  const [loading, setLoading] = useState(true)
  const [paciente, setPaciente] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [saude, setSaude] = useState<any[]>([])
  const [aba, setAba] = useState<Aba>('info')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [pacRes, regRes, saudeRes] = await Promise.all([
          api.get(`/pacientes/${pacienteId}`),
          api.get(`/registros?pacienteId=${pacienteId}`),
          api.get(`/saude/${pacienteId}`),
        ])
        setPaciente(pacRes.data)
        setRegistros(regRes.data.data || [])
        setSaude(saudeRes.data.data || [])
      } catch (err) {
        alert(extractError(err))
        onClose()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [pacienteId, onClose])

  if (loading) {
    return (
      <div className={s.overlay}>
        <div style={{ background: 'var(--surface)', padding: '32px 40px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
          <Spinner />
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Carregando ficha do paciente…</span>
        </div>
      </div>
    )
  }

  if (!paciente) return null

  const regsGlicemia   = registros.filter(r => r.tipo === 'glicemia')
  const regsAlimentacao = registros.filter(r => r.tipo === 'refeicao')
  const ultimaSaude    = saude.length > 0 ? saude[saude.length - 1] : null
  const initial        = paciente.nome.charAt(0).toUpperCase()
  const ativo          = paciente.status === 'ativo'

  const navItems: { key: Aba; label: string; icon: JSX.Element; count?: number }[] = [
    { key: 'info',        label: 'Informações',  icon: <InfoIcon /> },
    { key: 'glicemia',    label: 'Glicemia',     icon: <DropIcon />,  count: regsGlicemia.length },
    { key: 'alimentacao', label: 'Alimentação',  icon: <ForkIcon />,  count: regsAlimentacao.length },
    { key: 'saude',       label: 'Saúde',        icon: <HeartIcon /> },
  ]

  const sectionMeta: Record<Aba, { title: string; subtitle: string }> = {
    info:        { title: 'Informações do Paciente', subtitle: 'Dados cadastrais e resumo clínico' },
    glicemia:    { title: 'Histórico de Glicemia',   subtitle: `${regsGlicemia.length} registro${regsGlicemia.length !== 1 ? 's' : ''} encontrado${regsGlicemia.length !== 1 ? 's' : ''}` },
    alimentacao: { title: 'Diário de Refeições',     subtitle: `${regsAlimentacao.length} refeição${regsAlimentacao.length !== 1 ? 'ões' : ''} registrada${regsAlimentacao.length !== 1 ? 's' : ''}` },
    saude:       { title: 'Dados de Saúde',          subtitle: ultimaSaude ? 'Última medição antropométrica' : 'Nenhuma medição registrada' },
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>

        {/* SIDEBAR */}
        <div className={s.sidebar}>
          <div className={s.patientHeader}>
            <div className={s.avatarWrap}>
              <div className={s.avatar}>{initial}</div>
              <div className={s.patientInfo}>
                <h2 className={s.patientName}>{paciente.nome}</h2>
                <div className={s.patientEmail}>{paciente.email}</div>
              </div>
            </div>
            <div className={`${s.statusPill} ${!ativo ? s.statusInativo : ''}`}>
              <span className={s.statusDot} />
              {ativo ? 'Ativo' : 'Inativo'}
            </div>
          </div>

          <nav className={s.menu}>
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setAba(item.key)}
                className={`${s.menuItem} ${aba === item.key ? s.menuItemActive : ''}`}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    background: aba === item.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    color: aba === item.key ? '#c4b5fd' : '#64748b',
                  }}>{item.count}</span>
                )}
              </button>
            ))}
          </nav>

          <button className={s.closeBtn} onClick={onClose}>
            <CloseIcon />
            Fechar ficha
          </button>
        </div>

        {/* CONTENT */}
        <div className={s.contentArea}>
          <div className={s.contentHeader}>
            <h3 className={s.sectionTitle}>{sectionMeta[aba].title}</h3>
            <p className={s.sectionSubtitle}>{sectionMeta[aba].subtitle}</p>
          </div>

          <div className={s.contentBody}>

            {/* ── INFORMAÇÕES ── */}
            {aba === 'info' && (
              <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                <div className={s.statGrid} style={{ marginBottom: 20 }}>
                  <div className={s.statCard}>
                    <div className={s.statLabel}>Média glicêmica</div>
                    <div className={s.statValue} style={{ color: paciente.glicemiaMedia > 126 ? '#dc2626' : paciente.glicemiaMedia ? '#16a34a' : 'var(--text-muted)' }}>
                      {paciente.glicemiaMedia ?? '—'}
                      {paciente.glicemiaMedia && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>mg/dL</span>}
                    </div>
                  </div>
                  <div className={s.statCard}>
                    <div className={s.statLabel}>Registros</div>
                    <div className={s.statValue}>{registros.length}</div>
                  </div>
                  <div className={s.statCard}>
                    <div className={s.statLabel}>Último registro</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}>
                      {paciente.ultimoRegistro ? new Date(paciente.ultimoRegistro).toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>
                </div>

                <div className={s.profileSection}>
                  <div className={s.profileRow}>
                    <div className={s.profileIcon}><PersonIcon /></div>
                    <div>
                      <div className={s.profileFieldLabel}>Nome completo</div>
                      <div className={s.profileFieldValue}>{paciente.nome}</div>
                    </div>
                  </div>
                  <div className={s.profileRow}>
                    <div className={s.profileIcon}><MailIcon /></div>
                    <div>
                      <div className={s.profileFieldLabel}>E-mail de contato</div>
                      <div className={s.profileFieldValue}>{paciente.email}</div>
                    </div>
                  </div>
                  <div className={s.profileRow}>
                    <div className={s.profileIcon}><StatusIcon /></div>
                    <div>
                      <div className={s.profileFieldLabel}>Status da conta</div>
                      <div className={s.profileFieldValue}>
                        <span className={`${s.badge} ${ativo ? s.badgeSuccess : s.badgeWarning}`}>
                          {ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── GLICEMIA ── */}
            {aba === 'glicemia' && (
              <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                {regsGlicemia.length > 0 ? (
                  <div className={s.tableWrap}>
                    <table className={s.dataTable}>
                      <thead>
                        <tr>
                          <th>Data / Hora</th>
                          <th>Momento</th>
                          <th>Valor</th>
                          <th>Observação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regsGlicemia.map(r => {
                          const alto = r.valor > 126
                          return (
                            <tr key={r.id}>
                              <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(r.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td>{momentoLabel[r.momento] ?? r.momento ?? '—'}</td>
                              <td>
                                <span className={`${s.badge} ${alto ? s.badgeDanger : s.badgeSuccess}`}>
                                  {r.valor} mg/dL
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.observacao || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={s.empty}>
                    <div className={s.emptyIcon}><DropIcon /></div>
                    <p className={s.emptyTitle}>Nenhum registro de glicemia</p>
                    <p className={s.emptyMsg}>O paciente ainda não enviou medições pelo aplicativo.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ALIMENTAÇÃO ── */}
            {aba === 'alimentacao' && (
              <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                {regsAlimentacao.length > 0 ? (
                  <div className={s.tableWrap}>
                    <table className={s.dataTable}>
                      <thead>
                        <tr>
                          <th>Data / Hora</th>
                          <th>Refeição</th>
                          <th>Descrição</th>
                          <th>Carb.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regsAlimentacao.map(r => (
                          <tr key={r.id}>
                            <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(r.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td style={{ fontWeight: 600 }}>{refeicaoLabel[r.tipo_refeicao] ?? r.tipo_refeicao ?? '—'}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{r.descricao || '—'}</td>
                            <td>{r.carboidratos ? `${r.carboidratos} g` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={s.empty}>
                    <div className={s.emptyIcon}><ForkIcon /></div>
                    <p className={s.emptyTitle}>Nenhuma refeição registrada</p>
                    <p className={s.emptyMsg}>O paciente ainda não registrou refeições no aplicativo.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── SAÚDE ── */}
            {aba === 'saude' && (
              <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                {ultimaSaude ? (
                  <>
                    <div className={s.statGrid} style={{ marginBottom: 20 }}>
                      <div className={s.statCard}>
                        <div className={s.statLabel}>Peso</div>
                        <div className={s.statValue}>{ultimaSaude.peso}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>kg</span></div>
                      </div>
                      <div className={s.statCard}>
                        <div className={s.statLabel}>Altura</div>
                        <div className={s.statValue}>{ultimaSaude.altura}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>cm</span></div>
                      </div>
                      <div className={s.statCard}>
                        <div className={s.statLabel}>IMC</div>
                        <div className={s.statValue}>{ultimaSaude.imc}</div>
                        {ultimaSaude.imc && (() => {
                          const st = imcStatus(Number(ultimaSaude.imc))
                          return (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 600, color: st.color, marginTop: 4 }}>{st.label}</div>
                              <div className={s.imcBar}>
                                <div className={s.imcFill} style={{ width: `${st.fill * 100}%`, background: st.color }} />
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <div className={s.profileSection}>
                      <div className={s.profileRow}>
                        <div className={s.profileIcon} style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><CalIcon /></div>
                        <div>
                          <div className={s.profileFieldLabel}>Data da medição</div>
                          <div className={s.profileFieldValue}>{new Date(ultimaSaude.criadoEm).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</div>
                        </div>
                      </div>
                      {ultimaSaude.observacao && (
                        <div className={s.profileRow}>
                          <div className={s.profileIcon} style={{ background: '#fef9c3', color: '#854d0e' }}><NoteIcon /></div>
                          <div>
                            <div className={s.profileFieldLabel}>Observação</div>
                            <div className={s.profileFieldValue}>{ultimaSaude.observacao}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={s.empty}>
                    <div className={s.emptyIcon}><HeartIcon /></div>
                    <p className={s.emptyTitle}>Sem dados antropométricos</p>
                    <p className={s.emptyMsg}>O paciente ainda não registrou peso, altura ou IMC no aplicativo.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 20, height: 20, border: '2.5px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
    </>
  )
}

function InfoIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> }
function DropIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> }
function ForkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
function HeartIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> }
function PersonIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function MailIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function StatusIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
function CalIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function NoteIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> }
function CloseIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
