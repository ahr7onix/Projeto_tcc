# Roadmap de autenticação

Como sair do estado atual (UI pronta, e-mail/senha integrado à API, social login só visual) para autenticação funcional completa, com social login.

---

## Estado atual

- [Tela de login](../src/app/(auth)/login.tsx) redesenhada com logo, inputs em pílula, botão primário, divisor e três botões sociais (Apple visível só em iOS, Google e Facebook).
- Botões sociais estão **desabilitados** e abrem um `Alert` informativo ao toque. A integração real é trabalho desta doc.
- E-mail/senha já submete para `POST /auth/login` e `POST /auth/cadastro` (ver [auth-contract.md](./auth-contract.md)).
- `useAuthStore` persiste `accessToken`, `refreshToken` e `user` no `expo-secure-store`.

---

## Pesquisa: o que apps de saúde usam

Levantamento dos principais apps do ramo (nutrição, diabetes, fitness):

| App                 | Email/Senha | Google | Apple | Facebook | Instagram |
| ------------------- | ----------- | ------ | ----- | -------- | --------- |
| MyFitnessPal        | sim         | sim    | sim   | sim      | não       |
| FatSecret           | sim         | sim    | sim   | sim      | não       |
| Lose It!            | sim         | sim    | sim   | sim      | não       |
| MySugr (Roche)      | **só este** | não    | não   | não      | não       |
| Glucose Buddy       | sim         | sim    | sim   | não      | não       |
| Diabetes:M          | sim         | sim    | sim   | não      | não       |
| Cronometer          | sim         | sim    | sim   | não (saiu em 2023) | não |
| Yazio               | sim         | sim    | sim   | sim      | não       |

**Conclusões:**
- **Nenhum** app de saúde oferece login com Instagram. O "Login com Instagram" hoje é, na prática, Facebook Login for Business via Meta Graph API — feito para apps de marketing/criadores, não para identidade. **Não vamos suportar.**
- Apps com classificação **médica/regulatória** (MySugr é dispositivo médico CE/FDA) ficam **só em e-mail/senha**. Apps **wellness** (MyFitnessPal, Yazio, Cronometer) liberam social login.
- Facebook está em queda nesse setor (Cronometer removeu). Apple e Google são consenso.

### Regra da Apple (Guideline 4.8)

Se o app oferece **qualquer** login social de terceiros (Google, Facebook, X, etc.) na **versão iOS**, **deve** oferecer também **Sign in with Apple** com prominência equivalente. Sem isso, é rejeitado na App Store. É por isso que o botão Apple só aparece em iOS no nosso código atual.

### LGPD

Glicemia, registros alimentares ligados a diabetes e HbA1c são **dados pessoais sensíveis** (LGPD Art. 5º II + Art. 11). O OAuth provider nunca vê PHI — ele só atesta identidade. Mas:
1. Consentimento de identidade (login social) tem que ser **separado** do consentimento de tratamento de dados de saúde.
2. **Nunca** envie PHI para o provedor (sem custom claims com dados de saúde, sem analytics piggybacking no SDK social).

---

## Recomendação para o nosso projeto

Suportar, nesta ordem, **três** mecanismos:

1. **E-mail + senha** — primário, LGPD-friendly, funciona para todo mundo. Já está no código.
2. **Sign in with Apple** — obrigatório no iOS por causa da regra 4.8. Biblioteca: [`expo-apple-authentication`](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).
3. **Google Sign-In** — maior conversão no Brasil. Biblioteca: `expo-auth-session/providers/google` (mais simples) ou `@react-native-google-signin/google-signin` (UX nativa, requer build dev).

**Pular:**
- **Facebook** — tendência de queda, exige Meta Business review, Cronometer já removeu. Se um dia for pedido, usar `react-native-fbsdk-next`.
- **Instagram** — não é login de identidade, não faz sentido para saúde.
- **Magic-link** — adiar para v2; é fácil incluir depois com `expo-auth-session` genérico.

---

## Como tornar o login funcional (e-mail/senha)

Já está tudo pronto no mobile. Falta a API:

1. Implementar `apps/api/src/modules/auth` no NestJS seguindo [auth-contract.md](./auth-contract.md):
   - `passport-local` + `argon2` para hash de senha
   - `@nestjs/jwt` para gerar `accessToken` (15min) e `refreshToken` (30 dias, salvo em tabela `refresh_tokens`)
   - DTOs com `class-validator` espelhando o `loginSchema` e `cadastroSchema` do mobile
2. Subir a API local e ajustar `EXPO_PUBLIC_API_URL` em `.env`.
3. Validar manualmente os fluxos: login válido, login inválido, cadastro novo, e-mail duplicado, sem rede, logout pelo perfil.

### Refresh token

Adicionar interceptor de response no [api.ts](../src/lib/api.ts):
- Em `401`, tentar `POST /auth/refresh` com o `refreshToken` armazenado.
- Sucesso → atualizar tokens e re-emitir a request original (a Axios chama com a nova `Authorization`).
- Falha → limpar sessão (já é o comportamento atual).

Cuidado para não cair em loop: se o próprio `/auth/refresh` retornar 401, **não tentar de novo**.

---

## Como adicionar Sign in with Apple (passos)

1. **Apple Developer Portal:**
   - Habilitar "Sign in with Apple" no App ID.
   - Criar uma Service ID se a API também precisar validar (necessário se houver web).
   - Gerar uma chave (.p8) e anotar `keyId`, `teamId`, `bundleId`.

2. **Mobile:**
   ```bash
   npx expo install expo-apple-authentication
   ```
   Adicionar no [app.json](../app.json):
   ```json
   {
     "expo": {
       "ios": { "usesAppleSignIn": true },
       "plugins": ["expo-apple-authentication"]
     }
   }
   ```
   Substituir o `onPress` placeholder do botão Apple por:
   ```tsx
   import * as AppleAuthentication from 'expo-apple-authentication';
   const credential = await AppleAuthentication.signInAsync({
     requestedScopes: [
       AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
       AppleAuthentication.AppleAuthenticationScope.EMAIL,
     ],
   });
   // credential.identityToken vai pro backend
   ```

3. **API (NestJS):**
   - Endpoint `POST /auth/apple` recebendo `{ identityToken, fullName?, email? }`.
   - Validar o `identityToken` contra o JWKS público da Apple (`https://appleid.apple.com/auth/keys`) usando `jose`.
   - `sub` do token vira o `apple_id` do usuário (link de conta, nunca identificador único do app).
   - Apple só envia `email`/`fullName` na **primeira** autenticação — armazenar imediatamente.
   - Retornar o mesmo `AuthResponse` do login normal.

4. **Mobile (handler do botão):**
   ```ts
   const { data } = await api.post('/auth/apple', { identityToken, fullName });
   await setSession(data);
   ```

---

## Como adicionar Google Sign-In (passos)

1. **Google Cloud Console:**
   - Criar projeto, habilitar OAuth consent screen.
   - Criar **três** OAuth Client IDs: Web (para o backend validar), iOS, Android.
   - No Android, registrar o SHA-1 do keystore (debug e prod).

2. **Mobile (caminho mais simples — Expo AuthSession):**
   ```bash
   npx expo install expo-auth-session expo-crypto
   ```
   ```tsx
   import * as Google from 'expo-auth-session/providers/google';
   const [, response, promptAsync] = Google.useIdTokenAuthRequest({
     iosClientId: '...',
     androidClientId: '...',
     webClientId: '...', // server-side validation
   });
   ```
   Quando `response.type === 'success'`, mandar `response.params.id_token` para a API.

3. **API:**
   - Endpoint `POST /auth/google` recebendo `{ idToken }`.
   - Validar com `google-auth-library`:
     ```ts
     const ticket = await client.verifyIdToken({ idToken, audience: WEB_CLIENT_ID });
     const payload = ticket.getPayload();
     ```
   - `payload.sub` vira o `google_id` do usuário.
   - Retornar `AuthResponse`.

---

## Esquema de banco recomendado

```
usuarios
  id (uuid)
  nome
  email (unique, nullable se for só social)
  senha_hash (nullable se for só social)
  role
  email_verificado_em
  criado_em

contas_externas
  id
  usuario_id -> usuarios
  provedor ('apple' | 'google' | 'facebook')
  provedor_user_id
  email_provedor
  vinculado_em
  unique(provedor, provedor_user_id)

refresh_tokens
  id
  usuario_id
  hash_token
  expira_em
  revogado_em
```

Vantagem: um mesmo usuário pode vincular vários métodos. Login social que retorna um e-mail já existente vincula automaticamente à conta existente (com confirmação de tela).

---

## Ordem de implementação sugerida

1. ✅ UI de login pronta (este commit)
2. ⏭️ Implementar módulo `auth` no NestJS (e-mail/senha + JWT + refresh)
3. ⏭️ Adicionar interceptor de refresh no mobile
4. ⏭️ Sign in with Apple (necessário antes da primeira submissão à App Store)
5. ⏭️ Google Sign-In
6. ⏭️ Esqueci minha senha (e-mail com token via SMTP/Resend)
7. ⏭️ Verificação de e-mail (opcional para MVP)

Facebook fica como "se alguém pedir explicitamente". Instagram não entra.
