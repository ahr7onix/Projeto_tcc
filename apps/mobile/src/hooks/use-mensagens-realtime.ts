import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { assinarMensagens } from '@/lib/api/mensagens-stream';
import { abrirConversa, type Mensagem, type Thread } from '@/lib/api/mensagens';
import { useAuthStore } from '@/stores/auth';

/**
 * Conversa que está aberta na tela, se houver.
 *
 * O canal é assinado uma vez só, no layout das abas, e precisa saber disso
 * para marcar como lida a mensagem que chega com o usuário lendo — é o mesmo
 * papel que a `selecionadaRef` cumpre no painel web.
 */
let conversaEmFoco: string | null = null;

export function marcarConversaEmFoco(contraparteId: string | null): void {
  conversaEmFoco = contraparteId;
}

/**
 * Acrescenta a mensagem só se ela ainda não estiver na lista.
 *
 * Quem envia recebe a mensagem por dois caminhos — a resposta do POST e o eco
 * do canal em tempo real — e não há ordem garantida entre eles.
 */
function acrescentar(atual: Mensagem[], nova: Mensagem): Mensagem[] {
  return atual.some((m) => m.id === nova.id) ? atual : [...atual, nova];
}

/**
 * Liga o app ao canal SSE de mensagens: as telas passam a receber mensagem
 * nova sozinhas, sem o usuário puxar para atualizar.
 *
 * Fica montado no layout das abas, e não em cada tela, para haver uma única
 * conexão aberta — a lista de conversas e a conversa aberta leem o mesmo cache
 * do react-query.
 */
export function useMensagensRealtime(): void {
  const queryClient = useQueryClient();
  const token = useAuthStore((estado) => estado.token);

  useEffect(() => {
    if (!token) return;

    function recarregar() {
      queryClient.invalidateQueries({ queryKey: ['conversas'] });
      if (conversaEmFoco) {
        queryClient.invalidateQueries({ queryKey: ['conversa', conversaEmFoco] });
      }
    }

    const encerrar = assinarMensagens(
      (evento) => {
        // A conversa aberta ganha o balão na hora, sem esperar a rede.
        queryClient.setQueryData<Thread>(['conversa', evento.contraparteId], (atual) =>
          atual ? { ...atual, data: acrescentar(atual.data, evento.mensagem) } : atual,
        );

        // Com a conversa na tela, o GET marca como lida na API — assim o
        // contador não sobe enquanto o usuário está justamente lendo.
        if (conversaEmFoco === evento.contraparteId && !evento.mensagem.propria) {
          abrirConversa(evento.contraparteId).catch(() => undefined);
        }

        // A lista mostra última mensagem, horário e não lidas: precisa ser
        // recarregada mesmo com outra conversa aberta.
        queryClient.invalidateQueries({ queryKey: ['conversas'] });
      },
      // Enquanto o canal esteve fora do ar (queda de rede, app em segundo
      // plano) pode ter chegado mensagem: ao voltar, recarrega o que há.
      { aoReconectar: recarregar },
    );

    return encerrar;
  }, [queryClient, token]);
}
