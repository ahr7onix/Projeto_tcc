import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { token, user, isHydrated } = useAuthStore();

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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 30 : 14,
          boxShadow: '0 -4px 20px rgba(11,11,23,0.07)',
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 3,
        },
        tabBarItemStyle: { paddingVertical: 4 },
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
      <Tabs.Screen name="alimentacao/alimentos/index" options={{ href: null }} />
      <Tabs.Screen name="alimentacao/alimentos/[id]" options={{ href: null }} />
      <Tabs.Screen name="alimentacao/conteudos/index" options={{ href: null }} />
      <Tabs.Screen name="alimentacao/conteudos/[id]" options={{ href: null }} />
      <Tabs.Screen name="registros/glicemia" options={{ href: null }} />
      <Tabs.Screen name="registros/refeicao" options={{ href: null }} />
      <Tabs.Screen name="saude/medidas" options={{ href: null }} />
      <Tabs.Screen name="saude/humor" options={{ href: null }} />
      <Tabs.Screen name="perfil/editar" options={{ href: null }} />
      <Tabs.Screen name="perfil/senha" options={{ href: null }} />
      <Tabs.Screen name="mensagens/[id]" options={{ href: null }} />
    </Tabs>
  );
}
