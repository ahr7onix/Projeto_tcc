import React, { useState, useEffect } from 'react'
import { api, extractError } from '../../lib/api'
import s from './PacienteDetalhesModal.module.css'

interface ModalProps {
  pacienteId: string
  onClose: () => void
}

export default function PacienteDetalhesModal({ pacienteId, onClose }: ModalProps) {
  const [loading, setLoading] = useState(true)
  const [paciente, setPaciente] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [saude, setSaude] = useState<any[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'info' | 'glicemia' | 'alimentacao' | 'saude'>('info')

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true)
        const [pacRes, regRes, saudeRes] = await Promise.all([
          api.get(`/pacientes/${pacienteId}`),
          api.get(`/registros?pacienteId=${pacienteId}`),
          api.get(`/saude/${pacienteId}`)
        ])
        
        setPaciente(pacRes.data)
        setRegistros(regRes.data.data || [])
        setSaude(saudeRes.data.data || [])
      } catch (error) {
        alert('Erro ao carregar dados do paciente: ' + extractError(error))
        onClose()
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [pacienteId, onClose])

  if (loading) {
    return (
      <div className={s.overlay}>
        <div style={{ background: 'var(--surface)', padding: 40, borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div className="spinner" style={{ width: 24, height: 24, border: '3px solid var(--primary-soft)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>Carregando ficha do paciente...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (!paciente) return null

  const regsGlicemia = registros.filter(r => r.tipo === 'glicemia')
  const regsAlimentacao = registros.filter(r => r.tipo === 'refeicao')
  const ultimaSaude = saude.length > 0 ? saude[saude.length - 1] : null
  const initial = paciente.nome.charAt(0).toUpperCase()

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        
        {/* Sidebar do Card */}
        <div className={s.sidebar}>
          <div className={s.patientHeader}>
            <div className={s.avatar}>{initial}</div>
            <h2 className={s.patientName}>{paciente.nome}</h2>
            <div className={s.patientEmail}>{paciente.email}</div>
          </div>
          
          <div className={s.menu}>
            <button 
              onClick={() => setAbaAtiva('info')}
              className={`${s.menuItem} ${abaAtiva === 'info' ? s.menuItemActive : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Informações
            </button>
            <button 
              onClick={() => setAbaAtiva('glicemia')}
              className={`${s.menuItem} ${abaAtiva === 'glicemia' ? s.menuItemActive : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Glicemia
            </button>
            <button 
              onClick={() => setAbaAtiva('alimentacao')}
              className={`${s.menuItem} ${abaAtiva === 'alimentacao' ? s.menuItemActive : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
              Alimentação
            </button>
            <button 
              onClick={() => setAbaAtiva('saude')}
              className={`${s.menuItem} ${abaAtiva === 'saude' ? s.menuItemActive : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Saúde
            </button>
          </div>

          <button className={s.closeBtn} onClick={onClose}>
            Fechar Card
          </button>
        </div>

        {/* Conteúdo do Card */}
        <div className={s.contentArea}>
          
          {abaAtiva === 'info' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h3 className={s.sectionTitle}>Visão Geral</h3>
              
              <div className={s.gridCards} style={{ marginBottom: 32 }}>
                <div className={s.infoCard}>
                  <div className={s.infoLabel}>Status da Conta</div>
                  <div className={s.infoValue}>
                    <span className={`${s.badge} ${paciente.status === 'ativo' ? s.badgeSuccess : s.badgeWarning}`}>
                      {paciente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className={s.infoCard}>
                  <div className={s.infoLabel}>Média Glicêmica</div>
                  <div className={s.infoValue}>
                    {paciente.glicemiaMedia ? (
                      <span style={{ color: paciente.glicemiaMedia > 126 ? '#dc2626' : '#16a34a' }}>
                        {paciente.glicemiaMedia} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>mg/dL</span>
                      </span>
                    ) : '---'}
                  </div>
                </div>
                <div className={s.infoCard}>
                  <div className={s.infoLabel}>Total de Registros</div>
                  <div className={s.infoValue}>{registros.length}</div>
                </div>
              </div>

              <div>
                <div className={s.infoLabel}>Nome Completo</div>
                <div style={{ fontSize: 18, color: 'var(--text)', marginBottom: 16, fontWeight: 500 }}>{paciente.nome}</div>
                
                <div className={s.infoLabel}>E-mail de Contato</div>
                <div style={{ fontSize: 18, color: 'var(--text)', fontWeight: 500 }}>{paciente.email}</div>
              </div>
            </div>
          )}

          {abaAtiva === 'saude' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h3 className={s.sectionTitle}>Dados Antropométricos</h3>
              {ultimaSaude ? (
                <div className={s.gridCards}>
                  <div className={s.infoCard}>
                    <div className={s.infoLabel}>Peso Atual</div>
                    <div className={s.infoValue}>{ultimaSaude.peso} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>kg</span></div>
                  </div>
                  <div className={s.infoCard}>
                    <div className={s.infoLabel}>Altura</div>
                    <div className={s.infoValue}>{ultimaSaude.altura} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>cm</span></div>
                  </div>
                  <div className={s.infoCard}>
                    <div className={s.infoLabel}>Índice IMC</div>
                    <div className={s.infoValue}>{ultimaSaude.imc}</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 16, color: '#64748b' }}>
                  Nenhum dado de saúde cadastrado no aplicativo mobile ainda.
                </div>
              )}
            </div>
          )}

          {abaAtiva === 'glicemia' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h3 className={s.sectionTitle}>Histórico de Glicemia</h3>
              {regsGlicemia.length > 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <table className={s.dataTable}>
                    <thead>
                      <tr>
                        <th>Data e Hora</th>
                        <th>Momento</th>
                        <th>Nível Glicêmico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regsGlicemia.map(r => (
                        <tr key={r.id}>
                          <td>{new Date(r.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td style={{ textTransform: 'capitalize' }}>{r.momento}</td>
                          <td>
                            <span className={`${s.badge} ${r.valor > 126 ? s.badgeWarning : s.badgeSuccess}`}>
                              {r.valor} mg/dL
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 16, color: '#64748b' }}>
                  Nenhum registro de glicemia foi enviado por este paciente.
                </div>
              )}
            </div>
          )}

          {abaAtiva === 'alimentacao' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h3 className={s.sectionTitle}>Diário de Refeições</h3>
              {regsAlimentacao.length > 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <table className={s.dataTable}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Refeição</th>
                        <th>Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regsAlimentacao.map(r => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.tipo_refeicao}</td>
                          <td style={{ color: '#475569' }}>{r.descricao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 16, color: '#64748b' }}>
                  O paciente ainda não registrou nenhuma refeição.
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
