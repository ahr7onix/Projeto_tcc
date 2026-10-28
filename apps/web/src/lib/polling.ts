/**
 * Chama `carregar` a cada `intervaloMs`, mas só com a aba visível e nunca com a
 * rodada anterior ainda no ar. Quando a aba volta a aparecer, recarrega na hora.
 * Devolve a função que para tudo.
 *
 * Com `setInterval` puro, cada aba aberta (até escondida) seguia perguntando à
 * API, e quando o servidor demorava mais que o intervalo as rodadas se
 * empilhavam e o deixavam mais lento ainda (docs/ANALISE_DESEMPENHO.md, 2.2 e 2.4).
 */
export function repetirEnquantoVisivel(carregar: () => Promise<unknown>, intervaloMs: number): () => void {
  let emAndamento = false
  const rodar = async () => {
    if (emAndamento || document.visibilityState === 'hidden') return
    emAndamento = true
    try {
      await carregar()
    } finally {
      emAndamento = false
    }
  }
  const aoMudarVisibilidade = () => {
    if (document.visibilityState === 'visible') void rodar()
  }
  const timer = window.setInterval(rodar, intervaloMs)
  document.addEventListener('visibilitychange', aoMudarVisibilidade)
  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
  }
}
