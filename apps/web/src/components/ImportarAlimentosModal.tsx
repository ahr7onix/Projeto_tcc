import { useRef, useState } from 'react'
import { AlertBanner, Badge, Btn, Input } from './ui'
import { extractError } from '../lib/api'
import { importarAlimentos } from '../lib/alimentos'
import {
  baixarModeloCsv,
  lerArquivoTexto,
  lerPlanilha,
  type PlanilhaLida,
} from '../lib/planilha-alimentos'

interface Props {
  onClose: () => void
  /** Chamado quando algum lote foi gravado, para a tela recarregar a lista. */
  onImportado: () => void
}

/** Bem abaixo do teto da API (500) e do limite de 100 kB do corpo da requisição. */
const TAMANHO_DO_LOTE = 250
const LINHAS_NA_PREVIA = 8
const PROBLEMAS_LISTADOS = 30

interface Recusa {
  linha: number
  nome: string
  motivo: string
}

interface Resultado {
  inseridos: number
  atualizados: number
  recusados: Recusa[]
}

export default function ImportarAlimentosModal({ onClose, onImportado }: Props) {
  const inputArquivo = useRef<HTMLInputElement>(null)
  const [fonte, setFonte] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null)
  const [planilha, setPlanilha] = useState<PlanilhaLida | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<{ enviados: number; total: number } | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const prontas = planilha?.linhas.filter((l) => l.item) ?? []
  const comProblema = planilha?.linhas.filter((l) => !l.item) ?? []
  const enviando = progresso !== null && resultado === null

  async function handleArquivo(arquivo: File | undefined) {
    if (!arquivo) return
    setErro(null)
    setResultado(null)
    setNomeArquivo(arquivo.name)
    try {
      setPlanilha(lerPlanilha(await lerArquivoTexto(arquivo)))
    } catch {
      setPlanilha(null)
      setErro('Não foi possível ler o arquivo. Salve a planilha como CSV e tente de novo.')
    }
  }

  async function handleImportar() {
    if (fonte.trim().length < 2) {
      setErro('Informe a fonte da tabela, por exemplo "TACO 4ª edição".')
      return
    }
    setErro(null)
    setProgresso({ enviados: 0, total: prontas.length })

    const acumulado: Resultado = { inseridos: 0, atualizados: 0, recusados: [] }
    for (let inicio = 0; inicio < prontas.length; inicio += TAMANHO_DO_LOTE) {
      const lote = prontas.slice(inicio, inicio + TAMANHO_DO_LOTE)
      try {
        const resposta = await importarAlimentos(
          fonte.trim(),
          lote.map((l) => l.item!),
        )
        acumulado.inseridos += resposta.inseridos
        acumulado.atualizados += resposta.atualizados
        // A API conta a posição dentro do lote; a nutricionista pensa na linha do arquivo.
        acumulado.recusados.push(
          ...resposta.recusados.map((r) => ({
            linha: lote[r.indice].linha,
            nome: r.nome ?? lote[r.indice].nome,
            motivo: r.motivo,
          })),
        )
        setProgresso({ enviados: inicio + lote.length, total: prontas.length })
      } catch (err) {
        if (inicio > 0) onImportado()
        setProgresso(null)
        setErro(
          inicio === 0
            ? extractError(err)
            : `${extractError(err)}. Os primeiros ${inicio} alimentos já foram gravados; ` +
                'importar a mesma planilha de novo completa o restante sem duplicar.',
        )
        return
      }
    }

    setResultado(acumulado)
    onImportado()
  }

  return (
    <div style={overlay} onClick={enviando ? undefined : onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>
            <div style={eyebrow}>Importar planilha</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              Tabela de alimentos
            </h2>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Fechar" disabled={enviando}>
            ×
          </button>
        </div>

        <div style={body}>
          {erro && <AlertBanner message={erro} />}

          {resultado ? (
            <ResumoImportacao resultado={resultado} fonte={fonte.trim()} />
          ) : (
            <>
              <div style={aviso}>
                Envie um arquivo CSV com uma linha por alimento e os valores da porção de
                referência (normalmente 100 g). Colunas obrigatórias: nome, calorias,
                carboidratos, proteínas e lipídios. O cabeçalho da TACO é reconhecido.{' '}
                <button type="button" onClick={baixarModeloCsv} style={link}>
                  Baixar modelo de planilha
                </button>
              </div>

              <Input
                label="Fonte dos dados"
                placeholder="Ex: TACO 4ª edição"
                value={fonte}
                onChange={(e) => setFonte(e.target.value)}
                disabled={enviando}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input
                  ref={inputArquivo}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    handleArquivo(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                <Btn
                  variant="secondary"
                  type="button"
                  onClick={() => inputArquivo.current?.click()}
                  disabled={enviando}
                >
                  {nomeArquivo ? 'Trocar arquivo' : 'Escolher arquivo CSV'}
                </Btn>
                {nomeArquivo && (
                  <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{nomeArquivo}</span>
                )}
              </div>

              {planilha && planilha.colunasFaltando.length > 0 && (
                <AlertBanner
                  message={`A planilha não tem as colunas: ${planilha.colunasFaltando.join(', ')}. Confira o cabeçalho ou use o modelo.`}
                />
              )}

              {planilha && planilha.colunasFaltando.length === 0 && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge
                      label={contar(planilha.linhas.length, 'linha lida', 'linhas lidas')}
                      tint="neutral"
                    />
                    <Badge
                      label={contar(prontas.length, 'pronta', 'prontas') + ' para importar'}
                      tint="success"
                      dot
                    />
                    {comProblema.length > 0 && (
                      <Badge label={`${comProblema.length} com problema`} tint="warning" dot />
                    )}
                  </div>

                  {planilha.colunasIgnoradas.length > 0 && (
                    <div style={nota}>
                      Colunas ignoradas: {planilha.colunasIgnoradas.join(', ')}.
                    </div>
                  )}

                  {prontas.length > 0 && <Previa linhas={prontas.slice(0, LINHAS_NA_PREVIA)} />}

                  {comProblema.length > 0 && (
                    <div>
                      <div style={subtitulo}>Linhas que ficam de fora</div>
                      <ul style={lista}>
                        {comProblema.slice(0, PROBLEMAS_LISTADOS).map((l) => (
                          <li key={l.linha}>
                            Linha {l.linha}
                            {l.nome ? ` · ${l.nome}` : ''}: {l.problemas.join(', ')}
                          </li>
                        ))}
                      </ul>
                      {comProblema.length > PROBLEMAS_LISTADOS && (
                        <div style={nota}>
                          e mais {comProblema.length - PROBLEMAS_LISTADOS} linhas com problema.
                        </div>
                      )}
                    </div>
                  )}

                  <div style={nota}>
                    Um alimento que já existe com o mesmo nome nesta fonte tem os valores
                    atualizados. Alimentos de outras fontes, como os de exemplo, não são
                    alterados.
                  </div>
                </>
              )}

              {enviando && progresso && (
                <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                  Enviando {progresso.enviados} de {progresso.total} alimentos...
                </div>
              )}
            </>
          )}
        </div>

        <div style={footer}>
          {resultado ? (
            <Btn onClick={onClose} type="button">
              Concluir
            </Btn>
          ) : (
            <>
              <Btn variant="secondary" onClick={onClose} type="button" disabled={enviando}>
                Cancelar
              </Btn>
              <Btn
                onClick={handleImportar}
                loading={enviando}
                disabled={prontas.length === 0}
                type="button"
              >
                {prontas.length > 0
                  ? `Importar ${prontas.length} alimento${prontas.length === 1 ? '' : 's'}`
                  : 'Importar'}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Previa({ linhas }: { linhas: PlanilhaLida['linhas'] }) {
  return (
    <div>
      <div style={subtitulo}>Prévia</div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <table style={tabela}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Linha</th>
              <th style={{ ...th, textAlign: 'left' }}>Alimento</th>
              <th style={th}>kcal</th>
              <th style={th}>Carb. (g)</th>
              <th style={th}>Prot. (g)</th>
              <th style={th}>Lip. (g)</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ linha, item }) => (
              <tr key={linha}>
                <td style={{ ...td, textAlign: 'left' }}>{linha}</td>
                <td style={{ ...td, textAlign: 'left', color: 'var(--text)' }}>{item!.nome}</td>
                <td style={td}>{formatar(item!.kcal)}</td>
                <td style={td}>{formatar(item!.carboidratosG)}</td>
                <td style={td}>{formatar(item!.proteinasG)}</td>
                <td style={td}>{formatar(item!.lipidiosG)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResumoImportacao({ resultado, fonte }: { resultado: Resultado; fonte: string }) {
  const gravados = resultado.inseridos + resultado.atualizados
  return (
    <>
      <AlertBanner
        type="success"
        message={`${gravados} alimento${gravados === 1 ? '' : 's'} gravado${gravados === 1 ? '' : 's'} com a fonte "${fonte}".`}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge label={contar(resultado.inseridos, 'novo', 'novos')} tint="success" />
        <Badge label={contar(resultado.atualizados, 'atualizado', 'atualizados')} tint="primary" />
        {resultado.recusados.length > 0 && (
          <Badge
            label={contar(resultado.recusados.length, 'recusado', 'recusados') + ' pela API'}
            tint="warning"
          />
        )}
      </div>
      {resultado.recusados.length > 0 && (
        <ul style={lista}>
          {resultado.recusados.map((r) => (
            <li key={r.linha}>
              Linha {r.linha} · {r.nome}: {r.motivo}
            </li>
          ))}
        </ul>
      )}
      <div style={nota}>Os alimentos já aparecem na busca do aplicativo do paciente.</div>
    </>
  )
}

const contar = (n: number, singular: string, plural: string): string =>
  `${n} ${n === 1 ? singular : plural}`

const formatar = (valor: number): string =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',')

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(16, 24, 40, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  width: '100%', maxWidth: 720, maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-raised)',
}
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid var(--border)',
}
const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4,
}
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 26, lineHeight: 1, color: 'var(--text-muted)',
}
const body: React.CSSProperties = {
  padding: '20px 24px', overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 14,
}
const aviso: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 12px',
}
const link: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'var(--primary)', fontWeight: 600, fontSize: 12, textDecoration: 'underline',
}
const subtitulo: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 6,
}
const nota: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }
const lista: React.CSSProperties = {
  margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6,
}
const tabela: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 }
const th: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600,
  color: 'var(--text-muted)', background: 'var(--surface-alt)',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'right', color: 'var(--text-soft)',
  borderBottom: '1px solid var(--border)',
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '16px 24px', borderTop: '1px solid var(--border)',
}
