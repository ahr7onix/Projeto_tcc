import { useCallback, useEffect, useRef, useState } from 'react'
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
  TabelaRolavel,
} from '../../components/ui'
import AlimentoModal from '../../components/AlimentoModal'
import ImportarAlimentosModal from '../../components/ImportarAlimentosModal'
import { extractError } from '../../lib/api'
import {
  desativarAlimento,
  descreverPorcao,
  listarGrupos,
  listarPaginaAlimentos,
  type Alimento,
  type GrupoAlimento,
} from '../../lib/alimentos'

/**
 * Cada página é um pedido à API. Trazer a TACO inteira (578 alimentos) para
 * paginar aqui gastaria banda à toa, e o teto da API é 500 por pedido.
 */
const POR_PAGINA = 25

/** Uma casa decimal só quando o número precisa: 89 e 89,5. */
const formatar = (valor: number | null): string => {
  if (valor === null) return '—'
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',')
}

export default function AlimentosPage() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [grupos, setGrupos] = useState<GrupoAlimento[]>([])
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [importando, setImportando] = useState(false)
  const [editando, setEditando] = useState<Alimento | null>(null)
  const [desativandoId, setDesativandoId] = useState<string | null>(null)

  const carregar = useCallback(
    async (termo: string, grupoSelecionado: string, numero: number, ativo: () => boolean) => {
      try {
        setLoading(true)
        setErro(null)
        const resposta = await listarPaginaAlimentos({
          busca: termo,
          grupo: grupoSelecionado,
          limite: POR_PAGINA,
          pagina: numero,
        })
        if (!ativo()) return
        // Remover o único alimento da última página deixa essa página vazia.
        if (resposta.itens.length === 0 && numero > 1) {
          setPagina(numero - 1)
          return
        }
        setAlimentos(resposta.itens)
        setTotal(resposta.total)
      } catch (err) {
        if (ativo()) setErro(extractError(err))
      } finally {
        if (ativo()) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    let cancelado = false
    listarGrupos()
      .then((lista) => {
        if (!cancelado) setGrupos(lista)
      })
      .catch(() => {
        if (!cancelado) setGrupos([])
      })
    return () => {
      cancelado = true
    }
  }, [])

  // A busca espera o usuário parar de digitar para não disparar uma consulta por tecla.
  //
  // O debounce evita a consulta por tecla, mas não desfaz a que já saiu: trocar
  // de grupo com uma busca em andamento deixava as duas no ar, e a mais lenta
  // sobrescrevia a certa. A guarda `cancelado` descarta a resposta que não vale
  // mais. A espera só vale para quem digita: trocar de página ou de grupo é na hora.
  const buscaAnterior = useRef(busca)
  useEffect(() => {
    const digitando = buscaAnterior.current !== busca
    buscaAnterior.current = busca
    let cancelado = false
    const tempo = setTimeout(() => carregar(busca, grupo, pagina, () => !cancelado), digitando ? 350 : 0)
    return () => {
      cancelado = true
      clearTimeout(tempo)
    }
  }, [busca, grupo, pagina, carregar])

  function mudarBusca(valor: string) {
    setBusca(valor)
    setPagina(1)
  }

  function mudarGrupo(valor: string) {
    setGrupo(valor)
    setPagina(1)
  }

  function abrirNovo() {
    setEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(alimento: Alimento) {
    setEditando(alimento)
    setModalAberto(true)
  }

  function handleSaved(salvo: Alimento) {
    if (!alimentos.some((a) => a.id === salvo.id)) setTotal((atual) => atual + 1)
    setAlimentos((atual) => {
      const existe = atual.some((a) => a.id === salvo.id)
      return existe ? atual.map((a) => (a.id === salvo.id ? salvo : a)) : [salvo, ...atual]
    })
    listarGrupos()
      .then(setGrupos)
      .catch(() => undefined)
  }

  function handleImportado() {
    carregar(busca, grupo, pagina, () => true)
    listarGrupos()
      .then(setGrupos)
      .catch(() => undefined)
  }

  async function handleDesativar(alimento: Alimento) {
    const confirmado = window.confirm(
      `Remover "${alimento.nome}" da tabela? Ele deixa de aparecer nas buscas, mas continua nos planos já montados.`,
    )
    if (!confirmado) return

    try {
      setDesativandoId(alimento.id)
      await desativarAlimento(alimento.id)
      // Recarrega em vez de só tirar da lista: o próximo alimento sobe para completar a página.
      await carregar(busca, grupo, pagina, () => true)
      listarGrupos()
        .then(setGrupos)
        .catch(() => undefined)
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setDesativandoId(null)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const primeiro = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const filtrando = Boolean(busca.trim() || grupo)

  return (
    <div>
      <PageHeader
        eyebrow="Tabela nutricional"
        title="Alimentos"
        subtitle="Consulte os valores por porção e mantenha a tabela usada no cálculo dos planos."
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="secondary" onClick={() => setImportando(true)}>
              Importar planilha
            </Btn>
            <Btn onClick={abrirNovo}>+ Novo alimento</Btn>
          </div>
        }
      />

      {erro && <AlertBanner message={erro} />}

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260, flex: 2 }}>
            <Input
              label="Buscar alimento"
              placeholder="Ex: arroz, feijão, banana..."
              value={busca}
              onChange={(e) => mudarBusca(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <Select
              label="Grupo"
              value={grupo}
              onChange={(e) => mudarGrupo(e.target.value)}
              options={[
                { value: '', label: 'Todos os grupos' },
                ...grupos.map((g) => ({ value: g.grupo, label: `${g.grupo} (${g.total})` })),
              ]}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--primary)' }}>
              {total}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {filtrando ? (total === 1 ? 'encontrado' : 'encontrados') : 'na tabela'}
            </div>
          </div>
        </div>
      </Card>

      {/* Só a primeira carga troca a tabela pelo aviso. Ao mudar de página a tabela
          fica no lugar, senão a tela encolhe e pula a cada clique. */}
      {loading && alimentos.length === 0 ? (
        <Card>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando alimentos...
          </div>
        </Card>
      ) : alimentos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TableIcon />}
            title="Nenhum alimento encontrado"
            message="Ajuste a busca ou cadastre um alimento novo na tabela."
          />
        </Card>
      ) : (
        <Card flush>
          {/* Rolagem própria: a tabela tem mais colunas do que cabe no celular. */}
          <TabelaRolavel rotulo="Tabela de alimentos" primeiraColunaFixa>
            <table style={{ ...tabela, opacity: loading ? 0.6 : 1 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Alimento</th>
                  <th style={th}>Porção</th>
                  <th style={th}>kcal</th>
                  <th style={th}>Carb. (g)</th>
                  <th style={th}>Prot. (g)</th>
                  <th style={th}>Lip. (g)</th>
                  <th style={th}>Fibras (g)</th>
                  <th style={th}>IG</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {alimentos.map((alimento) => (
                  <tr key={alimento.id}>
                    <td style={{ ...td, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{alimento.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {alimento.grupo}
                        {alimento.fonte ? ` · ${alimento.fonte}` : ''}
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{descreverPorcao(alimento)}</td>
                    <td style={{ ...td, fontWeight: 600, color: 'var(--text)' }}>
                      {formatar(alimento.kcal)}
                    </td>
                    <td style={td}>{formatar(alimento.carboidratosG)}</td>
                    <td style={td}>{formatar(alimento.proteinasG)}</td>
                    <td style={td}>{formatar(alimento.lipidiosG)}</td>
                    <td style={td}>{formatar(alimento.fibrasG)}</td>
                    <td style={td}>
                      {alimento.indiceGlicemico === null ? (
                        '—'
                      ) : (
                        <Badge
                          label={String(alimento.indiceGlicemico)}
                          tint={tintDoIndice(alimento.indiceGlicemico)}
                        />
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Btn variant="secondary" size="sm" onClick={() => abrirEdicao(alimento)}>
                          Editar
                        </Btn>
                        <Btn
                          variant="danger"
                          size="sm"
                          loading={desativandoId === alimento.id}
                          onClick={() => handleDesativar(alimento)}
                        >
                          Remover
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelaRolavel>
          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            primeiro={primeiro}
            ultimo={Math.min(primeiro + POR_PAGINA - 1, total)}
            onChange={setPagina}
            rotulo="alimentos"
            style={{ margin: 0, padding: '12px 18px' }}
          />
        </Card>
      )}

      <div style={rodape}>
        O índice glicêmico é uma referência geral e não substitui a avaliação da
        nutricionista para cada paciente.
      </div>

      {modalAberto && (
        <AlimentoModal
          alimento={editando}
          onClose={() => setModalAberto(false)}
          onSaved={handleSaved}
        />
      )}

      {importando && (
        <ImportarAlimentosModal
          onClose={() => setImportando(false)}
          onImportado={handleImportado}
        />
      )}
    </div>
  )
}

/** Faixas usuais do índice glicêmico: até 55 baixo, até 69 médio, acima disso alto. */
function tintDoIndice(indice: number): 'success' | 'warning' | 'danger' {
  if (indice <= 55) return 'success'
  if (indice <= 69) return 'warning'
  return 'danger'
}

const tabela: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
  minWidth: 860,
  transition: 'opacity 0.12s',
}
const th: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'right',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  background: 'var(--surface-alt)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'right',
  color: 'var(--text-soft)',
  borderBottom: '1px solid var(--border)',
}
const rodape: React.CSSProperties = {
  marginTop: 14,
  fontSize: 12,
  color: 'var(--text-muted)',
}

function TableIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </svg>
  )
}
