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
import { useAuth } from '../../contexts/AuthContext'
import { extractError } from '../../lib/api'
import {
  listarUsuarios,
  obterMetricas,
  removerUsuario,
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

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function AdminPage() {
  const { user } = useAuth()
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const ehAdmin = user?.role === 'administrador'

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      setErro(null)
      const [m, u] = await Promise.all([
        obterMetricas(),
        listarUsuarios({ tipo: tipo || undefined, busca: busca || undefined }),
      ])
      setMetricas(m)
      setUsuarios(u)
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [tipo, busca])

  useEffect(() => {
    if (!ehAdmin) {
      setLoading(false)
      return
    }
    const timer = setTimeout(carregar, busca ? 300 : 0)
    return () => clearTimeout(timer)
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
