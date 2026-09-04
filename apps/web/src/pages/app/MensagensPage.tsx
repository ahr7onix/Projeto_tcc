import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertBanner, EmptyState, PageHeader } from '../../components/ui'
import { extractError } from '../../lib/api'
import {
  abrirConversa,
  enviarMensagem,
  listarConversas,
  sinalizarDigitando,
  type Conversa,
  type ContrapartePerfil,
  type Mensagem,
} from '../../lib/mensagens'
import { assinarMensagens } from '../../lib/mensagens-stream'

/* ─── Formatação de data e hora ─── */

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Horário da última mensagem, do jeito que os apps de conversa mostram. */
function tempoLista(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const agora = new Date()
  const diffMin = Math.floor((agora.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin} min`
  if (mesmoDia(d, agora)) return horaCurta(iso)
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (mesmoDia(d, ontem)) return 'Ontem'
  if (agora.getTime() - d.getTime() < 7 * 86400000) {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Rótulo do separador de dia dentro da conversa. */
function rotuloDia(d: Date): string {
  const agora = new Date()
  if (mesmoDia(d, agora)) return 'Hoje'
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (mesmoDia(d, ontem)) return 'Ontem'
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === agora.getFullYear()
      ? { day: '2-digit', month: 'long' }
      : { day: '2-digit', month: 'long', year: 'numeric' }
  return d.toLocaleDateString('pt-BR', opts)
}

function idadeDe(iso: string | null): number | null {
  if (!iso) return null
  const n = new Date(iso)
  const h = new Date()
  let i = h.getFullYear() - n.getFullYear()
  const m = h.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) i -= 1
  return i >= 0 && i < 130 ? i : null
}

const ROTULO_DIABETES: Record<string, string> = {
  tipo1: 'DM tipo 1',
  tipo2: 'DM tipo 2',
  gestacional: 'DM gestacional',
  pre: 'Pré-diabetes',
  outro: 'Diabetes',
}

/* ─── Avatar ─── */

const CORES_AVATAR = [
  { bg: '#E7F0F9', fg: '#005EB8' },
  { bg: '#E6F4EF', fg: '#047857' },
  { bg: '#FBF1E3', fg: '#B45309' },
  { bg: '#F3E8F9', fg: '#7E3AA8' },
  { bg: '#FCEBEA', fg: '#B42318' },
  { bg: '#E5F1F1', fg: '#0E7490' },
]

function corAvatar(nome: string) {
  let h = 0
  for (let i = 0; i < nome.length; i += 1) h = (h * 31 + nome.charCodeAt(i)) >>> 0
  return CORES_AVATAR[h % CORES_AVATAR.length]
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase()
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase()
}

function Avatar({ nome, size = 40 }: { nome: string; size?: number }) {
  const c = corAvatar(nome)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: c.bg,
        color: c.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.36,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {iniciais(nome)}
    </div>
  )
}

/* ─── Ícones ─── */

function Ticks({ lida }: { lida: boolean }) {
  return (
    <svg
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 5.8 3.9 8.7 9 2.6" />
      {lida && <path d="M6.4 8.7 6.9 8.2 12 2.1" />}
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span className="msg-typing-dot" />
      <span className="msg-typing-dot" />
      <span className="msg-typing-dot" />
    </span>
  )
}

const EMOJIS = ['😊', '😀', '😅', '🙌', '👍', '👎', '🙏', '❤️', '🎉', '💪', '👏', '🤔', '😉', '😴', '🥗', '🍎', '🩸', '⏰', '✅', '⚠️', '📈', '📉']

/* ─── Página ─── */

/** Acrescenta a mensagem só se ela ainda não estiver na lista. */
function acrescentar(atual: Mensagem[], nova: Mensagem): Mensagem[] {
  return atual.some((m) => m.id === nova.id) ? atual : [...atual, nova]
}

const TYPING_THROTTLE = 2500

export default function MensagensPage() {
  const { contraparteId: paramId } = useParams<{ contraparteId?: string }>()

  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [selNome, setSelNome] = useState('')
  const [threadNome, setThreadNome] = useState('')
  const [perfil, setPerfil] = useState<ContrapartePerfil | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas'>('todas')
  const [loadingConversas, setLoadingConversas] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [contraparteDigitando, setContraparteDigitando] = useState(false)
  const [emojiAberto, setEmojiAberto] = useState(false)

  const fimRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selRef = useRef<string | null>(null)
  selRef.current = selId
  const digitandoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultimoSinal = useRef(0)

  const carregarConversas = useCallback(async () => {
    try {
      const lista = await listarConversas()
      setConversas(lista)
      return lista
    } catch (err) {
      setErro(extractError(err))
      return []
    } finally {
      setLoadingConversas(false)
    }
  }, [])

  useEffect(() => {
    carregarConversas()
  }, [carregarConversas])

  useEffect(() => {
    if (paramId) setSelId(paramId)
  }, [paramId])

  // Abre a conversa selecionada: histórico + ficha do paciente, e zera o
  // contador de não lidas na lista da esquerda.
  //
  // A guarda `cancelado` não é zelo: trocar de conversa antes de a primeira
  // responder deixava duas requisições no ar, e quem chegasse por último
  // vencia. Como o painel inteiro (mensagens, nome, ficha) vem da resposta e o
  // envio usa `selId`, dava para ler a conversa de um paciente com outro
  // selecionado — e a resposta digitada ali ia para o paciente errado.
  useEffect(() => {
    if (!selId) return
    let cancelado = false
    setLoadingThread(true)
    setContraparteDigitando(false)
    // O erro da conversa anterior não é mais sobre esta.
    setErro(null)
    abrirConversa(selId)
      .then((thread) => {
        if (cancelado) return
        setMensagens(thread.data)
        setThreadNome(thread.contraparte.nome)
        setPerfil(thread.contraparte.perfil ?? null)
        setConversas((atual) =>
          atual.map((c) =>
            c.contraparteId === selId ? { ...c, naoLidas: 0 } : c,
          ),
        )
      })
      .catch((err) => {
        if (!cancelado) setErro(extractError(err))
      })
      .finally(() => {
        if (!cancelado) setLoadingThread(false)
      })
    return () => {
      cancelado = true
    }
  }, [selId])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, contraparteDigitando])

  // Canal em tempo real: mensagem nova, "digitando" e "lida" chegam sozinhos.
  useEffect(() => {
    const encerrar = assinarMensagens(
      (evento) => {
        const aberta = selRef.current
        if (aberta && aberta === evento.contraparteId) {
          setMensagens((atual) => acrescentar(atual, evento.mensagem))
          setContraparteDigitando(false)
          if (!evento.mensagem.propria) {
            abrirConversa(aberta).catch(() => undefined)
          }
        }
        carregarConversas()
      },
      {
        aoDigitar: (evento) => {
          if (selRef.current !== evento.contraparteId) return
          if (digitandoTimeout.current) clearTimeout(digitandoTimeout.current)
          setContraparteDigitando(evento.digitando)
          if (evento.digitando) {
            digitandoTimeout.current = setTimeout(
              () => setContraparteDigitando(false),
              5000,
            )
          }
        },
        aoLer: (evento) => {
          if (selRef.current !== evento.contraparteId) return
          setMensagens((atual) =>
            atual.map((m) => (m.propria && !m.lida ? { ...m, lida: true } : m)),
          )
        },
      },
    )
    return () => {
      encerrar()
      if (digitandoTimeout.current) clearTimeout(digitandoTimeout.current)
    }
  }, [carregarConversas])

  function ajustarAltura() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  function avisarDigitando() {
    if (!selId) return
    const agora = Date.now()
    if (agora - ultimoSinal.current < TYPING_THROTTLE) return
    ultimoSinal.current = agora
    sinalizarDigitando(selId, true)
  }

  function pararDigitando() {
    ultimoSinal.current = 0
    if (selId) sinalizarDigitando(selId, false)
  }

  function handleTextoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value)
    ajustarAltura()
    if (e.target.value.trim()) avisarDigitando()
    else pararDigitando()
  }

  async function handleEnviar() {
    const conteudo = texto.trim()
    if (!conteudo || !selId || enviando) return
    try {
      setEnviando(true)
      setErro(null)
      const nova = await enviarMensagem(selId, conteudo)
      setMensagens((atual) => acrescentar(atual, nova))
      setTexto('')
      setEmojiAberto(false)
      requestAnimationFrame(ajustarAltura)
      pararDigitando()
      carregarConversas()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setEnviando(false)
    }
  }

  function handleTecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function inserirEmoji(emoji: string) {
    setTexto((t) => t + emoji)
    textareaRef.current?.focus()
    requestAnimationFrame(ajustarAltura)
  }

  function selecionar(c: Conversa) {
    if (c.contraparteId === selId) return
    setSelId(c.contraparteId)
    setSelNome(c.contraparteNome)
    setThreadNome('')
    setPerfil(null)
    setMensagens([])
    setTexto('')
    setEmojiAberto(false)
    ultimoSinal.current = 0
  }

  const conversasFiltradas = useMemo(() => {
    const alvo = busca.trim().toLowerCase()
    return conversas.filter((c) => {
      if (filtro === 'nao_lidas' && c.naoLidas === 0) return false
      if (!alvo) return true
      return (
        c.contraparteNome.toLowerCase().includes(alvo) ||
        (c.ultimaMensagem ?? '').toLowerCase().includes(alvo)
      )
    })
  }, [conversas, busca, filtro])

  const totalNaoLidas = useMemo(
    () => conversas.reduce((s, c) => s + c.naoLidas, 0),
    [conversas],
  )

  const grupos = useMemo(() => {
    const out: { chave: string; rotulo: string; itens: Mensagem[] }[] = []
    for (const m of mensagens) {
      const d = new Date(m.criadoEm)
      const chave = d.toDateString()
      const ultimo = out[out.length - 1]
      if (ultimo && ultimo.chave === chave) ultimo.itens.push(m)
      else out.push({ chave, rotulo: rotuloDia(d), itens: [m] })
    }
    return out
  }, [mensagens])

  const nomeAtual =
    threadNome ||
    conversas.find((c) => c.contraparteId === selId)?.contraparteNome ||
    selNome ||
    'Conversa'

  const infoPaciente: string[] = []
  if (perfil) {
    const id = idadeDe(perfil.dataNascimento)
    if (id != null) infoPaciente.push(`${id} anos`)
    if (perfil.tipoDiabetes) {
      infoPaciente.push(ROTULO_DIABETES[perfil.tipoDiabetes] ?? perfil.tipoDiabetes)
    }
    if (perfil.peso != null) infoPaciente.push(`${perfil.peso} kg`)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Acompanhamento"
        title="Mensagens"
        subtitle="Converse com seus pacientes vinculados sobre dúvidas, orientações e ajustes no plano."
      />

      {erro && <AlertBanner message={erro} />}

      <div
        className="msg-shell"
        data-aberta={selId ? 'true' : 'false'}
        style={layout}
      >
        {/* ─── Lista de conversas ─── */}
        <aside className="msg-lista" style={listaWrapper}>
          <div style={listaTopo}>
            <div style={{ position: 'relative' }}>
              <span style={buscaIcone}>
                <SearchIcon />
              </span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conversa"
                style={buscaInput}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <FiltroChip
                ativo={filtro === 'todas'}
                onClick={() => setFiltro('todas')}
                label="Todas"
              />
              <FiltroChip
                ativo={filtro === 'nao_lidas'}
                onClick={() => setFiltro('nao_lidas')}
                label={totalNaoLidas > 0 ? `Não lidas · ${totalNaoLidas}` : 'Não lidas'}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingConversas ? (
              <div style={vazio}>Carregando...</div>
            ) : conversas.length === 0 ? (
              <div style={{ padding: '8px 16px 20px' }}>
                <EmptyState
                  icon={<ChatIcon />}
                  title="Nenhuma conversa"
                  message="Vincule pacientes para começar a trocar mensagens."
                />
              </div>
            ) : conversasFiltradas.length === 0 ? (
              <div style={vazio}>Nada encontrado.</div>
            ) : (
              conversasFiltradas.map((c) => {
                const ativa = selId === c.contraparteId
                return (
                  <button
                    key={c.contraparteId}
                    onClick={() => selecionar(c)}
                    style={{
                      ...itemConversa,
                      background: ativa ? 'var(--primary-soft)' : 'transparent',
                    }}
                  >
                    <Avatar nome={c.contraparteNome} size={44} />
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={itemLinha1}>
                        <span style={itemNome}>{c.contraparteNome}</span>
                        <span style={itemHora}>{tempoLista(c.ultimaEm)}</span>
                      </div>
                      <div style={itemLinha2}>
                        <span
                          style={{
                            ...previa,
                            fontWeight: c.naoLidas > 0 ? 600 : 400,
                            color:
                              c.naoLidas > 0
                                ? 'var(--text)'
                                : 'var(--text-muted)',
                          }}
                        >
                          {c.ultimaMensagem ?? 'Sem mensagens ainda'}
                        </span>
                        {c.naoLidas > 0 && (
                          <span style={pilula}>
                            {c.naoLidas > 99 ? '99+' : c.naoLidas}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* ─── Conversa aberta ─── */}
        <section className="msg-chat" style={chatWrapper}>
          {!selId ? (
            <div style={{ margin: 'auto', padding: 40 }}>
              <EmptyState
                icon={<ChatIcon />}
                title="Selecione uma conversa"
                message="Escolha um paciente na lista ao lado para ver o histórico."
              />
            </div>
          ) : (
            <>
              <header style={chatHeader}>
                <button
                  className="msg-voltar"
                  onClick={() => setSelId(null)}
                  style={voltarBtn}
                  aria-label="Voltar para a lista"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <Avatar nome={nomeAtual} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={chatNome}>{nomeAtual}</div>
                  <div style={chatSub}>
                    {contraparteDigitando ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--primary)',
                        }}
                      >
                        <TypingDots /> digitando…
                      </span>
                    ) : infoPaciente.length > 0 ? (
                      infoPaciente.join('  ·  ')
                    ) : (
                      'Paciente vinculado'
                    )}
                  </div>
                </div>
              </header>

              <div style={chatCorpo}>
                {loadingThread ? (
                  <div style={vazio}>Carregando mensagens...</div>
                ) : mensagens.length === 0 ? (
                  <div style={vazio}>Nenhuma mensagem ainda. Envie a primeira.</div>
                ) : (
                  grupos.map((g) => (
                    <div key={g.chave} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={separadorData}>
                        <span style={separadorPill}>{g.rotulo}</span>
                      </div>
                      {g.itens.map((m, i) => {
                        const ant = g.itens[i - 1]
                        const agrupada =
                          !!ant &&
                          ant.propria === m.propria &&
                          new Date(m.criadoEm).getTime() -
                            new Date(ant.criadoEm).getTime() <
                            5 * 60000
                        return <Balao key={m.id} m={m} agrupada={agrupada} />
                      })}
                    </div>
                  ))
                )}
                <div ref={fimRef} />
              </div>

              <div style={chatRodape}>
                {emojiAberto && (
                  <>
                    <button
                      type="button"
                      aria-label="Fechar emojis"
                      onClick={() => setEmojiAberto(false)}
                      style={emojiBackdrop}
                    />
                    <div style={emojiPop}>
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => inserirEmoji(e)}
                          style={emojiBtn}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setEmojiAberto((v) => !v)}
                  style={iconBtn}
                  aria-label="Emojis"
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>😊</span>
                </button>
                <textarea
                  ref={textareaRef}
                  value={texto}
                  onChange={handleTextoChange}
                  onKeyDown={handleTecla}
                  onBlur={pararDigitando}
                  placeholder="Escreva sua mensagem…"
                  rows={1}
                  maxLength={2000}
                  style={campoTexto}
                />
                <button
                  type="button"
                  onClick={handleEnviar}
                  disabled={!texto.trim() || enviando}
                  style={{
                    ...sendBtn,
                    opacity: !texto.trim() || enviando ? 0.5 : 1,
                    cursor: !texto.trim() || enviando ? 'not-allowed' : 'pointer',
                  }}
                  aria-label="Enviar mensagem"
                >
                  <SendIcon />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/* ─── Subcomponentes ─── */

function FiltroChip({
  ativo,
  onClick,
  label,
}: {
  ativo: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 11px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 12,
        fontWeight: 500,
        border: `1px solid ${ativo ? 'var(--primary)' : 'var(--border-strong)'}`,
        background: ativo ? 'var(--primary-soft)' : 'var(--surface)',
        color: ativo ? 'var(--primary)' : 'var(--text-soft)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function Balao({ m, agrupada }: { m: Mensagem; agrupada: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: m.propria ? 'flex-end' : 'flex-start',
        marginTop: agrupada ? 0 : 8,
      }}
    >
      <div
        className="msg-bolha"
        style={{
          ...balao,
          background: m.propria ? 'var(--primary)' : 'var(--surface-alt)',
          color: m.propria ? 'var(--text-inverse)' : 'var(--text)',
          borderBottomRightRadius: m.propria ? 4 : 'var(--radius-md)',
          borderBottomLeftRadius: m.propria ? 'var(--radius-md)' : 4,
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {m.conteudo}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
            marginTop: 4,
            fontSize: 10,
            opacity: 0.75,
          }}
        >
          <span>{horaCurta(m.criadoEm)}</span>
          {m.propria && (
            <span
              style={{
                display: 'flex',
                color: m.lida ? '#9AD0FF' : 'currentColor',
              }}
              title={m.lida ? 'Lida' : 'Enviada'}
            >
              <Ticks lida={m.lida} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Estilos ─── */

const layout: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 340px) 1fr',
  gap: 16,
  height: 'calc(100vh - 210px)',
  minHeight: 480,
}
const listaWrapper: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}
const listaTopo: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 12,
  borderBottom: '1px solid var(--border)',
}
const buscaIcone: React.CSSProperties = {
  position: 'absolute',
  left: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  display: 'flex',
  pointerEvents: 'none',
}
const buscaInput: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px 8px 32px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  outline: 'none',
}
const itemConversa: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '11px 14px',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer',
  transition: 'background 0.12s',
}
const itemLinha1: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
}
const itemNome: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const itemHora: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  flexShrink: 0,
}
const itemLinha2: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginTop: 2,
}
const previa: React.CSSProperties = {
  fontSize: 12.5,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flex: 1,
  minWidth: 0,
}
const pilula: React.CSSProperties = {
  flexShrink: 0,
  minWidth: 18,
  height: 18,
  padding: '0 5px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--primary)',
  color: 'var(--text-inverse)',
  fontSize: 10.5,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const chatWrapper: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}
const chatHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 18px',
  borderBottom: '1px solid var(--border)',
  flexShrink: 0,
}
const chatNome: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const chatSub: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  marginTop: 1,
  minHeight: 16,
}
const chatCorpo: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
}
const separadorData: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  margin: '12px 0 8px',
}
const separadorPill: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-soft)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-pill)',
  padding: '3px 12px',
  textTransform: 'capitalize',
}
const balao: React.CSSProperties = {
  maxWidth: '72%',
  padding: '9px 13px',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  lineHeight: 1.45,
  boxShadow: 'var(--shadow-card)',
}
const chatRodape: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
  padding: 12,
  borderTop: '1px solid var(--border)',
  flexShrink: 0,
}
const campoTexto: React.CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  resize: 'none',
  minHeight: 42,
  maxHeight: 140,
  fontFamily: 'inherit',
  lineHeight: 1.4,
}
const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
const sendBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  border: '1px solid var(--primary)',
  background: 'var(--primary)',
  color: 'var(--text-inverse)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.12s',
}
const voltarBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  marginLeft: -4,
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-soft)',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
const emojiBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  border: 'none',
  zIndex: 10,
  cursor: 'default',
}
const emojiPop: React.CSSProperties = {
  position: 'absolute',
  bottom: 60,
  left: 12,
  zIndex: 11,
  width: 248,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 2,
  padding: 8,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-raised)',
}
const emojiBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  border: 'none',
  background: 'transparent',
  borderRadius: 'var(--radius-sm)',
  fontSize: 19,
  cursor: 'pointer',
}
const vazio: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: 14,
  margin: 'auto',
}
