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
  Textarea,
} from '../../components/ui'
import { extractError } from '../../lib/api'
import {
  atualizarConteudo,
  buscarConteudo,
  criarConteudo,
  listarConteudos,
  removerConteudo,
  type Conteudo,
} from '../../lib/conteudos'

const CATEGORIAS = [
  { value: 'geral', label: 'Geral' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'exercicio', label: 'Exercício' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'autocuidado', label: 'Autocuidado' },
]

interface Formulario {
  id?: string
  titulo: string
  resumo: string
  conteudo: string
  categoria: string
  publicado: boolean
}

const FORM_VAZIO: Formulario = {
  titulo: '',
  resumo: '',
  conteudo: '',
  categoria: 'geral',
  publicado: false,
}

export default function ConteudosPage() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [form, setForm] = useState<Formulario | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      setConteudos(await listarConteudos(true))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function abrirEdicao(c: Conteudo) {
    try {
      const completo = await buscarConteudo(c.id)
      setForm({
        id: completo.id,
        titulo: completo.titulo,
        resumo: completo.resumo ?? '',
        conteudo: completo.conteudo ?? '',
        categoria: completo.categoria,
        publicado: completo.publicado,
      })
    } catch (err) {
      setErro(extractError(err))
    }
  }

  async function salvar() {
    if (!form) return
    if (form.titulo.trim().length < 3) {
      setErro('O título precisa ter ao menos 3 caracteres.')
      return
    }
    if (form.conteudo.trim().length < 10) {
      setErro('O conteúdo precisa ter ao menos 10 caracteres.')
      return
    }

    try {
      setSalvando(true)
      setErro(null)
      const payload = {
        titulo: form.titulo,
        resumo: form.resumo || undefined,
        conteudo: form.conteudo,
        categoria: form.categoria,
        publicado: form.publicado,
      }
      if (form.id) await atualizarConteudo(form.id, payload)
      else await criarConteudo(payload)

      setForm(null)
      carregar()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(c: Conteudo) {
    if (!window.confirm(`Excluir "${c.titulo}"?`)) return
    try {
      await removerConteudo(c.id)
      setConteudos((atual) => atual.filter((x) => x.id !== c.id))
    } catch (err) {
      setErro(extractError(err))
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Educação"
        title="Conteúdos educativos"
        subtitle="Materiais que aparecem no aplicativo dos pacientes."
        action={<Btn onClick={() => setForm({ ...FORM_VAZIO })}>+ Novo conteúdo</Btn>}
      />

      {erro && <AlertBanner message={erro} />}

      {form && (
        <Card title={form.id ? 'Editar conteúdo' : 'Novo conteúdo'} style={{ marginBottom: 20 }}>
          <Input
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
          <Input
            label="Resumo (opcional)"
            value={form.resumo}
            onChange={(e) => setForm({ ...form, resumo: e.target.value })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Select
              label="Categoria"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              options={CATEGORIAS}
            />
            <Select
              label="Situação"
              value={form.publicado ? 'sim' : 'nao'}
              onChange={(e) => setForm({ ...form, publicado: e.target.value === 'sim' })}
              options={[
                { value: 'nao', label: 'Rascunho (não visível)' },
                { value: 'sim', label: 'Publicado' },
              ]}
            />
          </div>
          <Textarea
            label="Conteúdo"
            value={form.conteudo}
            onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
            style={{ minHeight: 180 }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>
              Cancelar
            </Btn>
            <Btn onClick={salvar} loading={salvando}>
              {form.id ? 'Salvar alterações' : 'Criar'}
            </Btn>
          </div>
        </Card>
      )}

      {loading ? (
        <Card>
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando conteúdos...
          </div>
        </Card>
      ) : conteudos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookIcon />}
            title="Nenhum conteúdo cadastrado"
            message="Crie materiais educativos para orientar seus pacientes no app."
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {conteudos.map((c) => (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                    {c.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {c.categoria} · {c.autorNome ?? 'Autor desconhecido'}
                  </div>
                </div>
                <Badge
                  label={c.publicado ? 'Publicado' : 'Rascunho'}
                  tint={c.publicado ? 'success' : 'warning'}
                />
              </div>

              {c.resumo && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {c.resumo}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Btn variant="secondary" size="sm" onClick={() => abrirEdicao(c)}>
                  Editar
                </Btn>
                <Btn variant="danger" size="sm" onClick={() => excluir(c)}>
                  Excluir
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function BookIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
