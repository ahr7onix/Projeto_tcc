import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import {
  atualizarLembrete,
  criarLembrete,
  ICONE_TIPO,
  listarLembretes,
  NOMES_DIAS,
  removerLembrete,
  ROTULO_TIPO,
  type Lembrete,
  type TipoLembrete,
} from '@/lib/api/lembretes';
import { listarMedicamentos } from '@/lib/api/medicamentos';
import { colors, radius, spacing, typography } from '@/lib/theme';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const TIPOS: TipoLembrete[] = ['glicemia', 'medicamento', 'refeicao', 'outro'];

interface Form {
  tipo: TipoLembrete;
  titulo: string;
  hora: string;
  dias: number[];
  descricao: string;
  medicamentoId: string | null;
}

const FORM_VAZIO: Form = {
  tipo: 'glicemia',
  titulo: '',
  hora: '',
  dias: [],
  descricao: '',
  medicamentoId: null,
};

export default function LembretesScreen() {
  const queryClient = useQueryClient();

  const { data: lembretes, isLoading } = useQuery({
    queryKey: ['lembretes'],
    queryFn: () => listarLembretes(),
  });

  const { data: medicamentos } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: listarMedicamentos,
  });

  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Invalidar aqui reagenda as notificações: o hook da raiz do app escuta a
  // mesma chave e reescreve a agenda do aparelho.
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['lembretes'] });

  const setCampo = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  const alternarDia = (dia: number) =>
    setForm((atual) => ({
      ...atual,
      dias: atual.dias.includes(dia)
        ? atual.dias.filter((d) => d !== dia)
        : [...atual.dias, dia].sort(),
    }));

  const cancelar = () => {
    setForm(FORM_VAZIO);
    setEditandoId(null);
  };

  const iniciarEdicao = (l: Lembrete) => {
    setForm({
      tipo: l.tipo,
      titulo: l.titulo ?? '',
      hora: l.hora ?? '',
      dias: l.diasSemana,
      descricao: l.descricao ?? '',
      medicamentoId: l.medicamentoId,
    });
    setEditandoId(l.id);
  };

  const onSalvar = async () => {
    if (form.titulo.trim().length < 2) {
      Alert.alert('Confira os dados', 'Dê um nome ao lembrete.');
      return;
    }
    if (!HORA_REGEX.test(form.hora.trim())) {
      Alert.alert('Confira os dados', 'Informe o horário no formato HH:MM.');
      return;
    }

    const input = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      recorrente: true,
      hora: form.hora.trim(),
      diasSemana: form.dias,
      medicamentoId:
        form.tipo === 'medicamento' ? form.medicamentoId ?? undefined : undefined,
    };

    setSaving(true);
    try {
      if (editandoId) {
        await atualizarLembrete(editandoId, input);
      } else {
        await criarLembrete(input);
      }
      invalidar();
      Alert.alert(
        editandoId ? 'Lembrete atualizado' : 'Lembrete criado',
        'Seu celular vai avisar no horário, mesmo sem o aplicativo aberto.',
      );
      cancelar();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o lembrete. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const onAlternarAtivo = async (l: Lembrete) => {
    try {
      await atualizarLembrete(l.id, { ativo: !l.ativo });
      invalidar();
    } catch {
      Alert.alert('Erro', 'Não foi possível alterar o lembrete.');
    }
  };

  const onRemover = (l: Lembrete) => {
    Alert.alert('Remover lembrete', `Apagar "${l.titulo ?? ROTULO_TIPO[l.tipo]}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerLembrete(l.id);
            invalidar();
            if (editandoId === l.id) cancelar();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover. Tente novamente.');
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer
      eyebrow="Saúde"
      title="Lembretes"
      subtitle="Programe avisos para medir a glicemia, tomar remédio ou comer na hora certa."
      showBack
    >
      <Card title={editandoId ? 'Editar lembrete' : 'Novo lembrete'}>
        <View style={styles.field}>
          <Text style={styles.label}>O que você quer ser lembrado de fazer?</Text>
          <View style={styles.chips}>
            {TIPOS.map((t) => {
              const ativo = form.tipo === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setCampo('tipo', t)}
                  style={[styles.chip, ativo && styles.chipActive]}
                >
                  <Ionicons
                    name={ICONE_TIPO[t]}
                    size={14}
                    color={ativo ? colors.textInverse : colors.textSoft}
                  />
                  <Text style={[styles.chipText, ativo && styles.chipTextActive]}>
                    {ROTULO_TIPO[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {form.tipo === 'medicamento' && medicamentos?.length ? (
          <View style={styles.field}>
            <Text style={styles.label}>Qual medicamento? (opcional)</Text>
            <View style={styles.chips}>
              {medicamentos.map((m) => {
                const ativo = form.medicamentoId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setCampo('medicamentoId', ativo ? null : m.id)}
                    style={[styles.chip, ativo && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, ativo && styles.chipTextActive]}>
                      {m.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Nome do lembrete</Text>
          <TextInput
            value={form.titulo}
            onChangeText={(v) => setCampo('titulo', v)}
            style={styles.input}
            placeholder="Ex.: Glicemia em jejum"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Horário (HH:MM)</Text>
          <TextInput
            value={form.hora}
            onChangeText={(v) => setCampo('hora', v)}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
            placeholder="07:00"
            placeholderTextColor={colors.textMuted}
            maxLength={5}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Em quais dias?</Text>
          <View style={styles.chips}>
            {NOMES_DIAS.map((nome, dia) => {
              const ativo = form.dias.includes(dia);
              return (
                <Pressable
                  key={nome}
                  onPress={() => alternarDia(dia)}
                  style={[styles.chipDia, ativo && styles.chipActive]}
                >
                  <Text style={[styles.chipText, ativo && styles.chipTextActive]}>
                    {nome}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* Nenhum dia marcado vale como "todos" na API; dizer isso evita o
              usuário achar que esqueceu de escolher. */}
          <Text style={styles.ajuda}>
            {form.dias.length === 0
              ? 'Sem escolher nenhum, o lembrete toca todos os dias.'
              : `Toca ${form.dias.length === 1 ? 'só' : ''} ${form.dias
                  .map((d) => NOMES_DIAS[d])
                  .join(', ')}.`}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput
            value={form.descricao}
            onChangeText={(v) => setCampo('descricao', v)}
            style={[styles.input, styles.textarea]}
            placeholder="Ex.: antes do café da manhã"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <View style={styles.acoes}>
          {editandoId ? (
            <Pressable style={styles.btnSecundario} onPress={cancelar}>
              <Text style={styles.btnSecundarioTexto}>Cancelar</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.btn, saving && styles.btnDisabled]}
            onPress={onSalvar}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="alarm-outline" size={18} color={colors.textInverse} />
                <Text style={styles.btnTexto}>
                  {editandoId ? 'Salvar alterações' : 'Criar lembrete'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </Card>

      <Card title="Seus lembretes">
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !lembretes?.length ? (
          <EmptyState
            icon="alarm-outline"
            title="Nenhum lembrete programado"
            message="Crie um acima e o celular avisa na hora certa, mesmo sem o aplicativo aberto."
          />
        ) : (
          lembretes.map((l) => (
            <View key={l.id} style={[styles.item, !l.ativo && styles.itemInativo]}>
              <View style={styles.itemIcone}>
                <Ionicons name={ICONE_TIPO[l.tipo]} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitulo}>{l.titulo ?? ROTULO_TIPO[l.tipo]}</Text>
                {/* A frase de "quando" vem pronta da API, para a tela e o painel
                    descreverem o mesmo lembrete do mesmo jeito. */}
                <Text style={styles.itemQuando}>{l.quando}</Text>
                {l.descricao ? <Text style={styles.itemNota}>{l.descricao}</Text> : null}
                {!l.ativo ? <Text style={styles.itemPausado}>Pausado</Text> : null}
              </View>
              <View style={styles.itemAcoes}>
                <Pressable onPress={() => onAlternarAtivo(l)} hitSlop={8}>
                  <Ionicons
                    name={l.ativo ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={22}
                    color={colors.textSoft}
                  />
                </Pressable>
                <Pressable onPress={() => iniciarEdicao(l)} hitSlop={8}>
                  <Ionicons name="create-outline" size={20} color={colors.textSoft} />
                </Pressable>
                <Pressable onPress={() => onRemover(l)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Card>
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
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  ajuda: { ...typography.caption, fontSize: 12, color: colors.textMuted },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipDia: {
    minWidth: 52,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSoft, fontWeight: '600' },
  chipTextActive: { color: colors.textInverse },

  acoes: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  btnDisabled: { opacity: 0.7 },
  btnTexto: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
  btnSecundario: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecundarioTexto: { ...typography.body, color: colors.textSoft, fontWeight: '600' },

  center: { alignItems: 'center', paddingVertical: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemInativo: { opacity: 0.55 },
  itemIcone: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitulo: { ...typography.body, color: colors.text, fontWeight: '700' },
  itemQuando: { ...typography.caption, color: colors.primary, marginTop: 2 },
  itemNota: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  itemPausado: { ...typography.caption, color: colors.warning, marginTop: 2, fontWeight: '600' },
  itemAcoes: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
