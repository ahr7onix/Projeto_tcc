# NutriCare — Acompanhamento nutricional para pacientes com diabetes

Trabalho de Conclusão de Curso — Tecnologia em Desenvolvimento de Sistemas
Centro Universitário Católico Salesiano Auxilium, Araçatuba, 2026

Autores: Natan Lourenço e Silva, Isac Buzelli dos Santos, Henrique Payá Ferreira
Orientador: Francisco Antônio de Souza

Ecossistema digital desenvolvido em parceria com o curso de Nutrição, com aplicação
prevista na ADJ (Associação de Diabetes Juvenil) de Birigui.

---

## Arquitetura

| Módulo | Caminho | Stack |
|---|---|---|
| API | `apps/api` | NestJS 10, TypeScript, PostgreSQL (driver `pg`) |
| App mobile | `apps/mobile` | React Native 0.76, Expo Router 4, React Query, Zustand |
| Painel web | `web/web_nutricionista` | React 18, Vite, React Router 6, Axios |
| Banco | `database` | PostgreSQL 16 — schema + migrations |

Perfis de usuário: **paciente** (mobile), **nutricionista** (web) e **administrador** (web).

---

## Como rodar

### 1. Banco de dados

```bash
createdb nutricare
psql nutricare -f database/schema.sql
psql nutricare -f database/migrations/001_registro_refeicao.sql
psql nutricare -f database/migrations/002_nutricionista_paciente.sql
psql nutricare -f database/migrations/003_mensagem.sql
psql nutricare -f database/migrations/004_nutricionista_crn_opcional.sql
psql nutricare -f database/migrations/005_administrador.sql
psql nutricare -f database/migrations/006_push_token.sql
psql nutricare -f database/seeds_admin.sql
```

O `schema.sql` já contém tudo para uma instalação nova. As migrations existem para
atualizar bancos que já estavam rodando — aplique-as apenas nesse caso.

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
cd web/web_nutricionista
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

## Testes

```bash
cd apps/api
npm test              # suíte completa
npm run test:cov      # com cobertura
```

---

## Funcionalidades por requisito

| Req. | Descrição | Situação |
|---|---|---|
| RF01 | Cadastro de usuários | Implementado |
| RF02 | Login e autenticação (JWT + Google OAuth) | Implementado |
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
