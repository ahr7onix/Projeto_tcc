# Revisão de código — NutriCare

Revisão feita sobre o repositório completo, seguindo o checklist de segurança,
performance, clean code e arquitetura.

Legenda: 🔴 Crítico · 🟡 Aviso · 🟢 Sugestão

---

## Segurança

### 🔴 `node_modules` versionado no Git (3.778 arquivos)

**Local:** `web/web_nutricionista/node_modules/`, `web/Api/nutricare-api/node_modules/`

O repositório carrega 3.778 arquivos de dependências. Isso infla o clone para 132 MB,
polui todo `git diff` e pode expor versões vulneráveis fixadas no histórico.

**Correção:**

```bash
git rm -r --cached web/web_nutricionista/node_modules
git rm -r --cached web/Api/nutricare-api/node_modules
echo "node_modules/" >> .gitignore
git commit -m "chore: remove node_modules do versionamento"
```

Existe `.gitignore` em `apps/api`, mas não na raiz nem nas pastas de `web/`.

---

### 🔴 Arquivos `.env` versionados

**Local:** `web/web_nutricionista/.env`, `web/web_nutricionista/.env.backup`,
`web/Api/nutricare-api/.env`

O `.env` do painel web contém o **Google OAuth Client ID** real do projeto.
Client ID não é segredo por si só (aparece no navegador), mas versionar `.env`
é um hábito que cedo ou tarde vaza um Client Secret ou uma senha de banco.
O `.env.backup` é especialmente perigoso: arquivos de backup escapam de regras
de `.gitignore` escritas para `.env`.

**Correção:** remover do versionamento, manter apenas `.env.example`, e adicionar
`.env*` ao `.gitignore` (com exceção explícita para `!.env.example`).

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

### 🟡 Vínculo sem consentimento do paciente

**Local:** `apps/api/src/modules/vinculos/vinculos.service.ts`

Um nutricionista vincula qualquer paciente cadastrado sem aprovação dele, e passa a
ver glicemia, peso, alimentação e histórico. Em dados de saúde, isso conflita com o
princípio de consentimento da LGPD (art. 11 trata dados de saúde como sensíveis).

**Correção sugerida:** adicionar `status` (`pendente` / `aceito` / `recusado`) ao
vínculo, liberando o acesso apenas após aceite do paciente pelo app. Para o TCC, no
mínimo vale registrar essa limitação na monografia.

---

### 🟡 CRN não é validado

**Local:** `apps/api/src/modules/auth/dto/cadastro.dto.ts`

O CRN é aceito como texto livre. Qualquer pessoa pode se cadastrar como
nutricionista e acessar dados clínicos. Não há API pública do CFN para validação
automática, então a mitigação realista é aprovação manual pelo administrador —
que agora existe.

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

### 🟡 API duplicada e sem uso aparente

**Local:** `web/Api/nutricare-api/server.js` (557 linhas)

Existe uma segunda API em Express, separada da NestJS em `apps/api`. Ter dois
backends confunde quem lê o projeto e cria risco de divergência de regras. Se não
estiver em uso, remova; se estiver, documente o papel de cada uma.

Isso vale especialmente para a banca: um avaliador vai perguntar por que há duas.

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

### 🟡 Sem controle de versão de migrations

As migrations são arquivos soltos aplicados manualmente. Não há registro do que já
rodou, então reaplicar é responsabilidade de quem executa. Ferramentas como
`node-pg-migrate` ou `Flyway` resolveriam. Para o TCC, documentar a ordem no README
(feito) é suficiente.

### 🟡 Cobertura de testes concentrada

26 testes cobrem classificação de glicemia, `RolesGuard` e `VinculosService` — as
regras de maior impacto. Serviços de planos, relatórios e mensagens ainda não têm
teste. Priorização defensável, mas vale citar como trabalho futuro.

---

## Resumo

| Severidade | Quantidade |
|---|---|
| 🔴 Crítico | 3 (1 já corrigido) |
| 🟡 Aviso | 7 |
| 🟢 Sugestão/positivo | 6 |

**Ações recomendadas antes da entrega, em ordem:**

1. Remover `node_modules` e `.env` do versionamento
2. Decidir o destino de `web/Api` — remover ou documentar
3. Registrar na monografia as limitações de consentimento e validação de CRN
4. Trocar a senha do administrador do seed
