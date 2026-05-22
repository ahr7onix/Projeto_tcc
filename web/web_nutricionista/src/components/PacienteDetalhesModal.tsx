import React, { useState, useEffect } from 'react'
import { api, extractError } from '../../lib/api'

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
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }}>
        <div style={{ background: 'var(--surface)', padding: 40, borderRadius: 16 }}>
          Carregando paciente...
        </div>
      </div>
    )
  }

  if (!paciente) return null

  const regsGlicemia = registros.filter(r => r.tipo === 'glicemia')
  const regsAlimentacao = registros.filter(r => r.tipo === 'refeicao')
  const ultimaSaude = saude.length > 0 ? saude[saude.length - 1] : null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24
    }} onClick={onClose}>
      
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 900,
        height: '80vh', display: 'flex', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Sidebar do Card */}
        <div style={{
          width: 250, background: 'var(--bg)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{paciente.nome}</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{paciente.email}</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', padding: 12, gap: 4 }}>
            <button 
              onClick={() => setAbaAtiva('info')}
              style={{ padding: '12px 16px', textAlign: 'left', background: abaAtiva === 'info' ? 'var(--primary-soft)' : 'transparent', color: abaAtiva === 'info' ? 'var(--primary)' : 'var(--text)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >Informações do paciente</button>
            <button 
              onClick={() => setAbaAtiva('glicemia')}
              style={{ padding: '12px 16px', textAlign: 'left', background: abaAtiva === 'glicemia' ? 'var(--primary-soft)' : 'transparent', color: abaAtiva === 'glicemia' ? 'var(--primary)' : 'var(--text)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >Registro de glicemia</button>
            <button 
              onClick={() => setAbaAtiva('alimentacao')}
              style={{ padding: '12px 16px', textAlign: 'left', background: abaAtiva === 'alimentacao' ? 'var(--primary-soft)' : 'transparent', color: abaAtiva === 'alimentacao' ? 'var(--primary)' : 'var(--text)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >Alimentação</button>
            <button 
              onClick={() => setAbaAtiva('saude')}
              style={{ padding: '12px 16px', textAlign: 'left', background: abaAtiva === 'saude' ? 'var(--primary-soft)' : 'transparent', color: abaAtiva === 'saude' ? 'var(--primary)' : 'var(--text)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >Saúde</button>
          </div>

          <div style={{ marginTop: 'auto', padding: 20 }}>
            <button 
              onClick={onClose}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
            >Fechar Card</button>
          </div>
        </div>

        {/* Conteúdo do Card */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          
          {abaAtiva === 'info' && (
            <div>
              <h3 style={{ fontSize: 24, marginBottom: 20, color: 'var(--text)' }}>Informações Básicas</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                <div><strong>Nome Completo:</strong> {paciente.nome}</div>
                <div><strong>E-mail:</strong> {paciente.email}</div>
                <div><strong>Status:</strong> {paciente.status === 'ativo' ? 'Ativo' : 'Inativo'}</div>
                <div><strong>Média de Glicemia:</strong> {paciente.glicemiaMedia ? `${paciente.glicemiaMedia} mg/dL` : 'Sem registros'}</div>
              </div>
            </div>
          )}

          {abaAtiva === 'saude' && (
            <div>
              <h3 style={{ fontSize: 24, marginBottom: 20, color: 'var(--text)' }}>Saúde (Dados Antropométricos)</h3>
              {ultimaSaude ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Peso</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{ultimaSaude.peso} kg</div>
                  </div>
                  <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Altura</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{ultimaSaude.altura} cm</div>
                  </div>
                  <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>IMC</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{ultimaSaude.imc}</div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Nenhum dado de saúde cadastrado no mobile.</div>
              )}
            </div>
          )}

          {abaAtiva === 'glicemia' && (
            <div>
              <h3 style={{ fontSize: 24, marginBottom: 20, color: 'var(--text)' }}>Registro de Glicemia</h3>
              {regsGlicemia.length > 0 ? (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: 12, color: 'var(--text-muted)' }}>Data</th>
                      <th style={{ padding: 12, color: 'var(--text-muted)' }}>Momento</th>
                      <th style={{ padding: 12, color: 'var(--text-muted)' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regsGlicemia.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12 }}>{new Date(r.criadoEm).toLocaleString('pt-BR')}</td>
                        <td style={{ padding: 12 }}>{r.momento}</td>
                        <td style={{ padding: 12, fontWeight: 'bold', color: r.valor > 126 ? 'red' : 'green' }}>{r.valor} mg/dL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Nenhum registro de glicemia enviado.</div>
              )}
            </div>
          )}

          {abaAtiva === 'alimentacao' && (
            <div>
              <h3 style={{ fontSize: 24, marginBottom: 20, color: 'var(--text)' }}>Alimentação</h3>
              {regsAlimentacao.length > 0 ? (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: 12, color: 'var(--text-muted)' }}>Data</th>
                      <th style={{ padding: 12, color: 'var(--text-muted)' }}>Tipo</th>
                      <th style={{ padding: 12, color: 'var(--text-muted)' }}>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regsAlimentacao.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12 }}>{new Date(r.criadoEm).toLocaleString('pt-BR')}</td>
                        <td style={{ padding: 12, textTransform: 'capitalize' }}>{r.tipo_refeicao}</td>
                        <td style={{ padding: 12 }}>{r.descricao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Nenhuma refeição registrada.</div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
