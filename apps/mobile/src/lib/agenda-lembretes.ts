import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ROTULO_TIPO, type Lembrete } from '@/lib/api/lembretes';

/**
 * Agendamento dos lembretes como notificações locais do aparelho.
 *
 * Por que local e não push do servidor: a API roda no plano gratuito do
 * Render, que derruba o serviço quando ele fica ocioso. Um lembrete de "medir
 * a glicemia às 7h" que dependesse do servidor simplesmente não tocaria de
 * madrugada. Aqui o servidor guarda a regra e o aparelho materializa em
 * notificações — funciona offline e com o servidor dormindo.
 */

/** Marca as notificações que são nossas, para não cancelar as dos outros. */
const ORIGEM = 'lembrete';

/**
 * O banco usa 0 = domingo ... 6 = sábado; o expo-notifications usa
 * 1 = domingo ... 7 = sábado. Sem esta conversão o lembrete de segunda toca
 * no domingo.
 */
const paraWeekdayDoExpo = (diaDoBanco: number): number => diaDoBanco + 1;

const partesDaHora = (hora: string): { hour: number; minute: number } => {
  const [h, m] = hora.split(':').map(Number);
  return { hour: h, minute: m };
};

const conteudo = (lembrete: Lembrete) => ({
  title: lembrete.titulo || ROTULO_TIPO[lembrete.tipo],
  body: lembrete.descricao || 'Toque para abrir o NutriCare.',
  data: { origem: ORIGEM, lembreteId: lembrete.id },
});

/** Um lembrete pode virar mais de uma notificação: uma por dia da semana. */
async function agendarUm(lembrete: Lembrete): Promise<number> {
  if (!lembrete.ativo || lembrete.concluido) return 0;

  if (lembrete.recorrente) {
    if (!lembrete.hora) return 0;
    const { hour, minute } = partesDaHora(lembrete.hora);

    // Lista vazia quer dizer "todos os dias": um gatilho diário resolve, em
    // vez de sete semanais.
    if (!lembrete.diasSemana.length) {
      await Notifications.scheduleNotificationAsync({
        content: conteudo(lembrete),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      return 1;
    }

    for (const dia of lembrete.diasSemana) {
      await Notifications.scheduleNotificationAsync({
        content: conteudo(lembrete),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: paraWeekdayDoExpo(dia),
          hour,
          minute,
        },
      });
    }
    return lembrete.diasSemana.length;
  }

  if (!lembrete.dataHora) return 0;
  const quando = new Date(lembrete.dataHora);
  // Lembrete avulso que já passou não tem o que agendar.
  if (quando.getTime() <= Date.now()) return 0;

  await Notifications.scheduleNotificationAsync({
    content: conteudo(lembrete),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando },
  });
  return 1;
}

/** Apaga só o que este app agendou, deixando qualquer outra notificação em paz. */
async function limparAgendados(): Promise<void> {
  const agendados = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    agendados
      .filter((n) => n.content.data?.origem === ORIGEM)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Reescreve a agenda inteira a partir da lista que veio da API.
 *
 * É mais simples e mais confiável do que tentar casar cada lembrete com a
 * notificação que já existia: editar a hora, desativar ou apagar um lembrete
 * passa a funcionar sem nenhum caso especial.
 *
 * Devolve quantas notificações ficaram agendadas.
 */
export async function sincronizarAgenda(lembretes: Lembrete[]): Promise<number> {
  // No navegador o agendamento não existe; a tela continua funcionando, só
  // não toca. É o caso do app rodando em modo web para conferência.
  if (Platform.OS === 'web') return 0;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const pedido = await Notifications.requestPermissionsAsync();
    if (pedido.status !== 'granted') return 0;
  }

  await limparAgendados();

  let total = 0;
  for (const lembrete of lembretes) {
    total += await agendarUm(lembrete);
  }
  return total;
}
