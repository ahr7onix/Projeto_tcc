import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { updatePerfil } from '@/lib/api/perfil';
import { colors, radius, spacing } from '@/lib/theme';

export default function AlterarSenhaScreen() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);

  const onSave = async () => {
    if (!senhaAtual || !novaSenha || !confirmar) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos.');
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert('Senha fraca', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      Alert.alert('Senhas diferentes', 'A confirmação não coincide com a nova senha.');
      return;
    }
    setSaving(true);
    try {
      await updatePerfil({ senhaAtual, novaSenha });
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Verifique sua senha atual e tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Segurança</Text>
          <Text style={styles.title}>Alterar senha</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Senha atual</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={senhaAtual}
                onChangeText={setSenhaAtual}
                style={styles.input}
                secureTextEntry={!showAtual}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable onPress={() => setShowAtual(!showAtual)} style={styles.eyeBtn}>
                <Ionicons name={showAtual ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Nova senha</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={novaSenha}
                onChangeText={setNovaSenha}
                style={styles.input}
                secureTextEntry={!showNova}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable onPress={() => setShowNova(!showNova)} style={styles.eyeBtn}>
                <Ionicons name={showNova ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar nova senha</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={confirmar}
                onChangeText={setConfirmar}
                style={[styles.input, confirmar && confirmar !== novaSenha && styles.inputError]}
                secureTextEntry={!showNova}
                placeholder="Repita a nova senha"
                placeholderTextColor={colors.textMuted}
              />
              {confirmar !== '' && (
                <View style={styles.eyeBtn}>
                  <Ionicons
                    name={confirmar === novaSenha ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={confirmar === novaSenha ? colors.success : colors.danger}
                  />
                </View>
              )}
            </View>
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
              <Ionicons name="lock-closed" size={16} color={colors.textInverse} />
              <Text style={styles.saveBtnText}>Alterar senha</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl,
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

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSoft },
  inputWrap: { position: 'relative' },
  input: {
    backgroundColor: colors.backgroundAlt, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    paddingRight: 44, fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  inputError: { borderColor: colors.danger },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: [{ translateY: -9 }],
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    paddingVertical: spacing.lg, borderRadius: radius.pill,
    boxShadow: '0 10px 24px rgba(124,58,237,0.35)', elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
