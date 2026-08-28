import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useMensagensRealtime } from '@/hooks/use-mensagens-realtime';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { token, user, isHydrated } = useAuthStore();

  // Uma conexao para o app inteiro: a lista de conversas e a conversa aberta
  // recebem mensagem nova mesmo com o usuario em outra aba.
  useMensagensRealtime();

  if (isHydrated && !token) {
    return <Redirect href="/(auth)" />;
  }
  if (isHydrated && user?.role === 'paciente' && !user.perfilCompleto) {
    return <Redirect href="/onboarding/paciente" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.authFocus,
        tabBarInactiveTintColor: colors.authMuted,
        tabBarStyle: {
          backgroundColor: colors.authBg1,
          borderTopColor: colors.authBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 74,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.35)',
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          minHeight: 48,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alimentacao/index"
        options={{
          title: 'Alimentação',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="registros/index"
        options={{
          title: 'Registros',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mensagens/index"
        options={{
          title: 'Mensagens',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saude/index"
        options={{
          title: 'Saúde',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil/index"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="alimentacao/receitas/index" options={{ href: null }} />
      <Tabs.Screen name="alimentacao/receitas/[id]" options={{ href: null }} />
      <Tabs.Screen name="alimentacao/conteudos/index" options={{ href: null }} />
      <Tabs.Screen name="alimentacao/conteudos/[id]" options={{ href: null }} />
      <Tabs.Screen name="alimentacao/restricoes" options={{ href: null }} />
      <Tabs.Screen name="registros/glicemia" options={{ href: null }} />
      <Tabs.Screen name="registros/refeicao" options={{ href: null }} />
      <Tabs.Screen name="saude/medidas" options={{ href: null }} />
      <Tabs.Screen name="saude/humor" options={{ href: null }} />
      <Tabs.Screen name="saude/medicamentos" options={{ href: null }} />
      <Tabs.Screen name="perfil/editar" options={{ href: null }} />
      <Tabs.Screen name="perfil/senha" options={{ href: null }} />
      <Tabs.Screen name="mensagens/[id]" options={{ href: null }} />
    </Tabs>
  );
}
