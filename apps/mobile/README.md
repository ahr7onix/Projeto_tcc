# Mobile (Expo + React Native)

App mobile do TCC. Roda em iOS, Android e Web via Expo Router (navegação por arquivos).

## Stack

- Expo SDK 52 + React Native 0.76 (New Architecture habilitada)
- Expo Router 4 (rotas baseadas em arquivos, em `src/app/`)
- TypeScript com paths `@/*` apontando para `src/*`
- React Query para data fetching, Zustand para estado global
- Axios para HTTP, expo-secure-store para token

## Setup

```bash
cd apps/mobile
npm install
cp .env.example .env   # ajuste EXPO_PUBLIC_API_URL
npm start
```

Pressione `a` para Android, `i` para iOS (Mac), `w` para Web.

## Estrutura

```
src/
  app/                     rotas (Expo Router)
    _layout.tsx            providers globais (QueryClient, SafeArea, GestureHandler)
    index.tsx              splash/redirect baseado em auth
    (auth)/                login, cadastro
    (tabs)/                home, alimentacao, saude, registros, perfil
  components/              UI compartilhada (ScreenContainer, Card)
  lib/                     api client, storage, theme, env, query-client
  stores/                  zustand stores (auth)
```

## Variáveis de ambiente

Apenas `EXPO_PUBLIC_*` são expostas ao bundle — qualquer outra variável fica restrita ao build. Veja `.env.example`.

## Notas

- O Metro está configurado em modo monorepo (`watchFolders` aponta para a raiz) para permitir importar de `packages/shared` no futuro.
- Pastas `android/` e `ios/` ficam fora do git: rode `npx expo prebuild` quando precisar de build nativo.
