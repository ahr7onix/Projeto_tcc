# Revisão de código — NutriCare

Revisão feita sobre o repositório completo, seguindo o checklist de segurança,
performance, clean code e arquitetura.

Legenda: 🔴 Crítico · 🟡 Aviso · 🟢 Sugestão

---

## Segurança

### 🔴 `node_modules` versionado no Git (3.778 arquivos) *(corrigido)*

**Local:** `web/web_nutricionista/node_modules/`, `web/Api/nutricare-api/node_modules/`

O repositório carregava 3.778 arquivos de dependências — 95% de tudo que estava
versionado. Isso inflava o clone, poluía todo `git diff` e fixava versões
vulneráveis no histórico.

A causa foi o [sincronizar.ps1](../sincronizar.ps1), que roda `git add .` + `commit`
+ `push` a cada 10 segundos (daí os commits "Salvo automaticamente"). O `.gitignore`
da raiz já cobria `node_modules/`, mas `.gitignore` não desfaz o que já estava
rastreado.

**Correção aplicada:** `git rm -r --cached` nas duas pastas. Os arquivos continuam no
disco; só saíram do controle de versão. A contagem de arquivos rastreados caiu de
**3.986 para 205**.

---

### 🔴 Arquivos `.env` versionados *(corrigido)*

**Local:** `web/web_nutricionista/.env`, `web/web_nutricionista/.env.backup`,
`web/Api/nutricare-api/.env`

O `.env` do painel web contém o **Google OAuth Client ID** real do projeto.
Client ID não é segredo por si só (aparece no navegador), mas versionar `.env`
é um hábito que cedo ou tarde vaza um Client Secret ou uma senha de banco.
O `.env.backup` é especialmente perigoso: arquivos de backup escapam de regras
de `.gitignore` escritas para `.env`.

**Correção aplicada:** removidos do versionamento com `git rm --cached`. O
`.gitignore` da raiz já tinha `.env`, `.env.*` e a exceção `!.env.example`, então
nenhuma alteração nele foi necessária. Os três `.env.example` continuam versionados.

---

### 🟡 O histórico do Git não foi reescrito *(decisão consciente)*

Os `node_modules` e os `.env` saíram do estado atual, mas **continuam nos commits
antigos**. Limpar isso exigiria `git filter-repo` ou BFG seguido de `push --force`,
o que reescreve todos os hashes e quebra os clones do Natan e do Henrique no meio
do TCC — qualquer trabalho não commitado deles vira conflito.

Como o único dado sensível envolvido é um Google **Client ID** (público por
natureza, aparece no navegador de qualquer usuário) e não um Client Secret, o risco
não justifica a quebra. Decisão: **não reescrever**. Se um segredo real for
commitado algum dia, o procedimento correto é revogá-lo no provedor primeiro e só
depois considerar a reescrita.

---

### 🔴 Cadastro de nutricionista não criava o perfil *(corrigido nesta rodada)*

**Local:** `apps/api/src/modules/auth/auth.service.ts`

O `cadastro` inseria em `usuario` e, quando o perfil era paciente, também em
`paciente` — mas **nunca inseria em `nutricionista`**. Toda conta de nutricionista
ficava sem perfil, quebrando planos, vínculos e relatórios. O mesmo valia para o
fluxo do Google.

Detectado ao rodar o sistema de ponta a ponta. Corrigido, com a migration `004`
tornando o CRN opcional no cadastro.

---

### 🟡 Vínculo sem consentimento do paciente *(registrado — correção fica como trabalho futuro)*

**Local:** `apps/api/src/modules/vinculos/vinculos.service.ts`

Um nutricionista vincula qualquer paciente cadastrado sem aprovação dele, e passa a
ver glicemia, peso, alimentação e histórico. Em dados de saúde, isso conflita com o
princípio de consentimento da LGPD (art. 11 trata dados de saúde como sensíveis).

**Correção sugerida:** adicionar `status` (`pendente` / `aceito` / `recusado`) ao
vínculo, liberando o acesso apenas após aceite do paciente pelo app.

A limitação, a análise legal e o desenho da correção estão documentados em
[LIMITACOES_LGPD.md](LIMITACOES_LGPD.md), com um parágrafo pronto para a seção de
limitações da monografia. Enquanto não for implementada, vale a regra já em vigor:
**o ambiente publicado opera somente com dados fictícios**.

---

### 🟡 CRN não é validado

**Local:** `apps/api/src/modules/auth/dto/cadastro.dto.ts`

O CRN é aceito como texto livre. Qualquer pessoa pode se cadastrar como
nutricionista e acessar dados clínicos. Não há API pública do CFN para validação
automática, então a mitigação realista é aprovação manual pelo administrador —
que agora existe. Registrado junto com o item anterior em
[LIMITACOES_LGPD.md](LIMITACOES_LGPD.md).

---

### 🟢 SQL: interpolação presente, mas sem risco de injeção

A varredura apontou vários `${}` dentro de queries. Auditando um a um, todos
interpolam **identificadores construídos internamente** (nomes de coluna escolhidos
por `if`, listas de condições montadas pelo próprio código), nunca entrada do
usuário. Os valores vindos do cliente sempre passam por `$1, $2...`.

Exemplo em `mensagens.service.ts`:

```ts
const coluna = user.role === 'paciente'
  ? { proprio: 'up.id_usuario', outro: 'un.id_usuario' }
  : { proprio: 'un.id_usuario', outro: 'up.id_usuario' };
```

O valor vem de um literal do código, não da requisição. Está correto — mas é um
padrão que exige disciplina: basta alguém interpolar um `req.query` num desses
templates para abrir uma injeção. Vale um comentário de alerta ou uma allowlist
explícita.

---

### 🟢 Proteção contra CSV injection já aplicada

`relatorios.service.ts` prefixa com aspa simples células que começam com `=`, `+`,
`-` ou `@`, impedindo que uma observação do paciente vire fórmula executável no
Excel. Bom detalhe, frequentemente esquecido.

---

## Performance

### 🟢 N+1 evitado na listagem de planos

`planos.service.ts` carrega todas as refeições em uma query com
`WHERE id_plano = ANY($1::bigint[])` e agrupa em memória, em vez de uma query por
plano.

### 🟡 Alertas calculados em memória

**Local:** `apps/api/src/modules/alertas/alertas.service.ts`

O serviço traz todos os registros do período e classifica em JavaScript. Com poucos
pacientes é irrelevante; em escala, filtrar no banco (via coluna materializada ou
`CASE` no SQL) evitaria trafegar registros normais que serão descartados.

Para o porte da ADJ Birigui, a solução atual é adequada — otimizar agora seria
prematuro.

### 🟡 Polling em vez de WebSocket

As mensagens recarregam a cada 15 s (conversa) e 30 s (lista). Simples de defender
na banca, mas gera requisições constantes mesmo sem novidade. WebSocket (Socket.IO)
resolveria, ao custo de infraestrutura maior.

---

## Clean code

### 🟡 API duplicada e sem uso aparente *(corrigido — removida)*

**Local:** `web/Api/nutricare-api/server.js` (557 linhas)

Existia uma segunda API em Express, separada da NestJS em `apps/api`. Ter dois
backends confunde quem lê o projeto e cria risco de divergência de regras — e um
avaliador da banca certamente perguntaria por que há duas.

Confirmado que era código morto: o mock guardava tudo em memória, sem banco, na
porta 3333, enquanto o painel web sempre apontou para `http://localhost:3000`
(`web/web_nutricionista/src/lib/api.ts:3`). Nenhum arquivo do projeto o referenciava.

**Correção aplicada:** `git rm -r web/Api`. O código continua recuperável pelo
histórico do Git, se algum dia fizer falta.

### 🟢 `console.log` em produção

**Local:** `apps/api/src/main.ts:27`

Único caso, no boot, com `eslint-disable` explícito. Aceitável. Idealmente usaria o
`Logger` do Nest, como já feito em `push.service.ts`.

### 🟢 Uso de `any` restrito

Apenas dois casos, ambos em `catch` — situação em que o TypeScript realmente não
garante o tipo. O correto seria `catch (error: unknown)` com verificação, mas o
impacto é baixo.

---

## Arquitetura

### 🟢 Separação de responsabilidades consistente

Controller (HTTP) → Service (regra de negócio) → Pool (dados). Guards centralizam
autorização em vez de espalhar `if (role === ...)` pelos serviços. Módulos coesos e
com fronteiras claras.

### 🟢 Regra de negócio única para glicemia

`common/glicemia/glicemia.ts` é a única fonte de classificação, consumida por
registros, alertas e relatórios. Mudar uma faixa de referência altera o sistema
inteiro de forma coerente — importante num sistema de saúde, onde divergência entre
telas seria grave.

### 🔴 Docker subia sem administrador *(corrigido)*

**Local:** `docker-compose.yml`

Encontrado depois da revisão original. O serviço `postgres` montava como scripts de
inicialização apenas `schema.sql` e `seeds.sql` — `seeds_admin.sql` ficava de fora.
Resultado: **quem subisse o projeto por `docker compose up` não tinha nenhuma conta
de administrador**, e o painel `/admin` era inacessível. Só funcionava para quem
rodasse os `psql` manuais do README.

**Correção aplicada:** adicionado o mount
`./database/seeds_admin.sql:/docker-entrypoint-initdb.d/03-admin.sql:ro`.

Vale lembrar que os scripts de `docker-entrypoint-initdb.d` só rodam com o volume
vazio. Num banco já criado, é preciso `docker compose down -v` (apaga os dados) ou
aplicar o seed à mão.

---

### 🟡 Sem controle de versão de migrations

As migrations são arquivos soltos aplicados manualmente. Não há registro do que já
rodou, então reaplicar é responsabilidade de quem executa. Ferramentas como
`node-pg-migrate` ou `Flyway` resolveriam. Para o TCC, documentar a ordem no README
(feito) é suficiente.

### 🟡 Cobertura de testes concentrada *(ampliada nesta rodada)*

Eram 104 testes, cobrindo classificação de glicemia, `RolesGuard`,
`VinculosService`, os cálculos nutricionais e os cinco módulos novos (alimentos,
antropometria, emocional, receitas e lembretes). Faltavam justamente os três
serviços mais longos.

Foram acrescentados **57 testes** — `planos.service.spec.ts` (21),
`relatorios.service.spec.ts` (17) e `mensagens.service.spec.ts` (19) —, chegando a
**161 testes em 12 suítes, todos passando**. O foco foi em regra de negócio e
autorização, não em cobertura de linha:

- **Planos:** validação de período e de macros antes de qualquer acesso ao banco,
  transação (`BEGIN` → `COMMIT`, `ROLLBACK` no erro, `release` sempre), alimento
  inexistente, item sem alimento e sem descrição, autorização por plano (paciente
  de outro, nutricionista de outro), soma de macronutrientes ignorando itens de
  texto livre e contando-os em `itensSemAnalise`.
- **Relatórios:** `pacienteId` forjado por paciente é ignorado, vínculo exigido do
  nutricionista, período (30 dias padrão, teto de 365, entradas inválidas),
  estatísticas (média, desvio padrão amostral, percentual na faixa, contagem de
  hipo/hiper/críticos, agrupamento por momento), IMC e média de carboidratos, e o
  CSV (neutralização de fórmula, aspas, BOM, CRLF, nome do arquivo).
- **Mensagens:** conversa e envio bloqueados sem vínculo ativo, coluna de busca
  conforme o papel de quem pede, limite padrão e teto, ordem cronológica, marcação
  de lida só das mensagens da outra pessoa, e mensagem entregue mesmo quando o
  push falha.

Continua sem teste automatizado a camada de controllers (contratos HTTP) e o app
mobile, que ainda não tem runner de teste configurado — esse é o trabalho futuro
que resta neste item.

---

## Resumo

| Severidade | Quantidade | Situação |
|---|---|---|
| 🔴 Crítico | 4 | todos corrigidos |
| 🟡 Aviso | 8 | 2 corrigidos, 3 decisões registradas, 3 em aberto |
| 🟢 Sugestão/positivo | 6 | — |

**Corrigido nesta rodada:**

1. ✅ `node_modules` e `.env` fora do versionamento (3.986 → 205 arquivos rastreados)
2. ✅ API Express duplicada (`web/Api`) removida
3. ✅ `seeds_admin.sql` carregado pelo Docker — antes ninguém tinha conta de admin
4. ✅ Senha do administrador trocada, com `database/gerar-hash-admin.js` para gerar
   um hash próprio
5. ✅ Limitações de consentimento no vínculo e de validação do CRN registradas em
   [LIMITACOES_LGPD.md](LIMITACOES_LGPD.md), com parágrafo pronto para a seção de
   limitações da monografia
6. ✅ Refresh token automático no mobile, com fila de requisições e rotação
   persistida — e, junto dele, dois defeitos vizinhos: a web não guardava o
   refresh token rotacionado (o segundo refresh sempre derrubava a sessão) e o
   `logout()` do mobile não enviava o token, então nunca revogava nada no servidor
7. ✅ Testes de planos, relatórios e mensagens: 104 → **161 testes, 12 suítes,
   todos passando**

**Ainda pendente antes da entrega:**

1. Conferência das faixas glicêmicas, dos 36 alimentos de exemplo e das fórmulas
   pelo curso de Nutrição — o roteiro está em
   [CONFERENCIA_NUTRICAO.md](CONFERENCIA_NUTRICAO.md), com bloco de assinatura no
   fim. É dependência externa: enquanto não voltar assinado, a coluna `fonte` dos
   alimentos continua em `exemplo`
2. Manter a regra de **somente dados fictícios** no ambiente publicado, enquanto o
   aceite do vínculo pelo paciente não existir
