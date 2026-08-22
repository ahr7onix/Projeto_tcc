import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { buscarUltimaGlicemia } from '@/lib/api/registros';

const LIMITE_MINUTOS_LEITURA_RECENTE = 4 * 60;
const CHAVE_ULTIMO_ALERTADO = 'glicemia.ultimoAlertado';

const TITULO: Record<'critico' | 'atencao', string> = {
  critico: 'Atenção: glicemia fora da faixa segura',
  atencao: 'Sua glicemia está fora da meta',
};

/**
 * Notificação local (sem depender de push do servidor) quando a última
 * leitura de glicemia registrada está em atenção/crítico e ainda não foi
 * avisada. Reaproveita a mesma consulta do GlicemicStatusBanner via
 * react-query (cache compartilhado, não duplica a chamada de rede).
 */
export function useGlycemicWatch() {
  const { data } = useQuery({
    queryKey: ['glicemia-ultimo'],
    queryFn: buscarUltimaGlicemia,
    refetchInterval: 5 * 60 * 1000,
  });

  const verificando = useRef(false);

  useEffect(() => {
    const registro = data?.registro;
    if (!registro) return;
    if (registro.minutosDesdeRegistro > LIMITE_MINUTOS_LEITURA_RECENTE) return;
    if (registro.avaliacao.severidade === 'normal') return;
    if (verificando.current) return;

    verificando.current = true;
    (async () => {
      try {
        const jaAlertado = await AsyncStorage.getItem(CHAVE_ULTIMO_ALERTADO);
        if (jaAlertado === registro.dataHora) return;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: TITULO[registro.avaliacao.severidade as 'critico' | 'atencao'],
            body: `${registro.valor} mg/dL — ${registro.avaliacao.mensagem}`,
          },
          trigger: null,
        });
        await AsyncStorage.setItem(CHAVE_ULTIMO_ALERTADO, registro.dataHora);
      } catch {
        // Notificação local é um reforço, não algo crítico o bastante para travar a tela.
      } finally {
        verificando.current = false;
      }
    })();
  }, [data]);
}
