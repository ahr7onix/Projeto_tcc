# NutriCare — Acompanhamento nutricional para pacientes com diabetes

Trabalho de Conclusão de Curso — Tecnologia em Desenvolvimento de Sistemas
Centro Universitário Católico Salesiano Auxilium, Araçatuba, 2026

Autores: Natan Lourenço e Silva, Isac Buzelli dos Santos, Henrique Payá Ferreira
Orientador: Francisco Antônio de Souza

Ecossistema digital desenvolvido em parceria com o curso de Nutrição, com aplicação
prevista na ADJ (Associação de Diabetes Juvenil) de Birigui.

[![CI](https://github.com/ahr7onix/Projeto_tcc/actions/workflows/ci.yml/badge.svg)](https://github.com/ahr7onix/Projeto_tcc/actions/workflows/ci.yml)

---

## Arquitetura

| Módulo | Caminho | Stack |
|---|---|---|
| API | `apps/api` | NestJS 10, TypeScript, PostgreSQL (driver `pg`) |
| App mobile | `apps/mobile` | Expo SDK 54, React Native 0.81, Expo Router 6, React Query, Zustand |
| Painel web | `apps/web` | React 18, Vite, React Router 6, Axios |
| Banco | `database` | PostgreSQL 16 — schema + migrations |

Perfis de usuário: **paciente** (mobile), **nutricionista** (web) e **administrador** (web).

---

## Como rodar

A raiz tem um `package.json` que encaminha os comandos para os três projetos,
para não precisar entrar em cada pasta:

| Comando | O que faz |
|---|---|
| `npm run instalar` | instala as dependências dos três projetos |
| `npm run verificar` | typecheck dos três + testes da API + build |
| `npm run typecheck` | só a verificação de tipos, nos três |
| `npm test` | testes da API |
| `npm run dev:api` · `dev:web` · `dev:mobile` | sobe cada aplicação |
| `npm run db:preparar` | cria e atualiza as tabelas do banco |
| `npm run db:verificar` | confere se o `schema.sql` está em dia com as migrations |

Cada projeto mantém o seu próprio `package.json` e `package-lock.json`. A raiz
só delega — não são workspaces do npm, de propósito: o Render instala cada
serviço isoladamente pelo seu `rootDir`, e workspaces quebrariam isso.

O passo a passo detalhado, projeto por projeto:

### 1. Banco de dados

```bash
createdb nutricare
DATABASE_URL=postgres://localhost/nutricare npm run db:preparar
```

O `db:preparar` aplica o `schema.sql` num banco vazio, roda as migrations que
ainda faltam e carrega os dados iniciais. Pode ser executado quantas vezes for
preciso: ele anota na tabela `migracao_aplicada` o que já passou.

#### As duas fontes de verdade

A estrutura do banco está escrita em dois lugares que precisam concordar:

| Arquivo | Para que serve |
| --- | --- |
| `database/schema.sql` | o retrato completo, aplicado em banco vazio |
| `database/migrations/*.sql` | os deltas, aplicados em banco que já existe |

Toda migration nova tem que ser levada **também** para o `schema.sql` — e a
migration continua onde está, porque os bancos que já rodam dependem dela.

Isso não é preciosismo: a tabela `mensagem` entrou só na migration 003 e nunca
no `schema.sql`, então todo banco novo nascia sem ela e qualquer chamada a
`/mensagens` respondia 500. A migration 014 existe só para remendar aquilo.

Quem garante que não acontece de novo é o `npm run db:verificar`, que monta os
dois caminhos em bancos descartáveis e compara a estrutura resultante. Ele roda
no CI a cada push, no job **Banco (schema.sql x migrations)**. Precisa de um
PostgreSQL onde dê para criar bancos — o do `docker-compose` serve:

```bash
docker compose up -d postgres
npm run db:verificar
```

Enquanto essa verificação estiver verde, os três caminhos de instalação
(`schema.sql` puro, `db:preparar` e o `docker-compose`) produzem a mesma
estrutura.

O `seeds_alimentos.sql` carrega 36 alimentos com valores **aproximados**, só para o
sistema não nascer vazio. Eles ficam marcados com `fonte = 'exemplo'` e devem ser
substituídos pela tabela oficial assim que a equipe de Nutrição indicar qual usar.

Sem o `psql` instalado, dá para aplicar os mesmos arquivos pelo Node:

```bash
cd apps/api
node aplicar-sql.mjs ../../database/migrations/007_briefing_nutricao.sql
node conferir-banco.mjs
```

O seed cria o administrador inicial:

- e-mail: `admin@nutricare.local`
- senha: `NutriCare@2026`

**Essa senha está publicada aqui, então vale só para desenvolvimento.** Antes de
qualquer uso real, gere um hash próprio e substitua o do seed:

```bash
node database/gerar-hash-admin.js "sua-senha-forte"
```

O script imprime o hash bcrypt para colar em `database/seeds_admin.sql` e o
`UPDATE` equivalente, caso o banco já exista.

### 2. API

```bash
cd apps/api
npm install
cp .env.example .env      # ajuste DATABASE_URL e JWT_SECRET
npm run start:dev
```

Sobe em `http://localhost:3000`.

### 3. Painel web

```bash
cd apps/web
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm run dev
```

Acesse `http://localhost:5173`.

### 4. App mobile

```bash
cd apps/mobile
npm install
cp .env.example .env      # EXPO_PUBLIC_API_URL=http://SEU_IP:3000
npm start
```

Use o IP da máquina na rede local, não `localhost` — o celular não enxerga o
`localhost` do computador.

### Docker

```bash
docker compose up -d --build
```

Sobe o PostgreSQL 16 na porta **5433** e a API na **3000**. Na primeira execução o
container do banco aplica sozinho `schema.sql`, `seeds.sql` e `seeds_admin.sql` —
não é preciso rodar o `psql` da seção 1.

Os scripts de inicialização só rodam com o volume vazio. Para reaplicá-los depois de
mudar o schema: `docker compose down -v` (isso apaga os dados).

---

## Publicar na internet

O sistema está no ar no Render, plano gratuito:

| Peça | Endereço |
|---|---|
| Painel web | <https://nutricare-adj-painel.onrender.com> |
| API | <https://nutricare-adj-api.onrender.com> |

O arquivo `render.yaml` na raiz descreve as três peças — banco, API e painel web
— e o Render as monta sozinho a partir dele. Detalhes, credenciais de acesso e
limitações do plano gratuito em [docs/PUBLICAR.md](docs/PUBLICAR.md).

**Esse ambiente é só para demonstração, com dados fictícios.** O banco gratuito
expira em 30 dias e o sistema ainda não pede autorização do paciente para ser
acompanhado por um nutricionista (LGPD).

Para preparar um banco novo, em vez de rodar os arquivos `.sql` na mão:

```bash
cd apps/api
DATABASE_URL=... node preparar-banco.mjs
```

O script cria a estrutura na primeira execução, aplica só as migrations
pendentes nas seguintes e anota tudo na tabela `migracao_aplicada`. Definir
`SEED_DEMO=true` carrega também os usuários e registros fictícios de exemplo.

A rota pública `GET /status` responde se a API e o banco estão de pé — é o que o
servidor de hospedagem usa para monitorar o serviço.

---

## Testes

```bash
cd apps/api
npm test              # suíte completa
npm run test:cov      # com cobertura
```

---

## Funcionalidades por requisito

> A numeração abaixo é interna do projeto e **não** é a do briefing da equipe de
> Nutrição (RF01–RF10). O comparativo contra os requisitos do cliente está em
> [docs/RESUMO_ENTREGA.md](docs/RESUMO_ENTREGA.md).

| Req. | Descrição | Situação |
|---|---|---|
| RF01 | Cadastro de usuários | Implementado |
| RF02 | Login e autenticação (JWT + Google OAuth) | Implementado — Google funcionando no painel web; detalhes em [docs/LOGIN_GOOGLE.md](docs/LOGIN_GOOGLE.md). No app mobile o login social ainda não funciona |
| RF03 | Registro de glicemia | Implementado |
| RF04 | Registro de alimentação | Implementado |
| RF05 | Registro de peso e dados de saúde | Implementado |
| RF06 | Histórico de registros | Implementado |
| RF07 | Nutricionista visualiza dados do paciente | Implementado |
| RF08 | Planos alimentares personalizados | Implementado |
| RF09 | Acompanhamento da evolução | Implementado |
| RF10 | Relatórios (CSV e PDF via impressão) | Implementado |
| RF11 | Comunicação paciente ↔ nutricionista | Implementado |
| RF12 | Conteúdos educativos | Implementado |
| RF13 | Gestão administrativa | Implementado |
| RF14 | Integração web + mobile | Implementado |

---

## Regras de negócio aplicadas no código

| Regra | Onde é garantida |
|---|---|
| RN01 — paciente só acessa os próprios dados | `planos.service.ts`, `relatorios.service.ts`, filtros por `id_usuario` |
| RN02 — nutricionista só acessa pacientes vinculados | `vinculos.service.ts` + tabela `nutricionista_paciente` |
| RN05 — apenas nutricionistas criam planos | `@Roles('nutricionista')` + `RolesGuard` |
| RN06 — apenas administradores gerenciam usuários | `@Roles('administrador')` no `AdminController` |
| RN07 — registros vão para o histórico | Tabelas `registro_glicemia` e `registro_refeicao` |
| RN10 — acesso separado por perfil | `RolesGuard` + rotas distintas em web e mobile |

---

## Principais endpoints

```
GET    /status                        Estado da API e do banco (público)

POST   /auth/cadastro                 Cadastro (paciente ou nutricionista)
POST   /auth/login                    Login por e-mail e senha
POST   /auth/google                   Login social
POST   /auth/refresh                  Renovação do access token

GET    /pacientes                     Pacientes vinculados ao nutricionista
GET    /pacientes/disponiveis         Pacientes ainda não vinculados
GET    /pacientes/:id                 Detalhe (exige vínculo)

GET    /vinculos                      Lista vínculos ativos
POST   /vinculos                      Vincula paciente
DELETE /vinculos/:pacienteId          Encerra vínculo

GET    /planos                        Planos (filtrado por perfil)
GET    /planos/ativo                  Plano vigente hoje
POST   /planos                        Cria plano (nutricionista)
PATCH  /planos/:id                    Atualiza plano
DELETE /planos/:id                    Remove plano

POST   /registros/glicemia            Registra glicemia (devolve avaliação)
POST   /registros/refeicao            Registra refeição
GET    /registros                     Histórico

GET    /alertas                       Medições fora da faixa
GET    /alertas/resumo                Consolidado de alertas

GET    /relatorios                    Relatório consolidado (JSON)
GET    /relatorios/csv                Exportação CSV

GET    /mensagens                     Conversas
GET    /mensagens/:contraparteId      Histórico da conversa
POST   /mensagens                     Envia mensagem
GET    /mensagens/nao-lidas           Contador

GET    /conteudos                     Conteúdos educativos
POST   /conteudos                     Cria conteúdo (nutri ou admin)
PATCH  /conteudos/:id                 Atualiza
DELETE /conteudos/:id                 Remove

GET    /admin/metricas                Métricas do sistema (admin)
GET    /admin/usuarios                Lista usuários (admin)
DELETE /admin/usuarios/:id            Remove usuário (admin)

POST   /push/token                    Registra token de push
DELETE /push/token                    Remove token
```

---

## Faixas de referência glicêmica

A classificação usada em alertas e relatórios está em
`apps/api/src/common/glicemia/glicemia.ts`:

| Momento | Faixa alvo (mg/dL) |
|---|---|
| Jejum | 70 – 130 |
| Pré-refeição | 70 – 130 |
| Pós-refeição | 70 – 180 |
| Antes de dormir | 90 – 150 |
| Madrugada | 70 – 140 |
| Aleatório | 70 – 180 |

Limiares críticos: hipoglicemia grave abaixo de 54 e hiperglicemia grave acima de 250.

**Estes valores são referências gerais e devem ser validados com o curso de Nutrição
antes de qualquer uso clínico.** Alvos glicêmicos variam conforme tipo de diabetes,
idade, gestação e condição individual do paciente.

---

## Limitações conhecidas

- As mensagens usam polling (15 s na conversa, 30 s na lista), não WebSocket
- O PDF é gerado pelo diálogo de impressão do navegador, não no servidor
- Não há aprovação do paciente ao ser vinculado por um nutricionista
- O CRN não é validado junto ao conselho profissional
- A cobertura de testes concentra-se nas regras críticas, não na API inteira
