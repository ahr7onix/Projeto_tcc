import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { getPacienteData, updatePacienteData, updatePerfil } from '@/lib/api/perfil';
import { SEXOS, TIPOS_DIABETES } from '@/types/auth';
import { colors, radius, spacing } from '@/lib/theme';

/** Converte ISO (AAAA-MM-DD) para o formato exibido nos campos, DD/MM/AAAA. */
function isoParaBr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function formatDateMask(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits;
  if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length > 4) out = `${out.slice(0, 5)}/${out.slice(5)}`;
  return out;
}

export default function EditarPerfilScreen() {
  const { user, updateUser } = useAuthStore();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [dataNascimento, setDataNascimento] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [sexo, setSexo] = useState('');
  const [tipoDiabetes, setTipoDiabetes] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPacienteData()
      .then((d) => {
        if (!d) return;
        if (d.dataNascimento) setDataNascimento(isoParaBr(d.dataNascimento));
        if (d.peso) setPeso(String(d.peso));
        if (d.altura) setAltura(String(d.altura));
        if (d.sexo) setSexo(d.sexo);
        if (d.tipoDiabetes) setTipoDiabetes(d.tipoDiabetes);
        if (d.restricoesAlergias) setRestricoes(d.restricoesAlergias);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    if (dataNascimento && !/^\d{2}\/\d{2}\/\d{4}$/.test(dataNascimento)) {
      Alert.alert('Data inválida', 'Informe a data de nascimento no formato DD/MM/AAAA.');
      return;
    }
    setSaving(true);
    try {
      if (nome.trim() && nome.trim() !== user?.nome) {
        const updated = await updatePerfil({ nome: nome.trim() });
        await updateUser({ nome: updated.nome });
      }
      await updatePacienteData({
        dataNascimento: dataNascimento || undefined,
        sexo: sexo || undefined,
        tipoDiabetes: tipoDiabetes || undefined,
        peso: peso ? Number(peso.replace(',', '.')) : undefined,
        altura: altura ? Number(altura.replace(',', '.')) : undefined,
        restricoesAlergias: restricoes || undefined,
      });
      Alert.alert('Salvo', 'Perfil atualizado com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Personalizar</Text>
          <Text style={styles.title}>Editar perfil</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Dados clínicos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados clínicos</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Data de nascimento</Text>
            <TextInput
              value={dataNascimento}
              onChangeText={(v) => setDataNascimento(formatDateMask(v))}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textMuted}
              maxLength={10}
            />
            <Text style={styles.hint}>
              Usamos sua idade para simplificar a interface automaticamente para
              quem tem 55 anos ou mais.
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Peso (kg)</Text>
              <TextInput
                value={peso}
                onChangeText={setPeso}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="Ex: 72.5"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Altura (m)</Text>
              <TextInput
                value={altura}
                onChangeText={setAltura}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="Ex: 1.74"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.chips}>
              {SEXOS.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setSexo(s.value)}
                  style={[styles.chip, sexo === s.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, sexo === s.value && styles.chipTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tipo de diabetes</Text>
            <View style={styles.chips}>
              {TIPOS_DIABETES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setTipoDiabetes(t.value)}
                  style={[styles.chip, tipoDiabetes === t.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, tipoDiabetes === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Restrições e alergias</Text>
            <TextInput
              value={restricoes}
              onChangeText={setRestricoes}
              style={[styles.input, styles.textarea]}
              placeholder="Ex: lactose, amendoim..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={colors.textInverse} />
              <Text style={styles.saveBtnText}>Salvar alterações</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '700', color: colors.textInverse, letterSpacing: -0.3 },

  scroll: { flex: 1, backgroundColor: colors.backgroundAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },

  section: { gap: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSoft },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: spacing.md },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 7, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSoft },
  chipTextActive: { color: colors.textInverse },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    paddingVertical: spacing.lg, borderRadius: radius.md,
    marginTop: spacing.sm,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 2,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
