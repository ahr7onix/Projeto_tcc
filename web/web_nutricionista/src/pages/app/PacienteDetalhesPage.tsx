import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, PageHeader, Btn, Badge } from '../../components/ui'
import { api, extractError } from '../../lib/api'

export default function PacienteDetalhesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [paciente, setPaciente] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [saude, setSaude] = useState<any[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'info' | 'glicemia' | 'alimentacao'>('info')

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true)
        // Buscando dados paralelamente para ser mais rápido
        const [pacRes, regRes, saudeRes] = await Promise.all([
          api.get(`/pacientes/${id}`),
          api.get(`/registros?pacienteId=${id}`),
          api.get(`/saude/${id}`)
        ])
        
        setPaciente(pacRes.data)
        setRegistros(regRes.data.data || [])
        setSaude(saudeRes.data.data || [])
      } catch (error) {
        alert('Erro ao carregar dados do paciente: ' + extractError(error))
        navigate('/pacientes')
      } finally {
        setLoading(false)
      }
    }
    if (id) carregarDados()
  }, [id, navigate])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando dados do paciente...</div>
  if (!paciente) return <div style={{ padding: 40, textAlign: 'center' }}>Paciente não encontrado.</div>

  const regsGlicemia = registros.filter(r => r.tipo === 'glicemia')
  const regsAlimentacao = registros.filter(r => r.tipo === 'refeicao')
  const ultimaSaude = saude.length > 0 ? saude[saude.length - 1] : null

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <Btn variant="secondary" onClick={() => navigate('/pacientes')}>&larr; Voltar</Btn>
      </div>

      <PageHeader
        eyebrow="Ficha Clínica"
        title={paciente.nome}
        subtitle={paciente.email}
        action={<Badge label={paciente.status === 'ativo' ? 'Ativo' : 'Inativo'} tint={paciente.status === 'ativo' ? 'success' : 'warning'} />}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button 
          onClick={() => setAbaAtiva('info')}
          style={{ padding: '8px 16px', background: abaAtiva === 'info' ? 'var(--primary-soft)' : 'transparent', color: abaAtiva === 'info' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >Informações Básicas</button>
        <button 
          onClick={() => setAbaAtiva('glicemia')}
          style={{ padding: '8px 16px', background: abaAtiva === 'glicemia' ? 'var(--primary-soft)' : 'transparent', color: abaAtiva === 'glicemia' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >Histórico de Glicemia</button>
        <button 
          onClick={() => setAbaAtiva('alimentacao')}
          style={{ padding: '8px 16px', background: abaAtiva === 'alimentacao' ? 'var(--primary-soft)' : 'transparent', color: abaAtiva === 'alimentacao' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >Diário Alimentar</button>
      </div>

      <Card>
        {abaAtiva === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 18, color: 'var(--text)' }}>Dados Antropométricos (Saúde)</h3>
            {ultimaSaude ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Peso</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{ultimaSaude.peso} kg</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Altura</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{ultimaSaude.altura} cm</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>IMC</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{ultimaSaude.imc}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Nenhum dado de saúde cadastrado.</div>
            )}
            
            <h3 style={{ fontSize: 18, color: 'var(--text)', marginTop: 20 }}>Métricas Gerais</h3>
            <div style={{ display: 'flex', gap: 20, color: 'var(--text-muted)' }}>
              <div>Glicemia média: <strong>{paciente.glicemiaMedia || '--'} mg/dL</strong></div>
              <div>Registros no sistema: <strong>{registros.length}</strong></div>
            </div>
          </div>
        )}

        {abaAtiva === 'glicemia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 18, color: 'var(--text)' }}>Monitoramento de Glicemia</h3>
            {regsGlicemia.length > 0 ? (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Data</th>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Momento</th>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Valor (mg/dL)</th>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {regsGlicemia.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10 }}>{new Date(r.criadoEm).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: 10 }}>{r.momento}</td>
                      <td style={{ padding: 10, fontWeight: 'bold', color: r.valor > 126 ? 'red' : 'green' }}>{r.valor}</td>
                      <td style={{ padding: 10 }}>{r.observacao || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Nenhum registro de glicemia encontrado.</div>
            )}
          </div>
        )}

        {abaAtiva === 'alimentacao' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 18, color: 'var(--text)' }}>Diário de Refeições</h3>
            {regsAlimentacao.length > 0 ? (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Data</th>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Tipo</th>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Descrição</th>
                    <th style={{ padding: 10, color: 'var(--text-muted)' }}>Carbos (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {regsAlimentacao.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10, minWidth: 150 }}>{new Date(r.criadoEm).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: 10, textTransform: 'capitalize' }}>{r.tipo_refeicao}</td>
                      <td style={{ padding: 10 }}>{r.descricao}</td>
                      <td style={{ padding: 10 }}>{r.carboidratos || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Nenhuma refeição registrada.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
