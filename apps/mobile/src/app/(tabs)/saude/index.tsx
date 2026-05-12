import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/lib/theme';

type ImcStatus = {
  label: string;
  tint: string;
  tintBg: string;
};

function classificarImc(imc: number | null): ImcStatus | null {
  if (imc === null) return null;
  if (imc < 18.5) return { label: 'Abaixo do peso', tint: colors.warning, tintBg: colors.warningSoft };
  if (imc < 25) return { label: 'Peso normal', tint: colors.success, tintBg: colors.successSoft };
  if (imc < 30) return { label: 'Sobrepeso', tint: colors.warning, tintBg: colors.warningSoft };
  return { label: 'Obesidade', tint: colors.danger, tintBg: colors.dangerSoft };
}

const metas = [
  { titulo: 'Glicemia em jejum', meta: '< 130 mg/dL', progresso: 0 },
  { titulo: 'Hemoglobina glicada', meta: '< 7%', progresso: 0 },
  { titulo: 'Atividade física', meta: '150 min/semana', progresso: 0 },
];

const glicResumo = [
  { label: 'Média', valor: '--', unidade: 'mg/dL' },
  { label: 'Mínima', valor: '--', unidade: 'mg/dL' },
  { label: 'Máxima', valor: '--', unidade: 'mg/dL' },
  { label: 'No alvo', valor: '--', unidade: '%' },
];

export default function SaudeScreen() {
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');

  const imc = useMemo(() => {
    const p = Number(peso.replace(',', '.'));
    const a = Number(altura.replace(',', '.'));
    if (!p || !a || a <= 0) return null;
    const result = p / (a * a);
    return Number.isFinite(result) ? result : null;
  }, [peso, altura]);

  const status = classificarImc(imc);

  return (
    <ScreenContainer
      eyebrow="Indicadores"
      title="Saúde"
      subtitle="Metas, antropometria e bem-estar em um só lugar."
    >
      <Pressable style={styles.appointment}>
        <View style={styles.appointmentIcon}>
          <Ionicons name="calendar" size={18} color={colors.textInverse} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.appointmentEyebrow}>Próxima consulta</Text>
          <Text style={styles.appointmentTitle}>Nenhuma agendada</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textInverse} />
      </Pressable>

      <Card title="Antropometria">
        <View style={styles.antroRow}>
          <View style={styles.antroField}>
            <Text style={styles.antroLabel}>Peso (kg)</Text>
            <TextInput
              value={peso}
              onChangeText={setPeso}
              style={styles.antroInput}
              keyboardType="numeric"
              placeholder="--"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.antroField}>
            <Text style={styles.antroLabel}>Altura (m)</Text>
            <TextInput
              value={altura}
              onChangeText={setAltura}
              style={styles.antroInput}
              keyboardType="numeric"
              placeholder="--"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.imcBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.antroLabel}>IMC</Text>
            <Text style={styles.imcValue}>
              {imc ? imc.toFixed(1) : '--'}
            </Text>
          </View>
          {status ? (
            <View style={[styles.statusPill, { backgroundColor: status.tintBg }]}>
              <Text style={[styles.statusText, { color: status.tint }]}>{status.label}</Text>
            </View>
          ) : (
            <Text style={styles.imcHint}>Informe peso e altura</Text>
          )}
        </View>
      </Card>

      <Card
        title="Resumo glicêmico"
        action={<Text style={styles.cardAction}>7 dias</Text>}
      >
        <View style={styles.glicGrid}>
          {glicResumo.map((g) => (
            <View key={g.label} style={styles.glicCell}>
              <Text style={styles.glicLabel}>{g.label}</Text>
              <Text style={styles.glicValue}>
                {g.valor}
                <Text style={styles.glicUnit}> {g.unidade}</Text>
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card
        title="Metas clínicas"
        action={<Text style={styles.cardAction}>Editar</Text>}
      >
        <View style={styles.metasList}>
          {metas.map((m, i) => (
            <View
              key={m.titulo}
              style={[styles.metaRow, i > 0 && styles.rowDivider]}
            >
              <View style={styles.metaTopRow}>
                <Text style={styles.metaTitle}>{m.titulo}</Text>
                <Text style={styles.metaTarget}>{m.meta}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(m.progresso * 100, 4)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card
        title="Medicamentos"
        action={
          <View style={styles.addBtn}>
            <Ionicons name="add" size={16} color={colors.primary} />
          </View>
        }
      >
        <EmptyState
          icon="medkit-outline"
          title="Nenhum medicamento ativo"
          message="Adicione seus medicamentos para receber lembretes nos horários certos."
        />
      </Card>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  appointment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    boxShadow: '0 10px 24px rgba(124, 58, 237, 0.35)',
    elevation: 6,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentEyebrow: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  appointmentTitle: {
    ...typography.h3,
    color: colors.textInverse,
    marginTop: 2,
  },

  antroRow: { flexDirection: 'row', gap: spacing.md },
  antroField: { flex: 1, gap: spacing.xs },
  antroLabel: { ...typography.caption, color: colors.textSoft, fontWeight: '600' },
  antroInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  imcValue: { ...typography.h1, color: colors.text, marginTop: 2 },
  imcHint: { ...typography.caption, color: colors.textMuted },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  glicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  glicCell: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  glicLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  glicValue: { ...typography.h2, color: colors.text },
  glicUnit: { fontSize: 12, fontWeight: '500', color: colors.textMuted },

  cardAction: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  metasList: { gap: 0 },
  metaRow: { paddingVertical: spacing.sm, gap: spacing.xs },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  metaTarget: { fontSize: 12, fontWeight: '700', color: colors.primary },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },

  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
