# Progresso do mobile

Histórico resumido das entregas, próximos passos e pendências do app mobile.

---

## Entregas concluídas

### 1. Scaffolding do ambiente (`bde270e`)

Setup completo do app Expo para que dê para abrir no Expo Go e começar a codar telas.

**O que foi feito**
- Configurações: [package.json](../package.json), [app.json](../app.json), [tsconfig.json](../tsconfig.json), [babel.config.js](../babel.config.js), [metro.config.js](../metro.config.js) (modo monorepo), [.gitignore](../.gitignore), [.env.example](../.env.example), [index.ts](../index.ts) (entry), [expo-env.d.ts](../expo-env.d.ts)
- Stack na época: Expo SDK 52 + RN 0.76 + Expo Router 4 + TypeScript + TanStack Query + Zustand + Axios + expo-secure-store + react-hook-form + zod
  *(hoje o [package.json](../package.json) está em Expo SDK 54, RN 0.81 e Expo Router 6, com React 19)*
- Lib base em [src/lib/](../src/lib/): `api.ts`, `storage.ts`, `theme.ts`, `env.ts`, `query-client.ts`
- Store de auth em [src/stores/auth.ts](../src/stores/auth.ts) com hidratação a partir do SecureStore
- Componentes base: [ScreenContainer](../src/components/ScreenContainer.tsx), [Card](../src/components/Card.tsx)
- Layouts e telas placeholder: root `_layout`, `index` (redirect), `(auth)/{login,cadastro}`, `(tabs)/{home,alimentacao,saude,registros,perfil}` + tab oculta `alimentacao/receitas`

### 2. Autenticação plugada na API (`c97356a`)

Telas de login e cadastro saíram do estado "casca" e agora submetem para a API real.

**O que foi feito**
- [docs/auth-contract.md](./auth-contract.md) — contrato esperado pelo mobile para os endpoints `/auth/login`, `/auth/cadastro`, `/auth/refresh`, `/auth/logout`
- [src/types/auth.ts](../src/types/auth.ts) — `AuthUser`, `UserRole`, `AuthResponse`, `LoginInput`, `CadastroInput`
- [src/lib/api/auth.ts](../src/lib/api/auth.ts) — funções `login`, `cadastro`, `logout`
- [src/lib/validation/auth.ts](../src/lib/validation/auth.ts) — schemas Zod (`loginSchema`, `cadastroSchema`)
- [src/hooks/use-auth.ts](../src/hooks/use-auth.ts) — `useLogin`, `useCadastro`, helper `extractAuthError`
- [src/components/FormField.tsx](../src/components/FormField.tsx) — input controlado com label e erro inline
- [src/components/RoleSelector.tsx](../src/components/RoleSelector.tsx) — chips paciente/nutricionista
- Auth store passou a persistir `refreshToken` e a re-exportar tipos de `@/types/auth`
- Login e cadastro refeitos com `react-hook-form` + Zod + mutations, com loading no botão, erros inline por campo e banner de erro vindo da API

**Fluxo final**
1. Usuário preenche → Zod valida → mutation chama a API
2. Sucesso → `setSession` grava `accessToken`, `refreshToken` e `user` no `expo-secure-store`
3. Guard de `(auth)/_layout.tsx` redireciona para `/(tabs)/home`
4. Falha → mensagem do `data.message` da API; sem rede → "Sem conexão com o servidor"

### 3. Funcionalidades do paciente

O app deixou de ser só autenticação. Rotas em [src/app/](../src/app/):

| Área | Rotas | Consome |
|---|---|---|
| Auth | `(auth)/login`, `(auth)/cadastro`, `(auth)/esqueci-senha` | `lib/api/auth.ts` |
| Onboarding | `onboarding/paciente` | `lib/api/perfil.ts` |
| Home | `(tabs)/home` | resumo de registros |
| Registros | `(tabs)/registros`, `registros/glicemia`, `registros/refeicao` | `lib/api/registros.ts` |
| Alimentação | `(tabs)/alimentacao`, `alimentacao/receitas`, `alimentacao/conteudos/[id]` | `lib/api/planos.ts`, `lib/api/conteudos.ts` |
| Saúde | `(tabs)/saude` | `lib/api/registros.ts` |
| Mensagens | `(tabs)/mensagens`, `mensagens/[id]` | `lib/api/mensagens.ts` |
| Perfil | `(tabs)/perfil`, `perfil/editar`, `perfil/senha`, `conta/editar` | `lib/api/perfil.ts` |

Push notifications ligadas em [use-push-notifications.ts](../src/hooks/use-push-notifications.ts)
+ [lib/api/push.ts](../src/lib/api/push.ts), registrando o token no endpoint `POST /push/token`.

O módulo `auth` da API existe e está implementado — o login funciona fim-a-fim.

---

## Pendências

- **`npm install`:** rodar localmente após clonar
- **Refresh token automático:** o interceptor de 401 hoje só limpa a sessão; falta tentar `/auth/refresh` antes de deslogar. O painel web já faz isso corretamente em `web/web_nutricionista/src/lib/api.ts` — dá para espelhar a lógica
- **Tipos compartilhados:** `src/types/auth.ts` deve migrar para `packages/shared` quando o monorepo tiver workspace configurado (root `package.json` com `workspaces`)
- **Logout no servidor:** `authApi.logout()` existe mas não é chamado pelo `signOut` do store (atualmente só limpa local), então o refresh token continua válido no banco
- **Tema dark:** estrutura do `theme.ts` permite, falta o toggle e a leitura de `useColorScheme`
- **Testes:** `jest-expo` + `@testing-library/react-native` ainda não configurados
- **Ícone e splash:** [assets/](../assets/) só tem `.gitkeep`. O [app.json](../app.json) não referencia mais imagem nenhuma, então o app roda no Expo Go com os defaults — só vira bloqueio na hora de gerar APK pelo EAS Build

---

## Próximos passos sugeridos (ordem de prioridade)

1. **Refresh token automático** — é a pendência que o usuário sente: a sessão cai a cada 15 minutos (`JWT_EXPIRES_IN`) mesmo com refresh token válido.
2. **Logout server-side** — chamar `authApi.logout()` no `signOut` para invalidar o refresh token no banco.
3. **Tipos compartilhados** — montar `packages/shared` como workspace e migrar `types/auth.ts`. Desbloqueia tipagem fim-a-fim entre web/mobile/api.
4. **Testes** — `jest-expo` nos fluxos críticos (login, registro de glicemia).
5. **Tema dark** — toggle + `useColorScheme`.
6. **EAS Build** — `eas.json` e os assets de ícone/splash quando for hora de gerar o APK para a apresentação.
