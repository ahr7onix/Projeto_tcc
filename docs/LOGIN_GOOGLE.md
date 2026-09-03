# Login com Google — como está configurado

O botão "Entrar com Google" do painel web **já está funcionando** em ambiente de
desenvolvimento. Este documento registra o que foi configurado, para que seja
possível repetir a configuração em outra conta ou quando o sistema for publicado.

---

## Como funciona (resumo)

1. O usuário clica no botão do Google no painel.
2. O Google abre uma janela, o usuário escolhe a conta, e o Google devolve um
   *token* para o site.
3. O site manda esse token para a API (`POST /auth/google`).
4. A API pergunta ao Google se o token é válido **e se foi emitido para este
   aplicativo**. Se for, cria a sessão.

Por isso o mesmo Client ID precisa estar nos dois lugares:

| Onde | Variável | Arquivo |
|---|---|---|
| Painel web | `VITE_GOOGLE_CLIENT_ID` | `apps/web/.env` |
| API | `GOOGLE_CLIENT_ID` | `apps/api/.env` |

Se a API ficar sem `GOOGLE_CLIENT_ID`, o login social é recusado com uma mensagem
explicando isso — o resto do sistema continua funcionando normalmente.

---

## O que está configurado hoje

Projeto no Google Cloud: `my-project-1572287916923`.

Credencial em uso — tipo **Aplicativo da Web**, nome **"NutriCare - Painel Web"**:

```
579066584754-mjlmqjmtscn5lgs7depm8uvovn92lm5d.apps.googleusercontent.com
```

Origens JavaScript autorizadas:

```
http://localhost:5173
http://127.0.0.1:5173
```

O Client ID **não é segredo** — ele aparece no código da página. O que não pode
ser divulgado é a "chave secreta do cliente", que este modo de login nem usa.

> **Atenção ao tipo da credencial.** O projeto tinha uma credencial antiga do tipo
> **"Computador"** (aplicativo desktop). Esse tipo **não serve** para o botão da
> web: a tela dele não tem sequer o campo "Origens JavaScript autorizadas". Só a
> credencial do tipo **"Aplicativo da Web"** funciona aqui.

> **Não** é preciso preencher "URIs de redirecionamento autorizados". O painel usa
> o modo *popup* do Google Identity Services, que não redireciona.

### Quem consegue entrar

Na tela **Público-alvo** (Google Auth Platform), o aplicativo está com:

- Tipo de usuário: **Externo**
- Status de publicação: **Testando**

Enquanto o status for "Testando", **só entram as contas listadas em "Usuários de
teste"** (limite de 100). Já está cadastrado:

```
isacbuzelli3@gmail.com
```

Para liberar os outros integrantes do grupo ou a equipe de Nutrição, basta
adicionar os e-mails na mesma lista: **Google Auth Platform > Público-alvo >
Usuários de teste > Add users**.

Para liberar qualquer conta Google, é preciso clicar em **Publicar app** na mesma
tela — o que exige preencher os dados da tela de consentimento e, dependendo dos
escopos, passar pela verificação do Google. Para o TCC, a lista de usuários de
teste é suficiente.

---

## Quando o sistema for publicado

1. Console do Google Cloud > **Credenciais** > abrir o cliente
   "NutriCare - Painel Web".
2. Em **Origens JavaScript autorizadas**, adicionar o endereço real
   (ex.: `https://nutricare.exemplo.com.br`). Só o domínio: sem barra no final e
   sem caminho.
3. Salvar. A alteração leva de alguns segundos a alguns minutos para valer.
4. Publicar o app na tela **Público-alvo**, ou manter a lista de usuários de teste.

### Se for preciso criar tudo do zero em outra conta

1. Console do Google Cloud > **Criar projeto**.
2. **Google Auth Platform > Público-alvo**: tipo **Externo**, preencher nome do
   app, e-mail de suporte e e-mail do desenvolvedor.
3. **Clientes > Criar cliente > Tipo: Aplicativo da Web**.
4. Adicionar as origens (`http://localhost:5173` em desenvolvimento).
5. Copiar o "ID do cliente" para os dois `.env` da tabela lá em cima.
6. Adicionar os e-mails em **Usuários de teste**.

---

## Como testar

1. Subir a API e o painel.
2. Abrir <http://localhost:5173/login> e clicar no botão do Google.
3. Escolher uma conta que esteja na lista de usuários de teste.

Resultado esperado: entra no painel. No painel web, login e cadastro usam
`POST /auth/google/nutricionista`: conta nova nasce como **nutricionista**.
Pacientes continuam no app mobile (`/auth/google/paciente`).

### Erros comuns

| O que aparece | Causa | Solução |
|---|---|---|
| `The given origin is not allowed for the given client ID` (no console do navegador) | Origem não autorizada, ou credencial do tipo errado | Conferir se o cliente é "Aplicativo da Web" e se a origem está na lista |
| O Google diz que o app não concluiu a verificação / bloqueia a conta | Conta fora da lista de usuários de teste | Adicionar o e-mail em Público-alvo > Usuários de teste |
| `Login com Google não está configurado nesta instalação` | Falta `GOOGLE_CLIENT_ID` no `.env` da API | Preencher e **reiniciar a API** |
| `Falha ao validar o token do Google: Wrong recipient` | Client ID diferente entre site e API | Deixar os dois iguais |
| Botão nem aparece | Falta `VITE_GOOGLE_CLIENT_ID` no `.env` da web | Preencher e reiniciar o Vite |

Depois de mexer em qualquer `.env`, **reiniciar o serviço** — tanto o NestJS
quanto o Vite leem essas variáveis só na inicialização.

---

## No aplicativo do celular

O botão **Continuar com Google** usa `expo-auth-session` e envia o
`id_token` para `POST /auth/google/paciente`.

### Variáveis no mobile

Arquivo `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://SEU_IP:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...mesmo Client ID web da API/painel...
```

Opcionais (recomendados em build nativo):

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Sem o Client ID web, o botão avisa que o Google não está configurado.

### Origens e redirect no Google Cloud

No cliente **Aplicativo da Web** ("NutriCare - Painel Web"), inclua:

**Origens JavaScript autorizadas**

```
http://localhost:5173
http://127.0.0.1:5173
http://localhost:8081
http://127.0.0.1:8081
```

No **Expo web** (`http://localhost:8081`) o app usa Google Identity Services
em modo popup — **não precisa** de URI de redirecionamento para esse fluxo.
Basta a origem JavaScript acima.

Para login Google no **Expo Go / app nativo** (auth-session), aí sim cadastre
as URIs de redirecionamento que o Expo mostrar no erro (ou
`projetotcc:/oauthredirect` em build standalone).

Depois de salvar as origens, reinicie o Expo (`npx expo start --clear`).

Na lista de **Usuários de teste**, use a mesma conta Google que vai entrar no app.

### Limitações

- No **Expo Go**, o fluxo OAuth funciona via `expo-auth-session`.
- Client IDs nativos de Android/iOS (com SHA-1) melhoram o fluxo em builds
  standalone; sem eles o app tenta o Client ID web.
- Apple e Facebook continuam como "em breve".
