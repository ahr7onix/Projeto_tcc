import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { marcarConversaEmFoco } from '@/hooks/use-mensagens-realtime';
import { abrirConversa, enviarMensagem } from '@/lib/api/mensagens';
import { colors, radius, spacing, typography } from '@/lib/theme';

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConversaScreen() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const [texto, setTexto] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();

  const { data: thread, isLoading } = useQuery({
    queryKey: ['conversa', id],
    queryFn: () => abrirConversa(String(id)),
  });

  // Enquanto esta conversa esta na tela, o canal em tempo real entrega a
  // mensagem aqui e ja a marca como lida — nada de puxar para atualizar.
  useFocusEffect(
    useCallback(() => {
      marcarConversaEmFoco(String(id));
      return () => {
        marcarConversaEmFoco(null);
        // Abrir a conversa zera os nao lidos no servidor: a lista precisa
        // saber disso ao voltar, sem depender de uma mensagem nova chegar.
        queryClient.invalidateQueries({ queryKey: ['conversas'] });
      };
    }, [id, queryClient]),
  );

  const { mutate: enviar, isPending } = useMutation({
    mutationFn: (conteudo: string) => enviarMensagem(String(id), conteudo),
    onSuccess: () => {
      setTexto('');
      queryClient.invalidateQueries({ queryKey: ['conversa', id] });
      queryClient.invalidateQueries({ queryKey: ['conversas'] });
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [thread?.data.length]);

  const titulo = thread?.contraparte.nome ?? nome ?? 'Conversa';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
          </Pressable>
          <Text style={styles.headerTitle}>{titulo}</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.lista}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : !thread?.data.length ? (
            <Text style={styles.vazio}>Nenhuma mensagem ainda. Envie a primeira.</Text>
          ) : (
            thread.data.map((m) => (
              <View
                key={m.id}
                style={[styles.balaoWrap, m.propria ? styles.direita : styles.esquerda]}
              >
                <View style={[styles.balao, m.propria ? styles.balaoProprio : styles.balaoOutro]}>
                  <Text style={m.propria ? styles.textoProprio : styles.textoOutro}>
                    {m.conteudo}
                  </Text>
                  <Text style={m.propria ? styles.horaPropria : styles.horaOutro}>
                    {formatarHora(m.criadoEm)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.rodape}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva sua mensagem..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={() => texto.trim() && enviar(texto.trim())}
            disabled={!texto.trim() || isPending}
            style={[styles.enviar, (!texto.trim() || isPending) && styles.enviarDesativado]}
          >
            {isPending ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={colors.textInverse} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundAlt },
  header: { backgroundColor: colors.primaryDark },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h2, color: colors.textInverse, fontSize: 18 },
  lista: { padding: spacing.lg, gap: spacing.sm },
  vazio: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  balaoWrap: { flexDirection: 'row' },
  esquerda: { justifyContent: 'flex-start' },
  direita: { justifyContent: 'flex-end' },
  balao: { maxWidth: '78%', padding: spacing.md, borderRadius: radius.md },
  balaoProprio: { backgroundColor: colors.primary },
  balaoOutro: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  textoProprio: { ...typography.body, color: colors.textInverse, lineHeight: 20 },
  textoOutro: { ...typography.body, color: colors.text, lineHeight: 20 },
  horaPropria: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    textAlign: 'right',
  },
  horaOutro: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 14,
  },
  enviar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarDesativado: { opacity: 0.5 },
});
