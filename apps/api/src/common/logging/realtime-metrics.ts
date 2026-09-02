/**
 * Contador em memória das conexões SSE abertas em `/mensagens/stream`.
 *
 * Só números — quem está conectado, com quem conversa e o que escreveu não
 * entram aqui. Serve para o `/health` dizer se o canal em tempo real está de
 * pé sem precisar abrir uma conexão de teste.
 */
let abertas = 0;
let totalDesdeOInicio = 0;
let ultimaConexao: string | null = null;

export const realtime = {
  conectou(): void {
    abertas += 1;
    totalDesdeOInicio += 1;
    ultimaConexao = new Date().toISOString();
  },
  desconectou(): void {
    abertas = Math.max(0, abertas - 1);
  },
  resumo() {
    return { conexoesAbertas: abertas, conexoesTotais: totalDesdeOInicio, ultimaConexao };
  },
};
