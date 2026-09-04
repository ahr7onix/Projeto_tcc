import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import {
  buscarAlimento,
  descreverPorcao,
  listarAlimentos,
  type Alimento,
} from '@/lib/api/alimentos';
import { createRefeicao } from '@/lib/api/registros';
import { colors, radius, spacing, typography } from '@/lib/theme';

function horaAgora(): string {
  const agora = new Date();
  return `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
}

/**
 * Uma casa decimal só quando o número precisa: 28 e 28,4.
 *
 * O arredondamento é o mesmo do servidor (`arredondar` em common/nutricao):
 * com `toFixed` a prévia mostrava 24,9 e o registro salvo ficava 25, porque
 * 24,95 em ponto flutuante é 24,9499... e as duas funções decidiam diferente.
 */
const formatar = (valor: number): string => {
  const arredondado = Math.round(valor * 10) / 10;
  return Number.isInteger(arredondado)
    ? String(arredondado)
    : String(arredondado).replace('.', ',');
};

const numero = (texto: string): number => Number(texto.replace(',', '.'));

type Tipo = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'ceia';

const tipos: { key: Tipo; label: string }[] = [
  { key: 'cafe', label: 'Café da manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche', label: 'Lanche' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'ceia', label: 'Ceia' },
];

export default function RegistrarRefeicaoScreen() {
  // A tela de consulta de alimentos manda o paciente para cá já com a escolha
  // feita; sem esses parâmetros, o registro começa em branco.
  const params = useLocalSearchParams<{ alimentoId?: string; quantidadeG?: string }>();

  const [tipo, setTipo] = useState<Tipo>('almoco');
  const [descricao, setDescricao] = useState('');
  const [carboidratos, setCarboidratos] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const [alimento, setAlimento] = useState<Alimento | null>(null);
  const [quantidade, setQuantidade] = useState(params.quantidadeG ?? '');
  const [buscandoAlimento, setBuscandoAlimento] = useState(false);
  const [busca, setBusca] = useState('');

  const { data: alimentoInicial } = useQuery({
    queryKey: ['alimento', params.alimentoId],
    queryFn: () => buscarAlimento(params.alimentoId as string),
    enabled: Boolean(params.alimentoId),
  });

  useEffect(() => {
    if (alimentoInicial) setAlimento(alimentoInicial);
  }, [alimentoInicial]);

  const { data: resultados, isFetching } = useQuery({
    queryKey: ['alimentos', busca],
    queryFn: () => listarAlimentos({ busca, limite: 15 }),
    enabled: buscandoAlimento,
  });

  const quantidadeG = numero(quantidade) > 0 ? numero(quantidade) : null;

  // Prévia do que vai ser gravado. Quem calcula o valor guardado é a API, com
  // a mesma regra de três — aqui é só para o paciente ver enquanto digita.
  const previa = useMemo(() => {
    if (!alimento || !quantidadeG) return null;
    const proporcao = quantidadeG / alimento.porcaoG;
    return {
      carboidratosG: alimento.carboidratosG * proporcao,
      kcal: alimento.kcal * proporcao,
    };
  }, [alimento, quantidadeG]);

  const escolher = (escolhido: Alimento) => {
    setAlimento(escolhido);
    setBuscandoAlimento(false);
    setBusca('');
    if (!quantidade) {
      setQuantidade(String(escolhido.medidaCaseiraG ?? escolhido.porcaoG));
    }
  };

  const limparAlimento = () => {
    setAlimento(null);
    setQuantidade('');
  };

  const onSave = async () => {
    if (alimento && !quantidadeG) {
      Alert.alert('Falta a quantidade', 'Informe quantos gramas você comeu.');
      return;
    }
    if (!alimento && !descricao.trim()) {
      Alert.alert('Descrição obrigatória', 'Descreva o que foi consumido ou escolha um alimento da tabela.');
      return;
    }
    setSaving(true);
    try {
      await createRefeicao({
        descricao: descricao.trim() || undefined,
        tipo_refeicao: tipo,
        alimentoId: alimento?.id,
        quantidadeG: alimento ? (quantidadeG as number) : undefined,
        // Com alimento escolhido a API refaz a conta e ignora este campo.
        carboidratos: !alimento && carboidratos ? numero(carboidratos) : undefined,
        observacao: observacoes || undefined,
      });
      const rotulo = tipos.find((t) => t.key === tipo)?.label ?? 'Refeição';
      Alert.alert(
        'Registrado!',
        `${rotulo} às ${horaAgora()} foi salva. A nutricionista vai poder acompanhar isso no seu histórico.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o registro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Novo registro"
      title="Refeição"
      subtitle="Descreva sua refeição para o nutricionista acompanhar."
      showBack
    >
      <Card title="Refeição">
        <View style={styles.field}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.chips}>
            {tipos.map((t) => {
              const active = tipo === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTipo(t.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>O que você comeu?</Text>
          <TextInput
            value={descricao}
            onChangeText={setDescricao}
            style={[styles.input, styles.textarea]}
            placeholder={
              alimento
                ? 'Opcional: o nome do alimento já vai no registro'
                : 'Ex.: arroz, feijão, frango grelhado, salada'
            }
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>
      </Card>

      <Card
        title="Alimento da tabela"
        action={
          alimento ? (
            <Pressable onPress={limparAlimento}>
              <Text style={styles.cardAction}>Remover</Text>
            </Pressable>
          ) : undefined
        }
      >
        {alimento ? (
          <>
            <View style={styles.escolhido}>
              <View style={{ flex: 1 }}>
                <Text style={styles.escolhidoNome}>{alimento.nome}</Text>
                <Text style={styles.escolhidoPorcao}>
                  {alimento.carboidratosG} g de carboidrato por {alimento.porcaoG} g
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Quantidade (g)</Text>
              <TextInput
                value={quantidade}
                onChangeText={setQuantidade}
                style={styles.input}
                keyboardType="numeric"
                placeholder={String(alimento.medidaCaseiraG ?? alimento.porcaoG)}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {previa ? (
              <View style={styles.previa}>
                <Text style={styles.previaValor}>{formatar(previa.carboidratosG)} g</Text>
                <Text style={styles.previaTexto}>
                  de carboidrato — {formatar(previa.kcal)} kcal. O sistema faz a conta;
                  você não precisa calcular nada.
                </Text>
              </View>
            ) : null}
          </>
        ) : buscandoAlimento ? (
          <>
            <View style={styles.buscaBox}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                style={styles.buscaInput}
                placeholder="Buscar alimento"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                autoFocus
              />
              <Pressable onPress={() => setBuscandoAlimento(false)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {isFetching ? (
              <ActivityIndicator color={colors.primary} />
            ) : !resultados?.length ? (
              <Text style={styles.vazio}>
                {busca ? 'Nenhum alimento com esse nome.' : 'Digite para buscar.'}
              </Text>
            ) : (
              resultados.map((a) => (
                <Pressable key={a.id} onPress={() => escolher(a)} style={styles.resultado}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultadoNome}>{a.nome}</Text>
                    <Text style={styles.resultadoPorcao}>{descreverPorcao(a)}</Text>
                  </View>
                  <Text style={styles.resultadoCarbo}>{a.carboidratosG} g carb.</Text>
                </Pressable>
              ))
            )}
          </>
        ) : (
          <>
            <Pressable style={styles.escolherBtn} onPress={() => setBuscandoAlimento(true)}>
              <Ionicons name="search" size={16} color={colors.primary} />
              <Text style={styles.escolherTexto}>Escolher da tabela</Text>
            </Pressable>
            <Text style={styles.ajuda}>
              Escolhendo um alimento, o carboidrato é calculado pela tabela nutricional.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Ou informe os carboidratos (g)</Text>
              <TextInput
                value={carboidratos}
                onChangeText={setCarboidratos}
                style={styles.input}
                keyboardType="numeric"
                placeholder="Opcional"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </>
        )}
      </Card>

      <Card title="Observações">
        <TextInput
          value={observacoes}
          onChangeText={setObservacoes}
          style={[styles.input, styles.textarea]}
          placeholder="Como se sentiu, dificuldades, etc."
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </Card>

      <Pressable
        style={[styles.saveBtn, saving && styles.saveDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <>
            <Ionicons name="checkmark" size={18} color={colors.textInverse} />
            <Text style={styles.saveText}>Salvar registro</Text>
          </>
        )}
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSoft, fontWeight: '600' },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.success, borderColor: colors.success },
  chipText: { ...typography.caption, color: colors.textSoft, fontWeight: '600' },
  chipTextActive: { color: colors.textInverse },

  cardAction: { ...typography.caption, color: colors.primary, fontWeight: '600' },

  escolhido: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  escolhidoNome: { ...typography.body, color: colors.text, fontWeight: '700' },
  escolhidoPorcao: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  previa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  previaValor: { fontSize: 26, fontWeight: '700', color: colors.primary },
  previaTexto: { ...typography.caption, color: colors.textSoft, flex: 1, lineHeight: 18 },

  buscaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  buscaInput: { flex: 1, paddingVertical: spacing.md, fontSize: 15, color: colors.text },
  vazio: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.sm },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultadoNome: { ...typography.body, color: colors.text, fontWeight: '600' },
  resultadoPorcao: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  resultadoCarbo: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  escolherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  escolherTexto: { ...typography.body, color: colors.primary, fontWeight: '700' },
  ajuda: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 2,
  },
  saveDisabled: { opacity: 0.7 },
  saveText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
