import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { cancelarAgenda } from '@/lib/agenda-lembretes';
import { useAuthStore } from '@/stores/auth';

/**
 * Quando a sessão acaba (sair, excluir a conta ou renovação recusada), apaga o
 * que era da conta anterior: os lembretes agendados no aparelho, que seguiam
 * tocando sem ninguém logado para desligar, e o cache das consultas, que
 * mostrava os dados dela para quem entrasse em seguida.
 *
 * Só age na passagem de "com token" para "sem token". Na abertura do app o
 * token começa vazio até o `hydrate`, e limpar ali apagaria os lembretes de
 * quem continua logado.
 *
 * Fica fora da store de propósito: a store importar a agenda fecharia um
 * ciclo (agenda -> api -> store).
 */
export function useLimpezaAoSair() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const tinhaSessao = useRef(false);

  useEffect(() => {
    if (token) {
      tinhaSessao.current = true;
      return;
    }
    if (!tinhaSessao.current) return;
    tinhaSessao.current = false;
    queryClient.clear();
    cancelarAgenda().catch(() => {});
  }, [token, queryClient]);
}
