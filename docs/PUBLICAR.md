# Publicar o NutriCare na internet

O sistema já está publicado. Este documento registra como isso foi feito e o que
é preciso saber para manter o ambiente no ar.

## Endereços

| Peça | Endereço |
|---|---|
| Painel web da nutricionista | <https://nutricare-adj-painel.onrender.com> |
| API | <https://nutricare-adj-api.onrender.com> |
| Estado do sistema | <https://nutricare-adj-api.onrender.com/status> |

O aplicativo do celular **não** entra aqui — ele continua rodando pelo Expo, e
publicar na loja é um processo separado.

> **A primeira tela demora cerca de 50 segundos.** No plano gratuito, o servidor
> desliga depois de 15 minutos parado e precisa ligar de novo quando alguém
> acessa. Depois disso a navegação fica normal. Avise quem for testar, senão
> parece que o sistema travou.

> **Use apenas dados fictícios neste ambiente.** O sistema ainda não pede
> autorização do paciente para ser acompanhado por um nutricionista, o que é
> exigido pela LGPD para dados de saúde. Enquanto isso não for resolvido, nada
> de paciente real.

> **O banco de dados gratuito do Render expira em 30 dias.** Antes disso é
> preciso trocar para o plano pago ou criar um banco novo. Para uso além da
> demonstração, vale migrar para um provedor com plano gratuito sem prazo, como
> Neon ou Supabase.

---

## Como entrar

O banco nasce com um administrador e, como `SEED_DEMO` está como `true`, com
pacientes fictícios para o cliente ter o que olhar.

| Perfil | E-mail | Senha |
|---|---|---|
| Nutricionista (exemplo) | `camila.souza@nutri.com` | `Senha123!` |
| Administrador | `admin@nutricare.local` | `NutriCare@2026` |
| Paciente (exemplo) | `joao.silva@email.com` | `Senha123!` |

O paciente entra pelo aplicativo do celular, não pelo painel web.

> **Essas senhas estão escritas na documentação do projeto, então valem só para
> demonstração.** Antes de qualquer uso com paciente real é obrigatório trocar a
> senha do administrador e apagar os usuários de exemplo.

Para trocar a senha do administrador, gerar um novo código com:

```bash
node database/gerar-hash-admin.js "a-senha-nova"
```

e aplicar o `UPDATE` que o comando imprime.

---

## Como foi publicado

Tudo está descrito no arquivo `render.yaml`, na raiz do projeto. O Render lê esse
arquivo e monta sozinho as três peças, todas no plano gratuito:

| Nome no Render | O que é |
|---|---|
| `nutricare-adj-db` | banco de dados PostgreSQL |
| `nutricare-adj-api` | a API |
| `nutricare-adj-painel` | o painel web, site estático |

Os nomes viram o endereço do site e são únicos no mundo todo. `nutricare-api` e
`nutricare-painel` já estavam ocupados por outro projeto, por isso o `-adj`.

**Não há nada para preencher à mão.** O endereço do banco e os endereços dos dois
serviços já estão amarrados dentro do `render.yaml`. Foi assim que se fez:

1. Criar conta em <https://render.com> usando **GitHub**.
2. Autorizar o Render a enxergar o repositório `Projeto_tcc`.
3. No painel do Render: **New +** > **Blueprint**.
4. Escolher o repositório `Projeto_tcc` e clicar em **Deploy Blueprint**.

A primeira publicação demora de 5 a 10 minutos.

### Conferir se está tudo de pé

Abrir <https://nutricare-adj-api.onrender.com/status>. Deve aparecer:

```json
{"status":"ok","servico":"nutricare-api","banco":"ok","horario":"..."}
```

Se `banco` vier como `indisponivel`, o banco de dados caiu ou expirou.

---

## Login com Google

O botão "Entrar com Google" só funciona em endereços autorizados. O endereço do
painel publicado **já foi autorizado**. Se um dia o endereço mudar:

1. Abrir <https://console.cloud.google.com/apis/credentials>.
2. Abrir o cliente **"NutriCare - Painel Web"**.
3. Em **Origens JavaScript autorizadas**, clicar em **ADICIONAR URI** e colar o
   endereço novo (só o domínio, sem barra no final).
4. Salvar. Pode levar alguns minutos para valer.

O aplicativo ainda está em modo de teste no Google, então **só entra quem estiver
na lista de testadores**. Para liberar mais alguém, ir em **Google Auth Platform
> Público-alvo > Usuários de teste** e adicionar o e-mail.

Detalhes e erros comuns em [LOGIN_GOOGLE.md](LOGIN_GOOGLE.md).

---

## O que fazer quando o projeto mudar

Toda vez que o código novo for enviado ao GitHub, o Render republica sozinho.
Não precisa refazer nada deste guia.

Se o banco ganhar tabelas novas, o próprio sistema aplica a mudança ao subir —
é o `preparar-banco.mjs`, que confere o que já foi aplicado antes de mexer em
qualquer coisa.

---

## Trocar o banco por um sem prazo

O banco do Render tem 30 dias de validade e leva a demonstração junto quando
vence. Neon e Supabase têm plano gratuito sem prazo. A troca leva poucos
minutos porque o `preparar-banco.mjs` monta a estrutura inteira do zero — não é
preciso migrar dado nenhum enquanto o ambiente for de demonstração.

**1. Crie o banco no provedor novo** e copie a string de conexão. Ela se parece
com `postgres://usuario:senha@host/base?sslmode=require`.

**2. No Render**, abra o serviço **nutricare-adj-api** → *Environment* e troque:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a string de conexão do provedor novo |
| `DATABASE_SSL` | `no-verify` para Supabase; `true` para Neon |

O `no-verify` existe para provedores que servem certificado próprio. Se a API
subir e o `/status` responder `banco: indisponivel` com erro de certificado, é
esse valor que está errado — os modos aceitos estão comentados no
`apps/api/src/database/database.module.ts`.

**3. Salve.** O Render republica sozinho, e o `preparar-banco.mjs` roda no start:
cria as tabelas, aplica as migrations e carrega o administrador inicial. Com
`SEED_DEMO` em `true`, os pacientes fictícios voltam também.

**4. Confira** em `/status` que o banco responde, e entre uma vez no painel para
ver que o login funciona.

**5. Fixe a mudança no repositório.** Trocar a variável só pelo painel do Render
funciona, mas o `render.yaml` continuaria apontando para o banco antigo, e quem
aplicasse o arquivo de novo voltaria atrás. Remova o bloco `databases:` do topo
e troque o `fromDatabase` do `DATABASE_URL` por um `sync: false`, que diz ao
Render para não gerenciar o valor:

```yaml
      - key: DATABASE_URL
        sync: false
```

Se um dia houver dado que valha a pena preservar, aí sim é `pg_dump` do banco
antigo e `psql` no novo, antes do passo 3.

---

## Problemas comuns

| O que acontece | Causa provável | O que fazer |
|---|---|---|
| Primeira tela demora ~50 s | O servidor estava desligado (plano gratuito) | Esperar; é o comportamento normal |
| Painel abre mas as listas ficam vazias | `CORS_ORIGIN` ou `VITE_API_URL` errados | Conferir no `render.yaml`, sem barra no final |
| `/status` responde `banco: indisponivel` | Banco caiu ou passou dos 30 dias | Ver **nutricare-adj-db** no Render |
| Erro de certificado nos logs da API | Provedor com certificado próprio | `DATABASE_SSL` = `no-verify` |
| Botão do Google some ou dá erro de origem | Endereço não autorizado no Google | Ver "Login com Google" acima |
| Um endereço interno dá "Not Found" | O Render reserva alguns caminhos, como `/dashboard` | Usar outro nome de rota; foi o que se fez com a tela inicial (`/inicio`) |

Para ver o que a API está reclamando: Render > **nutricare-adj-api** > **Logs**.
