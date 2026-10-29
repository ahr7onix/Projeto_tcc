import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Modo alarme: escolha guardada só no aparelho, como o volume de um
 * despertador. No Android os lembretes vão para um canal próprio, com som de
 * 30 s (assets/sounds/alarme.wav) tocado no volume do alarme — por isso toca
 * mesmo com o celular no silencioso — e vibração longa. O Android para o som
 * quando a pessoa abre a barra de notificações, toca no aviso ou o descarta.
 *
 * O Android grava som e vibração do canal na primeira vez e ignora mudanças
 * depois. Para mudar qualquer um dos dois, crie um canal com outro id.
 */
const CHAVE_MODO_ALARME = 'lembretes.modoAlarme';
const CANAL_ALARME = 'lembretes-alarme';
const SOM_ALARME = 'alarme.wav';

export async function lerModoAlarme(): Promise<boolean> {
  return (await AsyncStorage.getItem(CHAVE_MODO_ALARME)) === '1';
}

export async function salvarModoAlarme(ligado: boolean): Promise<void> {
  await AsyncStorage.setItem(CHAVE_MODO_ALARME, ligado ? '1' : '0');
}

/** Devolve o canal a usar no agendamento; `undefined` é o canal de sempre. */
async function canalDoModo(alarme: boolean): Promise<string | undefined> {
  if (!alarme || Platform.OS !== 'android') return undefined;
  await Notifications.setNotificationChannelAsync(CANAL_ALARME, {
    name: 'Lembretes como alarme',
    importance: Notifications.AndroidImportance.MAX,
    sound: SOM_ALARME,
    // Dez ciclos de 0,8 s vibrando e 0,4 s parado: uns 12 segundos.
    vibrationPattern: [0, ...Array.from({ length: 10 }, () => [800, 400]).flat()],
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  return CANAL_ALARME;
}

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

const conteudo = (lembrete: Lembrete, canal: string | undefined) => ({
  title: lembrete.titulo || ROTULO_TIPO[lembrete.tipo],
  body: lembrete.descricao || 'Toque para abrir o NutriCare.',
  data: { origem: ORIGEM, lembreteId: lembrete.id },
  ...(canal ? { sound: SOM_ALARME } : {}),
});

/** Um lembrete pode virar mais de uma notificação: uma por dia da semana. */
async function agendarUm(lembrete: Lembrete, canal: string | undefined): Promise<number> {
  if (!lembrete.ativo || lembrete.concluido) return 0;

  if (lembrete.recorrente) {
    if (!lembrete.hora) return 0;
    const { hour, minute } = partesDaHora(lembrete.hora);

    // Lista vazia quer dizer "todos os dias": um gatilho diário resolve, em
    // vez de sete semanais.
    if (!lembrete.diasSemana.length) {
      await Notifications.scheduleNotificationAsync({
        content: conteudo(lembrete, canal),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: canal,
        },
      });
      return 1;
    }

    for (const dia of lembrete.diasSemana) {
      await Notifications.scheduleNotificationAsync({
        content: conteudo(lembrete, canal),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: paraWeekdayDoExpo(dia),
          hour,
          minute,
          channelId: canal,
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
    content: conteudo(lembrete, canal),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: quando,
      channelId: canal,
    },
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
  if (!(await temPermissao())) return 0;

  const canal = await canalDoModo(await lerModoAlarme());
  await limparAgendados();

  let total = 0;
  for (const lembrete of lembretes) {
    total += await agendarUm(lembrete, canal);
  }
  return total;
}

async function temPermissao(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.status === 'granted';
}

/**
 * Toca um lembrete de teste daqui a 5 segundos, no modo escolhido, para a
 * pessoa ouvir como vai ser sem esperar o horário. Devolve false se não deu
 * para agendar (navegador ou permissão negada).
 */
export async function testarLembrete(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!(await temPermissao())) return false;

  const canal = await canalDoModo(await lerModoAlarme());
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Teste de lembrete',
      body: 'É assim que os seus lembretes vão tocar.',
      ...(canal ? { sound: SOM_ALARME } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: canal,
    },
  });
  return true;
}
