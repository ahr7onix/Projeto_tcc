import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { desativarConta } from '@/lib/api/perfil';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing } from '@/lib/theme';

const CONSEQUENCIAS = [
  'Você sai do aplicativo e não consegue mais entrar com este e-mail.',
  'Seu nutricionista deixa de ver você na lista de pacientes.',
  'Suas glicemias, refeições e mensagens não são apagadas — ficam guardadas no prontuário.',
];

export default function ExcluirContaScreen() {
  const { signOut } = useAuthStore();
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [ciente, setCiente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeEnviar = ciente && senha.length >= 6 && !enviando;

  // O erro aparece na própria tela, e não em Alert: a confirmação precisa
  // funcionar igual no app e na versão web.
  const confirmar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      await desativarConta(senha);
      await signOut();
    } catch (e: any) {
      setErro(
        e?.response?.data?.message ??
          'Não foi possível desativar agora. Confira a senha e tente de novo.',
      );
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Conta</Text>
          <Text style={styles.title}>Excluir conta</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avisoCard}>
          <View style={styles.avisoTopo}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <Text style={styles.avisoTitulo}>Isso encerra seu acesso</Text>
          </View>
          {CONSEQUENCIAS.map((texto) => (
            <View key={texto} style={styles.itemLinha}>
              <View style={styles.bullet} />
              <Text style={styles.itemTexto}>{texto}</Text>
            </View>
          ))}
          <Text style={styles.avisoRodape}>
            Mudou de ideia depois? Fale com seu nutricionista para reativar a conta.
          </Text>
        </View>

        <Pressable style={styles.checkLinha} onPress={() => setCiente(!ciente)}>
          <View style={[styles.checkbox, ciente && styles.checkboxMarcado]}>
            {ciente && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
          </View>
          <Text style={styles.checkTexto}>
            Entendi e quero encerrar minha conta no NutriCare.
          </Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Confirme sua senha</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={senha}
                onChangeText={(v) => {
                  setSenha(v);
                  setErro(null);
                }}
                style={[styles.input, erro ? styles.inputError : null]}
                secureTextEntry={!mostrarSenha}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setMostrarSenha(!mostrarSenha)} style={styles.eyeBtn}>
                <Ionicons
                  name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>
          {erro && <Text style={styles.erroTexto}>{erro}</Text>}
        </View>

        <Pressable
          style={[styles.btnPerigo, !podeEnviar && styles.btnDisabled]}
          onPress={confirmar}
          disabled={!podeEnviar}
        >
          {enviando ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={colors.textInverse} />
              <Text style={styles.btnPerigoTexto}>Excluir minha conta</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.btnCancelar} onPress={() => router.back()} disabled={enviando}>
          <Text style={styles.btnCancelarTexto}>Cancelar</Text>
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
  eyebrow: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textInverse, letterSpacing: -0.3 },

  scroll: {
    flex: 1, backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },

  avisoCard: {
    backgroundColor: colors.dangerSoft, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.danger,
  },
  avisoTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avisoTitulo: { fontSize: 15, fontWeight: '700', color: colors.danger },
  itemLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: {
    width: 5, height: 5, borderRadius: 3, marginTop: 7,
    backgroundColor: colors.danger,
  },
  itemTexto: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  avisoRodape: { fontSize: 12, color: colors.textSoft, marginTop: spacing.xs },

  checkLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkbox: {
    width: 22, height: 22, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxMarcado: { backgroundColor: colors.danger, borderColor: colors.danger },
  checkTexto: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    gap: spacing.sm,
  },
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
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -9 }] },
  erroTexto: { fontSize: 12, color: colors.danger, fontWeight: '600' },

  btnPerigo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.danger,
    paddingVertical: spacing.lg, borderRadius: radius.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnPerigoTexto: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },

  btnCancelar: { alignItems: 'center', paddingVertical: spacing.md },
  btnCancelarTexto: { color: colors.textSoft, fontWeight: '600', fontSize: 14 },
});
