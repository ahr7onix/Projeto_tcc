import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertBanner, Badge, Btn, EmptyState, PageHeader } from '../../components/ui'
import { extractError } from '../../lib/api'
import {
  abrirConversa,
  enviarMensagem,
  listarConversas,
  type Conversa,
  type Mensagem,
} from '../../lib/mensagens'

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MensagensPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selecionada, setSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [loadingConversas, setLoadingConversas] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

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
    if (!selecionada) return
    setLoadingThread(true)
    abrirConversa(selecionada.contraparteId)
      .then((thread) => {
        setMensagens(thread.data)
        setConversas((atual) =>
          atual.map((c) =>
            c.contraparteId === selecionada.contraparteId ? { ...c, naoLidas: 0 } : c,
          ),
        )
      })
      .catch((err) => setErro(extractError(err)))
      .finally(() => setLoadingThread(false))
  }, [selecionada])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleEnviar() {
    const conteudo = texto.trim()
    if (!conteudo || !selecionada) return

    try {
      setEnviando(true)
      setErro(null)
      const nova = await enviarMensagem(selecionada.contraparteId, conteudo)
      setMensagens((atual) => [...atual, nova])
      setTexto('')
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

  return (
    <div>
      <PageHeader
        eyebrow="Acompanhamento"
        title="Mensagens"
        subtitle="Converse com seus pacientes vinculados sobre dúvidas, orientações e ajustes no plano."
      />

      {erro && <AlertBanner message={erro} />}

      <div style={layout}>
        <div style={listaWrapper}>
          <div style={listaHeader}>Conversas</div>

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
          ) : (
            conversas.map((c, i) => {
              const ativa = selecionada?.contraparteId === c.contraparteId
              return (
                <button
                  key={c.contraparteId}
                  onClick={() => setSelecionada(c)}
                  style={{
                    ...itemConversa,
                    background: ativa ? 'var(--primary-soft)' : 'transparent',
                    borderBottom:
                      i < conversas.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={avatar}>{c.contraparteNome.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {c.contraparteNome}
                    </div>
                    <div style={previa}>{c.ultimaMensagem ?? 'Sem mensagens ainda'}</div>
                  </div>
                  {c.naoLidas > 0 && <Badge label={String(c.naoLidas)} tint="danger" />}
                </button>
              )
            })
          )}
        </div>

        <div style={chatWrapper}>
          {!selecionada ? (
            <div style={{ margin: 'auto', padding: 40 }}>
              <EmptyState
                icon={<ChatIcon />}
                title="Selecione uma conversa"
                message="Escolha um paciente na lista ao lado para ver o histórico."
              />
            </div>
          ) : (
            <>
              <div style={chatHeader}>
                <div style={avatar}>{selecionada.contraparteNome.charAt(0).toUpperCase()}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {selecionada.contraparteNome}
                </div>
              </div>

              <div style={chatCorpo}>
                {loadingThread ? (
                  <div style={vazio}>Carregando mensagens...</div>
                ) : mensagens.length === 0 ? (
                  <div style={vazio}>Nenhuma mensagem ainda. Envie a primeira.</div>
                ) : (
                  mensagens.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: m.propria ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          ...balao,
                          background: m.propria ? 'var(--primary)' : 'var(--surface-alt)',
                          color: m.propria ? '#fff' : 'var(--text)',
                        }}
                      >
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.conteudo}</div>
                        <div
                          style={{
                            fontSize: 10,
                            marginTop: 5,
                            opacity: 0.7,
                            textAlign: 'right',
                          }}
                        >
                          {formatarHora(m.criadoEm)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={fimRef} />
              </div>

              <div style={chatRodape}>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={handleTecla}
                  placeholder="Escreva sua mensagem... (Enter envia, Shift+Enter quebra linha)"
                  maxLength={2000}
                  style={campoTexto}
                />
                <Btn onClick={handleEnviar} loading={enviando} disabled={!texto.trim()}>
                  Enviar
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const layout: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(240px, 320px) 1fr',
  gap: 20,
  height: 'calc(100vh - 220px)',
  minHeight: 460,
}
const listaWrapper: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  overflowY: 'auto',
}
const listaHeader: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border)',
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--text)',
}
const itemConversa: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.12s',
}
const avatar: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: 'var(--primary-soft)',
  color: 'var(--primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 14,
  flexShrink: 0,
}
const previa: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  marginTop: 2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 200,
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
  padding: '14px 20px',
  borderBottom: '1px solid var(--border)',
}
const chatCorpo: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const balao: React.CSSProperties = {
  maxWidth: '70%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  lineHeight: 1.45,
}
const chatRodape: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-end',
  padding: 16,
  borderTop: '1px solid var(--border)',
}
const campoTexto: React.CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  resize: 'none',
  minHeight: 44,
  maxHeight: 120,
  fontFamily: 'inherit',
}
const vazio: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: 14,
}

function ChatIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
