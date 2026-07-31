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
} from '../../components/ui'
import ReceitaModal from '../../components/ReceitaModal'
import { extractError } from '../../lib/api'
import {
  excluirReceita,
  linhasDeIngredientes,
  listarCategorias,
  listarReceitas,
  type CategoriaReceita,
  type Receita,
} from '../../lib/receitas'

export default function ReceitasPage() {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [categorias, setCategorias] = useState<CategoriaReceita[]>([])
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [apenasMinhas, setApenasMinhas] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Receita | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [abertaId, setAbertaId] = useState<string | null>(null)

  const carregar = useCallback(
    async (termo: string, categoriaSelecionada: string, minhas: boolean) => {
      try {
        setLoading(true)
        setErro(null)
        setReceitas(
          await listarReceitas({
            busca: termo,
            categoria: categoriaSelecionada,
            apenasMinhas: minhas,
            limite: 100,
          }),
        )
      } catch (err) {
        setErro(extractError(err))
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => setCategorias([]))
  }, [])

  // A busca espera o usuário parar de digitar para não disparar uma consulta por tecla.
  useEffect(() => {
    const tempo = setTimeout(() => carregar(busca, categoria, apenasMinhas), 350)
    return () => clearTimeout(tempo)
  }, [busca, categoria, apenasMinhas, carregar])

  function abrirNova() {
    setEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(receita: Receita) {
    setEditando(receita)
    setModalAberto(true)
  }

  function handleSaved(salva: Receita) {
    setReceitas((atual) => {
      const existe = atual.some((r) => r.id === salva.id)
      return existe ? atual.map((r) => (r.id === salva.id ? salva : r)) : [salva, ...atual]
    })
    listarCategorias()
      .then(setCategorias)
      .catch(() => undefined)
  }

  async function handleExcluir(receita: Receita) {
    const confirmado = window.confirm(
      `Excluir a receita "${receita.titulo}"? Esta ação não pode ser desfeita.`,
    )
    if (!confirmado) return

    try {
      setExcluindoId(receita.id)
      await excluirReceita(receita.id)
      setReceitas((atual) => atual.filter((r) => r.id !== receita.id))
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Educação alimentar"
        title="Receitas"
        subtitle="Monte receitas saudáveis e publique para os pacientes verem no aplicativo."
        action={<Btn onClick={abrirNova}>+ Nova receita</Btn>}
      />

      {erro && <AlertBanner message={erro} />}

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240, flex: 2 }}>
            <Input
              label="Buscar receita"
              placeholder="Ex: panqueca, salada, sopa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <Select
              label="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              options={[
                { value: '', label: 'Todas as categorias' },
                ...categorias.map((c) => ({
                  value: c.categoria,
                  label: `${c.categoria} (${c.total})`,
                })),
              ]}
            />
          </div>
          <label style={filtroMinhas}>
            <input
              type="checkbox"
              checked={apenasMinhas}
              onChange={(e) => setApenasMinhas(e.target.checked)}
            />
            Só as minhas
          </label>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando receitas...
          </div>
        </Card>
      ) : receitas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ChefIcon />}
            title="Nenhuma receita cadastrada"
            message="Cadastre uma receita para o paciente encontrar no aplicativo."
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {receitas.map((receita) => {
            const aberta = abertaId === receita.id
            const ingredientes = linhasDeIngredientes(receita.ingredientes)

            return (
              <Card key={receita.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {receita.titulo}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {receita.categoria} · por {receita.autorNome}
                    </div>
                  </div>
                  <Badge
                    label={receita.publicado ? 'Publicada' : 'Rascunho'}
                    tint={receita.publicado ? 'success' : 'warning'}
                  />
                </div>

                {receita.resumo && (
                  <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>{receita.resumo}</div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {receita.porcoes !== null && (
                    <span style={etiqueta}>{receita.porcoes} porções</span>
                  )}
                  {receita.tempoPreparoMin !== null && (
                    <span style={etiqueta}>{receita.tempoPreparoMin} min</span>
                  )}
                  {receita.kcalPorcao !== null && (
                    <span style={etiqueta}>{receita.kcalPorcao} kcal/porção</span>
                  )}
                  {receita.carboidratosPorcao !== null && (
                    <span style={etiqueta}>{receita.carboidratosPorcao} g de carboidrato</span>
                  )}
                </div>

                {aberta && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={subtitulo}>Ingredientes</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-soft)' }}>
                        {ingredientes.map((linha, i) => (
                          <li key={i} style={{ marginTop: 3 }}>
                            {linha}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={subtitulo}>Modo de preparo</div>
                      {/* whiteSpace preserva as quebras que a nutricionista digitou. */}
                      <div style={{ fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>
                        {receita.modoPreparo}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setAbertaId(aberta ? null : receita.id)}
                  >
                    {aberta ? 'Ocultar' : 'Ver receita'}
                  </Btn>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="secondary" size="sm" onClick={() => abrirEdicao(receita)}>
                      Editar
                    </Btn>
                    <Btn
                      variant="danger"
                      size="sm"
                      loading={excluindoId === receita.id}
                      onClick={() => handleExcluir(receita)}
                    >
                      Excluir
                    </Btn>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ReceitaModal
          receita={editando}
          onClose={() => setModalAberto(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

const etiqueta: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-soft)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '3px 10px',
}
const subtitulo: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  color: 'var(--text-muted)',
  marginBottom: 6,
}
const filtroMinhas: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-soft)',
  cursor: 'pointer',
  paddingBottom: 10,
}

function ChefIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z" />
      <path d="M6 17h12" />
    </svg>
  )
}
