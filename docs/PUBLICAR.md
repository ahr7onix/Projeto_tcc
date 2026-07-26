# Publicar o NutriCare na internet

Este guia coloca o sistema no ar em dois endereços públicos, sem custo:

| Peça | Onde fica | Custo |
|---|---|---|
| Banco de dados | Neon | gratuito, sem prazo |
| API | Render | gratuito |
| Painel web da nutricionista | Render | gratuito |

O aplicativo do celular **não** entra aqui — ele continua rodando pelo Expo, e
publicar na loja é um processo separado.

> **Antes de começar:** o plano gratuito do Render coloca a API para dormir
> depois de 15 minutos parada. Quando alguém acessa de novo, a primeira tela
> demora cerca de **50 segundos** para carregar. Depois disso fica normal. Avise
> quem for testar, senão parece que o sistema travou.

> **Use apenas dados fictícios neste ambiente.** O sistema ainda não pede
> autorização do paciente para ser acompanhado por um nutricionista, o que é
> exigido pela LGPD para dados de saúde. Enquanto isso não for resolvido, nada
> de paciente real.

---

## Parte 1 — Criar o banco de dados (Neon)

1. Entrar em <https://neon.tech> e criar conta (dá para usar a conta Google).
2. Clicar em **Create project**.
   - Nome: `nutricare`
   - Postgres version: a que vier por padrão
   - Region: escolher uma dos **Estados Unidos** (a mesma região do Render, na
     Parte 2, para o sistema não ficar lento)
3. Terminado, o Neon mostra uma caixa **Connection string**. Copiar o texto
   inteiro. Ele se parece com isto:

   ```
   postgresql://usuario:senha@ep-alguma-coisa.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Guardar esse texto num bloco de notas. **Ele é uma senha** — não mandar por
   grupo de WhatsApp nem colar em documento compartilhado.

---

## Parte 2 — Publicar a API (Render)

1. Entrar em <https://render.com> e criar conta usando **GitHub**.
2. Autorizar o Render a enxergar o repositório `Projeto_tcc`.
3. No painel do Render: **New +** > **Blueprint**.
4. Escolher o repositório `Projeto_tcc` e confirmar. O Render lê o arquivo
   `render.yaml` do projeto e já monta os dois serviços sozinho.
5. Ele vai pedir para preencher as variáveis que ficaram em branco:

   | Variável | O que colocar |
   |---|---|
   | `DATABASE_URL` | o texto copiado do Neon na Parte 1 |
   | `CORS_ORIGIN` | deixar em branco por enquanto (preenchemos na Parte 4) |
   | `GOOGLE_CLIENT_ID` | `579066584754-mjlmqjmtscn5lgs7depm8uvovn92lm5d.apps.googleusercontent.com` |
   | `VITE_API_URL` | deixar em branco por enquanto |
   | `VITE_GOOGLE_CLIENT_ID` | o mesmo Client ID da linha acima |

6. Clicar em **Apply**. A primeira publicação demora de 5 a 10 minutos.

Ao final existem dois endereços, mais ou menos assim:

```
API:     https://nutricare-adj-api.onrender.com
Painel:  https://nutricare-adj-painel.onrender.com
```

Os nomes exatos aparecem na tela de cada serviço. **Anotar os dois.**

### Conferir se a API subiu

Abrir no navegador: `https://nutricare-adj-api.onrender.com/status`

Deve aparecer algo assim:

```json
{"status":"ok","servico":"nutricare-api","banco":"ok","horario":"..."}
```

Se `banco` vier como `indisponivel`, o endereço do Neon está errado ou faltou
copiar o texto inteiro.

---

## Parte 3 — Ligar o painel na API

1. No Render, abrir o serviço **nutricare-adj-painel** > **Environment**.
2. Preencher `VITE_API_URL` com o endereço da API, **sem barra no final**:

   ```
   https://nutricare-adj-api.onrender.com
   ```

3. Salvar. O Render publica o painel de novo automaticamente.

> O painel é um site estático: esse endereço fica gravado dentro dele na hora da
> publicação. Por isso, toda vez que mudar essa variável, é preciso esperar a
> nova publicação terminar.

---

## Parte 4 — Ligar a API no painel

1. No Render, abrir o serviço **nutricare-adj-api** > **Environment**.
2. Preencher `CORS_ORIGIN` com o endereço do painel, **sem barra no final**:

   ```
   https://nutricare-adj-painel.onrender.com
   ```

3. Salvar e esperar reiniciar.

Sem esse passo o navegador bloqueia as chamadas do painel para a API, e as telas
ficam vazias sem explicar o motivo.

---

## Parte 5 — Liberar o login com Google

O botão "Entrar com Google" só funciona em endereços autorizados.

1. Abrir <https://console.cloud.google.com/apis/credentials>.
2. Abrir o cliente **"NutriCare - Painel Web"**.
3. Em **Origens JavaScript autorizadas**, clicar em **ADICIONAR URI** e colar o
   endereço do painel (só o domínio, sem barra no final):

   ```
   https://nutricare-adj-painel.onrender.com
   ```

4. Salvar. Pode levar alguns minutos para valer.
5. Em **Google Auth Platform > Público-alvo > Usuários de teste**, adicionar o
   e-mail de quem vai testar — inclusive o do cliente.

Detalhes e erros comuns em [LOGIN_GOOGLE.md](LOGIN_GOOGLE.md).

---

## Parte 6 — Entrar pela primeira vez

O banco nasce com um administrador e, se `SEED_DEMO` estiver como `true`, com
pacientes fictícios para o cliente ter o que olhar.

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@nutricare.local` | `NutriCare@2026` |
| Nutricionista (exemplo) | `camila.souza@nutri.com` | `Senha123!` |
| Paciente (exemplo) | `joao.silva@email.com` | `Senha123!` |

> **Essas senhas estão escritas na documentação do projeto, então valem só para
> demonstração.** Antes de qualquer uso com paciente real é obrigatório trocar a
> senha do administrador e apagar os usuários de exemplo.

Para trocar a senha do administrador, gerar um novo código com:

```bash
node database/gerar-hash-admin.js "a-senha-nova"
```

e aplicar o `UPDATE` que o comando imprime.

---

## O que fazer quando o projeto mudar

Toda vez que o código novo for enviado ao GitHub, o Render republica sozinho.
Não precisa refazer nada deste guia.

Se o banco ganhar tabelas novas, o próprio sistema aplica a mudança ao subir —
é o `preparar-banco.mjs`, que confere o que já foi aplicado antes de mexer em
qualquer coisa.

---

## Problemas comuns

| O que acontece | Causa provável | O que fazer |
|---|---|---|
| Primeira tela demora ~50 s | A API estava dormindo (plano gratuito) | Esperar; é o comportamento normal |
| Painel abre mas as listas ficam vazias | `CORS_ORIGIN` ou `VITE_API_URL` errados | Conferir as Partes 3 e 4, sem barra no final |
| `/status` responde `banco: indisponivel` | `DATABASE_URL` errada | Copiar de novo do Neon, o texto inteiro |
| Erro de certificado nos logs da API | Provedor com certificado próprio | Em nutricare-adj-api > Environment, colocar `DATABASE_SSL` = `no-verify` |
| Botão do Google some ou dá erro de origem | Endereço não autorizado no Google | Parte 5 |
| Acessar `/login` direto dá 404 | Regra de reescrita do site | Conferir se o `render.yaml` foi aplicado pelo Blueprint |

Para ver o que a API está reclamando: Render > **nutricare-adj-api** > **Logs**.
