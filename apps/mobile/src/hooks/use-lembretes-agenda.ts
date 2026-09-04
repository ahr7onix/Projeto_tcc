import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { sincronizarAgenda } from '@/lib/agenda-lembretes';
import { listarLembretes } from '@/lib/api/lembretes';
import { useAuthStore } from '@/stores/auth';

/**
 * Mantém as notificações do aparelho iguais à lista de lembretes do servidor.
 *
 * Fica na raiz do app, e não na tela de lembretes: quem programou "medir a
 * glicemia às 7h" espera que toque mesmo sem abrir aquela tela de novo. Como a
 * consulta usa a mesma chave `['lembretes']` da tela, qualquer alteração lá
 * invalida esta e reagenda tudo sozinha.
 */
export function useLembretesAgenda() {
  const token = useAuthStore((state) => state.token);

  const { data } = useQuery({
    queryKey: ['lembretes'],
    queryFn: () => listarLembretes(),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!data) return;
    // Agenda é reforço: falhar aqui não pode derrubar a tela.
    sincronizarAgenda(data).catch(() => {});
  }, [data]);
}
