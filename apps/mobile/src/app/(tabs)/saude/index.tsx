import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { GraficoLinha, type PontoGrafico } from '@/components/GraficoLinha';
import { ScreenContainer } from '@/components/ScreenContainer';
import { buscarEvolucao, listarAntropometria, rotuloRisco } from '@/lib/api/antropometria';
import { buscarResumoEmocional, ESTADOS } from '@/lib/api/emocional';
import { horaCurta, listarMedicamentos } from '@/lib/api/medicamentos';
import { listarRegistros } from '@/lib/api/registros';
import { colors, radius, spacing, typography } from '@/lib/theme';

const DIAS_GLICEMIA = 7;

/** Faixa geral de referência; o alvo de cada momento vem com o registro. */
const FAIXA_GLICEMIA = { min: 70, max: 180 };

const corDaSeveridade = (severidade: string | undefined): string | undefined => {
  if (severidade === 'critico') return colors.danger;
  if (severidade === 'atencao') return colors.warning;
  return undefined;
};

const emojiDoEstado = (estado: string): string =>
  ESTADOS.find((e) => e.valor === estado)?.emoji ?? '🙂';

/** A média vem na escala 1-5 da API; vira a carinha mais próxima. */
const emojiDaMedia = (media: number): string =>
  ESTADOS[Math.min(ESTADOS.length - 1, Math.max(0, 5 - Math.round(media)))].emoji;

/**
 * A data da medição não tem hora, e a API a serializa como meia-noite UTC.
 * Passar isso por `new Date` joga o dia para trás em qualquer fuso a oeste de
 * Greenwich: uma medida de 21/08 aparecia como 20/08 no Brasil. Por isso o dia
 * e o mês são lidos do próprio texto, sem converter para horário local.
 */
const dataCurta = (iso: string): string => {
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
};

export default function SaudeScreen() {
  const router = useRouter();

  const { data: medidas, isLoading: carregandoMedidas } = useQuery({
    queryKey: ['antropometria', 'ultimas'],
    queryFn: () => listarAntropometria(5),
  });

  const { data: evolucao } = useQuery({
    queryKey: ['antropometria-evolucao'],
    queryFn: buscarEvolucao,
  });

  const { data: registros } = useQuery({
    queryKey: ['registros', DIAS_GLICEMIA],
    queryFn: () => listarRegistros(DIAS_GLICEMIA),
  });

  const { data: emocional } = useQuery({
    queryKey: ['emocional-resumo', 30],
    queryFn: () => buscarResumoEmocional(30),
  });

  const { data: medicamentos, isLoading: carregandoMedicamentos } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: listarMedicamentos,
  });

  const ultima = medidas?.[0] ?? null;

  // O resumo da semana é calculado aqui a partir do histórico que a tela já
  // baixou; não existe endpoint só para essas quatro caixinhas.
  const glicemia = useMemo(() => {
    const valores = (registros?.data ?? [])
      .filter((r) => r.tipo === 'glicemia' && r.valor !== null)
      .map((r) => ({ valor: r.valor as number, alerta: r.alerta }));

    if (!valores.length) return null;

    const soma = valores.reduce((acc, v) => acc + v.valor, 0);
    const noAlvo = valores.filter((v) => v.alerta?.classificacao === 'normal').length;

    return {
      total: valores.length,
      media: Math.round(soma / valores.length),
      minima: Math.min(...valores.map((v) => v.valor)),
      maxima: Math.max(...valores.map((v) => v.valor)),
      percentualAlvo: Math.round((noAlvo / valores.length) * 100),
    };
  }, [registros]);

  // A API entrega do mais recente para o mais antigo; o gráfico lê ao contrário.
  const pontosGlicemia = useMemo<PontoGrafico[]>(
    () =>
      (registros?.data ?? [])
        .filter((r) => r.tipo === 'glicemia' && r.valor !== null)
        .slice(0, 30)
        .reverse()
        .map((r) => ({
          data: r.dataHora,
          valor: r.valor as number,
          cor: corDaSeveridade(r.alerta?.severidade),
        })),
    [registros],
  );

  return (
    <ScreenContainer
      eyebrow="Indicadores"
      title="Saúde"
      subtitle="Medidas, glicemia, bem-estar e medicamentos em um só lugar."
    >
      <View style={styles.acoes}>
        <Pressable style={styles.acao} onPress={() => router.push('/(tabs)/saude/medidas')}>
          <View style={styles.acaoIcone}>
            <Ionicons name="body-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.acaoTexto}>Registrar medidas</Text>
        </Pressable>
        <Pressable style={styles.acao} onPress={() => router.push('/(tabs)/saude/lembretes')}>
          <View style={styles.acaoIcone}>
            <Ionicons name="alarm-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.acaoTexto}>Lembretes</Text>
        </Pressable>
        <Pressable style={styles.acao} onPress={() => router.push('/(tabs)/saude/humor')}>
          <View style={styles.acaoIcone}>
            <Ionicons name="happy-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.acaoTexto}>Como estou hoje</Text>
        </Pressable>
      </View>

      <Card
        title="Últimas medidas"
        action={
          ultima ? <Text style={styles.cardAction}>{dataCurta(ultima.dataMedicao)}</Text> : undefined
        }
      >
        {carregandoMedidas ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !ultima ? (
          <EmptyState
            icon="body-outline"
            title="Nenhuma medida registrada"
            message="Registre seu peso e suas circunferências para acompanhar a evolução."
          />
        ) : (
          <>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Peso</Text>
                <Text style={styles.cellValor}>
                  {ultima.peso ?? '--'}
                  <Text style={styles.cellUnidade}> kg</Text>
                </Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>IMC</Text>
                <Text style={styles.cellValor}>{ultima.imc ?? '--'}</Text>
                {ultima.rotuloImc ? (
                  <Text style={styles.cellNota}>{ultima.rotuloImc}</Text>
                ) : null}
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Cintura</Text>
                <Text style={styles.cellValor}>
                  {ultima.circCintura ?? '--'}
                  <Text style={styles.cellUnidade}> cm</Text>
                </Text>
                {rotuloRisco(ultima.riscoCintura) ? (
                  <Text style={styles.cellNota}>{rotuloRisco(ultima.riscoCintura)}</Text>
                ) : null}
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Cintura/quadril</Text>
                <Text style={styles.cellValor}>{ultima.rcq ?? '--'}</Text>
                {rotuloRisco(ultima.riscoRcq) ? (
                  <Text style={styles.cellNota}>{rotuloRisco(ultima.riscoRcq)}</Text>
                ) : null}
              </View>
            </View>

            {(evolucao?.peso.length ?? 0) > 1 ? (
              <View style={styles.grafico}>
                <Text style={styles.graficoTitulo}>Evolução do peso (kg)</Text>
                <GraficoLinha pontos={evolucao?.peso ?? []} unidade=" kg" />
              </View>
            ) : null}

            {evolucao?.variacaoPeso !== null && evolucao?.variacaoPeso !== undefined ? (
              <View style={styles.variacao}>
                <Ionicons
                  name={evolucao.variacaoPeso > 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={colors.textSoft}
                />
                <Text style={styles.variacaoTexto}>
                  {evolucao.variacaoPeso > 0 ? '+' : ''}
                  {evolucao.variacaoPeso} kg desde a primeira pesagem
                </Text>
              </View>
            ) : null}
          </>
        )}
      </Card>

      <Card
        title="Resumo glicêmico"
        action={<Text style={styles.cardAction}>{DIAS_GLICEMIA} dias</Text>}
      >
        {!glicemia ? (
          <EmptyState
            icon="water-outline"
            title="Sem medições na semana"
            message="Registre sua glicemia na aba Registros para ver o resumo aqui."
          />
        ) : (
          <>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Média</Text>
                <Text style={styles.cellValor}>
                  {glicemia.media}
                  <Text style={styles.cellUnidade}> mg/dL</Text>
                </Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Mínima</Text>
                <Text style={styles.cellValor}>
                  {glicemia.minima}
                  <Text style={styles.cellUnidade}> mg/dL</Text>
                </Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Máxima</Text>
                <Text style={styles.cellValor}>
                  {glicemia.maxima}
                  <Text style={styles.cellUnidade}> mg/dL</Text>
                </Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Na faixa</Text>
                <Text style={styles.cellValor}>
                  {glicemia.percentualAlvo}
                  <Text style={styles.cellUnidade}> %</Text>
                </Text>
              </View>
            </View>
            {pontosGlicemia.length > 1 ? (
              <View style={styles.grafico}>
                <Text style={styles.graficoTitulo}>Evolução (mg/dL)</Text>
                <GraficoLinha
                  pontos={pontosGlicemia}
                  unidade=" mg/dL"
                  faixa={FAIXA_GLICEMIA}
                />
                <Text style={styles.graficoNota}>
                  A faixa verde é a referência geral, de {FAIXA_GLICEMIA.min} a{' '}
                  {FAIXA_GLICEMIA.max} mg/dL. Pontos em amarelo ou vermelho ficaram fora do
                  alvo do seu momento.
                </Text>
              </View>
            ) : null}

            <Text style={styles.rodapeCard}>
              {glicemia.total} {glicemia.total === 1 ? 'medição' : 'medições'} nos últimos{' '}
              {DIAS_GLICEMIA} dias.
            </Text>
          </>
        )}
      </Card>

      <Card title="Bem-estar" action={<Text style={styles.cardAction}>30 dias</Text>}>
        {!emocional || emocional.total === 0 ? (
          <EmptyState
            icon="happy-outline"
            title="Nenhum registro ainda"
            message="Contar como você se sente ajuda a nutricionista a entender seus resultados."
          />
        ) : (
          <>
            <View style={styles.humorTopo}>
              <Text style={styles.humorEmoji}>
                {emocional.mediaEscala ? emojiDaMedia(emocional.mediaEscala) : '🙂'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.humorTitulo}>
                  {emocional.total} {emocional.total === 1 ? 'registro' : 'registros'} no mês
                </Text>
                {emocional.porEstado.length ? (
                  <Text style={styles.humorNota}>
                    Mais frequente: {emojiDoEstado(emocional.porEstado[0].estado)}{' '}
                    {emocional.porEstado[0].rotulo}
                  </Text>
                ) : null}
              </View>
            </View>

            {emocional.fatoresFrequentes.length ? (
              <View style={styles.fatores}>
                {emocional.fatoresFrequentes.slice(0, 4).map((f) => (
                  <View key={f.fator} style={styles.fator}>
                    <Text style={styles.fatorTexto}>
                      {f.fator} · {f.vezes}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </Card>

      <Card
        title="Medicamentos"
        action={
          <Pressable onPress={() => router.push('/(tabs)/saude/medicamentos')}>
            <Text style={styles.cardAction}>Gerenciar</Text>
          </Pressable>
        }
      >
        {carregandoMedicamentos ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !medicamentos?.length ? (
          <EmptyState
            icon="medkit-outline"
            title="Nenhum medicamento ativo"
            message="Adicione os medicamentos que você usa para manter seu acompanhamento em dia."
          />
        ) : (
          medicamentos.map((m, i) => (
            <View key={m.id} style={[styles.linha, i > 0 && styles.linhaDivisoria]}>
              <View style={styles.remedioIcone}>
                <Ionicons name="medkit-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.remedioNome}>{m.nome}</Text>
                <Text style={styles.remedioNota}>
                  {m.dosagem} · {m.frequencia}
                </Text>
              </View>
              <Text style={styles.remedioHora}>{horaCurta(m.horarioInicial)}</Text>
            </View>
          ))
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  acoes: { flexDirection: 'row', gap: spacing.sm },
  acao: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  acaoIcone: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acaoTexto: { fontSize: 12, fontWeight: '700', color: colors.text },

  center: { alignItems: 'center', paddingVertical: spacing.lg },
  cardAction: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  cellLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  cellValor: { ...typography.h2, color: colors.text },
  cellUnidade: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  cellNota: { fontSize: 11, color: colors.textSoft },

  variacao: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  variacaoTexto: { ...typography.caption, color: colors.textSoft },
  rodapeCard: { ...typography.caption, color: colors.textMuted },

  grafico: { marginTop: spacing.md, gap: spacing.xs },
  graficoTitulo: { ...typography.caption, fontWeight: '600', color: colors.textSoft },
  graficoNota: { ...typography.caption, fontSize: 12, color: colors.textMuted },

  humorTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  humorEmoji: { fontSize: 34 },
  humorTitulo: { ...typography.h3, color: colors.text },
  humorNota: { ...typography.caption, color: colors.textSoft, marginTop: 2 },
  fatores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fator: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  fatorTexto: { fontSize: 12, fontWeight: '600', color: colors.textSoft },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  linhaDivisoria: { borderTopWidth: 1, borderTopColor: colors.border },
  remedioIcone: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remedioNome: { ...typography.body, color: colors.text, fontWeight: '600' },
  remedioNota: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  remedioHora: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
