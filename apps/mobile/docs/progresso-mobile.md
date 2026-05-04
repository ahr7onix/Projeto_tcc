# Progresso do mobile

Histórico resumido das entregas, próximos passos e pendências do app mobile.

---

## Entregas concluídas

### 1. Scaffolding do ambiente (`bde270e`)

Setup completo do app Expo para que dê para abrir no Expo Go e começar a codar telas.

**O que foi feito**
- Configurações: [package.json](../package.json), [app.json](../app.json), [tsconfig.json](../tsconfig.json), [babel.config.js](../babel.config.js), [metro.config.js](../metro.config.js) (modo monorepo), [.gitignore](../.gitignore), [.env.example](../.env.example), [index.ts](../index.ts) (entry), [expo-env.d.ts](../expo-env.d.ts)
- Stack: Expo SDK 52 + RN 0.76 + Expo Router 4 + TypeScript + TanStack Query + Zustand + Axios + expo-secure-store + react-hook-form + zod
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

---

## O que dá para fazer agora com isso

- Implementar o módulo `apps/api/src/modules/auth` seguindo [auth-contract.md](./auth-contract.md) e o login passa a funcionar fim-a-fim
- Reutilizar `FormField` e `extractAuthError` em qualquer tela com formulário (registros de glicemia, refeições, etc.)
- Reutilizar `useLogin`/`useCadastro` como referência para criar `useGlicemiaCreate`, `useRefeicaoCreate`, etc.
- Acessar `useAuthStore.getState().user.role` para ramificar UI entre paciente e nutricionista
- Testar manualmente no Expo Go assim que a API subir e os assets forem adicionados

---

## Pendências

- **Assets de imagem:** ainda faltam `icon.png` (1024×1024), `splash.png`, `adaptive-icon.png`, `favicon.png` em [assets/](../assets/) — referenciados em [app.json](../app.json)
- **`npm install`:** rodar localmente após clonar
- **Refresh token automático:** o interceptor de 401 hoje só limpa a sessão; falta tentar `/auth/refresh` antes de deslogar
- **Tipos compartilhados:** `src/types/auth.ts` deve migrar para `packages/shared` quando o monorepo tiver workspace configurado (root `package.json` com `workspaces`)
- **Logout no servidor:** `authApi.logout()` existe mas não é chamado pelo `signOut` do store (atualmente só limpa local)
- **Tema dark:** estrutura do `theme.ts` permite, falta o toggle e a leitura de `useColorScheme`
- **Testes:** `jest-expo` + `@testing-library/react-native` ainda não configurados

---

## Próximos passos sugeridos (ordem de prioridade)

1. **Tipos compartilhados** — montar `packages/shared` como workspace e migrar `types/auth.ts`. Desbloqueia tipagem fim-a-fim entre web/mobile/api.
2. **Registros de glicemia** — primeira feature de paciente. Cria padrão para todas as outras: `lib/api/glicemia.ts` + schema Zod + `useGlicemiaCreate` + tela de formulário em `(tabs)/registros`.
3. **Home com dados reais** — substituir os cards hardcoded por `useQuery` consumindo `/pacientes/me/resumo` (ou equivalente).
4. **Resto do paciente** — alimentação (plano + receitas), saúde (antropometria, medicamentos, metas).
5. **Telas de nutricionista** — lista de pacientes, detalhes, criar plano alimentar e metas. Ramificar a partir de `user.role`.
6. **Push notifications** — `expo-notifications` ligado ao módulo `notificacoes` da API para lembretes de glicemia e medicamento.
7. **Refresh token + logout server-side** — completar o ciclo de auth.
8. **Testes e EAS Build** — `jest-expo` para fluxos críticos e `eas.json` quando for hora de gerar APK/IPA.
