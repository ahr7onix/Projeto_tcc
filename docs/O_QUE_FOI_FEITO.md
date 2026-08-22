# O que foi feito no NutriCare

Documento de entrega do trabalho realizado no repositório `ahr7onix/Projeto_tcc`.
Cobre tudo que mudou entre o último commit antigo (`dc4eb2a`, 25/05/2026) e o
estado atual da branch `main` (`1ecd4ac`, 25/07/2026).

- **30 commits** novos
- **73 arquivos criados**, além das alterações em arquivos existentes
- **+13.706 linhas** de código e documentação (e −1.174.553 de `node_modules`
  que saíram do versionamento)
- Trabalho concentrado em 25/07/2026, em três blocos: construção das
  funcionalidades, limpeza/revisão do repositório e correção dos defeitos
  encontrados ao rodar o sistema de ponta a ponta

---

## 1. Ponto de partida

O que existia antes: cadastro/login (JWT + Google), onboarding do paciente,
registro de glicemia e de refeição, listagem básica de pacientes no painel web.

Faltava tudo que dá sentido clínico ao sistema: o nutricionista não conseguia se
vincular a um paciente, não existia plano alimentar, nem relatório, nem
mensagem, nem conteúdo educativo, nem administração. O repositório também
carregava 3.778 arquivos de `node_modules` versionados e uma segunda API
duplicada em Express.

---

## 2. Banco de dados

Seis migrations novas, todas já incorporadas ao `database/schema.sql` (quem
instala do zero não precisa aplicá-las):

| Arquivo | O que cria |
|---|---|
| `002_nutricionista_paciente.sql` | Tabela de vínculo entre nutricionista e paciente |
| `003_mensagem.sql` | Mensagens entre paciente e nutricionista |
| `004_nutricionista_crn_opcional.sql` | Torna o CRN opcional no cadastro |
| `005_administrador.sql` | Perfil de administrador |
| `006_push_token.sql` | Tokens de notificação push por dispositivo |
| `007_briefing_nutricao.sql` | Tabela de alimentos, itens de refeição, dados nutricionais no plano, medidas corporais, registro emocional, lembretes configuráveis, receitas e notificações |

A migration 007 é a que fechou as pendências do briefing do cliente. Ela cria:

- `alimento` — tabela de alimentos com porção de referência, calorias,
  macronutrientes, fibras, índice glicêmico e medida caseira
- `refeicao_item` — os itens de cada refeição do plano ligados à tabela de
  alimentos, o que permite somar calorias e macronutrientes automaticamente
- colunas de prescrição em `plano_alimentar` (necessidade energética, fórmula
  usada, fator de atividade e distribuição de macronutrientes), com uma regra no
  banco garantindo que os três percentuais somem 100
- `registro_antropometrico` — peso, altura, circunferências e dobras
- `registro_emocional` — humor, ansiedade, compulsão e sono
- `lembrete` reformulado, aceitando lembrete avulso (data e hora) ou recorrente
  (hora + dias da semana)
- `receita` — receitas com ingredientes, modo de preparo e valores por porção
- `notificacao` — histórico do que já foi avisado ao usuário
- `nivel_atividade` no cadastro do paciente, usado no cálculo energético

Também foram criados:

- `database/seeds_admin.sql` — administrador inicial
  (`admin@nutricare.local` / `NutriCare@2026`, válido só para desenvolvimento)
- `database/seeds_alimentos.sql` — 36 alimentos de exemplo, marcados com
  `fonte = 'exemplo'`. São valores aproximados, para demonstração: **não devem
  ser usados clinicamente** antes de serem substituídos pela tabela TACO ou por
  uma tabela validada pelo curso de Nutrição
- `database/gerar-hash-admin.js` — gera um hash bcrypt próprio para substituir a
  senha publicada, com o `UPDATE` pronto para colar

---

## 3. API (NestJS — `apps/api`)

### Autorização por perfil

- `common/guards/roles.guard.ts` e `common/decorators/roles.decorator.ts`:
  o controle de acesso deixou de ser `if (role === ...)` espalhado pelos
  serviços e passou a ser declarativo — `@Roles('nutricionista')` na rota.
- `common/perfil-completo.ts`: fonte única para dizer se o cadastro do usuário
  está completo, usada por login, cadastro, refresh e `GET /perfil`.
- `common/glicemia/glicemia.ts`: regra única de classificação glicêmica
  (jejum, pré e pós-refeição, antes de dormir, madrugada, aleatório), consumida
  por registros, alertas e relatórios. Mudar uma faixa muda o sistema inteiro de
  forma coerente.
- `common/nutricao/nutricao.ts`: toda a matemática nutricional em um só lugar —
  taxa metabólica basal por Mifflin-St Jeor e Harris-Benedict revisada, fator de
  atividade, necessidade energética, divisão em macronutrientes, IMC e sua
  classificação (OMS), relação cintura-quadril, circunferência da cintura e a
  regra de três entre a porção de referência do alimento e a quantidade
  prescrita. São funções puras, sem banco e sem framework, e é por isso que dá
  para testá-las. **Nenhum valor calculado aqui substitui avaliação
  profissional**: o sistema apresenta o resultado como sugestão e a prescrição
  continua sendo do nutricionista — está escrito no próprio arquivo e devolvido
  em todas as respostas da API.

### Módulos novos

| Módulo | Requisito | O que faz |
|---|---|---|
| `vinculos` | RN02 | Vincula e desvincula paciente; é ele que autoriza o acesso do nutricionista aos dados clínicos |
| `planos` | RF08, RN05 | CRUD de plano alimentar com as refeições gravadas em transação; só nutricionista cria |
| `alertas` | RF09 | Medições fora da faixa, com severidade e consolidado por paciente |
| `relatorios` | RF10 | Relatório consolidado em JSON e exportação CSV (com proteção contra CSV injection) |
| `mensagens` | RF11 | Conversa paciente ↔ nutricionista, com contador de não lidas |
| `conteudos` | RF12 | Conteúdos educativos com rascunho e publicação |
| `admin` | RF13 | Métricas do sistema e gestão de usuários |
| `push` | — | Registro de token e envio de notificação via Expo em alerta crítico e mensagem nova |

E os módulos que atenderam o briefing do cliente (a numeração abaixo é a do
briefing de Nutrição, não a da tabela de requisitos da seção 10):

| Módulo | Item do briefing | O que faz |
|---|---|---|
| `alimentos` | 1 | Consulta e cadastro da tabela de alimentos, com busca por nome, filtro por grupo e cálculo dos valores para a quantidade informada |
| `nutricional` | 2 | Calcula a necessidade energética e a divisão em macronutrientes, usando o cadastro do paciente ou valores de simulação |
| `antropometria` | 3 | Registro de peso, altura e circunferências, com IMC, classificação e evolução |
| `emocional` | 4 | Registro de humor, ansiedade, compulsão alimentar e sono |
| `receitas` | 5 | Receitas escritas pela nutricionista, com rascunho e publicação; o paciente só vê o que foi publicado |
| `medicamentos` | 6 | Insulina e medicamentos em uso, com dosagem, frequência e horário |
| `lembretes` | 7 | Lembretes de refeição, glicemia e medicamento, avulsos ou recorrentes por dia da semana |
| `notificacoes` | 8 | Histórico do que foi avisado ao usuário, com contador de não lidas |

O módulo `planos` foi estendido: o plano alimentar passou a guardar a prescrição
(necessidade energética, fórmula, fator de atividade, distribuição de
macronutrientes e observações) e as refeições passaram a aceitar itens ligados à
tabela de alimentos. Com isso a API devolve o total de calorias e
macronutrientes por refeição e do plano inteiro, informando quantos itens
ficaram fora da soma por serem texto livre — o total nunca é apresentado como
completo quando não é.

### Endpoints acrescentados

```
GET/POST/DELETE  /vinculos                    vínculo nutricionista-paciente
GET              /pacientes/disponiveis       pacientes ainda não vinculados
GET/POST/PATCH/DELETE /planos                 plano alimentar
GET              /planos/ativo                plano vigente hoje
GET              /alertas, /alertas/resumo    medições fora da faixa
GET              /relatorios, /relatorios/csv relatório e exportação
GET/POST         /mensagens                   conversas e envio
GET              /mensagens/nao-lidas         contador
GET/POST/PATCH/DELETE /conteudos              conteúdos educativos
GET              /admin/metricas              métricas (admin)
GET/DELETE       /admin/usuarios              gestão de usuários (admin)
POST/DELETE      /push/token                  token de notificação

GET/POST/PATCH/DELETE /alimentos              tabela de alimentos
GET              /alimentos/grupos            grupos disponíveis
GET              /nutricional/referencias     níveis de atividade e fórmulas
POST             /nutricional/calcular        necessidade energética e macros
GET/POST/DELETE  /antropometria               medidas corporais
GET              /antropometria/evolucao      evolução das medidas
GET/POST/DELETE  /emocional                   registro emocional
GET              /emocional/resumo            resumo do período
GET/POST/PATCH/DELETE /receitas               receitas
GET              /receitas/categorias         categorias de receita
GET/POST/PATCH/DELETE /lembretes              lembretes
GET              /lembretes/hoje              lembretes do dia
PATCH            /lembretes/:id/concluir      marcar como feito
GET/POST/PATCH/DELETE /medicamentos           medicamentos em uso
GET              /notificacoes                histórico de avisos
GET              /notificacoes/nao-lidas      contador
PATCH            /notificacoes/ler-todas      marcar tudo como lido
```

### Testes

`jest.config.js` configurado e **104 testes** cobrindo as regras de maior
impacto:

- classificação de glicemia (14)
- `RolesGuard` (4)
- `VinculosService` (9) — quem enxerga o dado de qual paciente
- cálculos nutricionais (28) — taxa metabólica pelas duas fórmulas,
  necessidade energética, macronutrientes, IMC, relação cintura-quadril e
  conversão de porções
- tabela de alimentos (11) — filtros, regra de três da porção e desativação
  sem apagar o registro
- antropometria (8) — evolução do peso, classificação de risco e atualização
  da ficha do paciente
- registro emocional (6) — média da escala e ranking dos fatores citados
- receitas (13) — o que cada perfil enxerga e quem pode editar
- lembretes (11) — validação de hora/data, vínculo com o medicamento e
  conclusão apenas dos avulsos

```bash
cd apps/api && npm test
```

---

## 4. Painel web (`web/web_nutricionista`)

Telas novas:

- **Planos** — criação e edição do plano alimentar (`PlanoAlimentarModal`)
- **Relatórios** — consolidado do paciente, com exportação CSV e PDF pela
  impressão do navegador
- **Mensagens** — conversa com o paciente
- **Conteúdos** — publicação de material educativo
- **Administração** — métricas e gestão de usuários
- **Vincular paciente** (`VincularPacienteModal`) e **painel de alertas**
  (`AlertasPanel`) no dashboard

Camada de acesso à API separada em `src/lib/` (`planos`, `relatorios`,
`mensagens`, `conteudos`, `vinculos`, `alertas`, `admin`).

---

## 5. App mobile (`apps/mobile`)

- **Plano alimentar real** vindo da API, no lugar do conteúdo fixo
- **Mensagens** — lista de conversas e tela de conversa
- **Conteúdos educativos** — lista e leitura
- **Notificações push** (`use-push-notifications.ts`) com registro do token no
  servidor
- **Registros** ligados à API de verdade (ver seção 6)

---

## 6. Defeitos encontrados ao rodar o sistema de ponta a ponta

Depois de tudo construído, o sistema foi subido de fato (banco, API, painel e
app) e usado como um usuário usaria. Oito defeitos apareceram — nenhum deles
seria visto só lendo o código:

**1. Ninguém conseguia logar com os usuários de exemplo** (`29c0e8f`)
O hash das senhas no `seeds.sql` era um placeholder que não correspondia a senha
nenhuma. Além disso o `INSERT` das refeições falhava com *"column horario is of
type time without time zone"* — dentro de `UNION ALL` o Postgres resolve os
literais como `text`. Hash novo gerado e conferido, cast `::TIME` adicionado.

**2. Cadastro de nutricionista não criava o perfil** (`55bd979`)
O `cadastro` inseria em `usuario` e em `paciente`, mas **nunca em
`nutricionista`**. Toda conta de nutricionista ficava sem perfil, quebrando
planos, vínculos e relatórios. Corrigido, com a migration `004` tornando o CRN
opcional.

**3. `GET /registros` devolvia os dados de todos os pacientes** (`c89e1db`)
Qualquer usuário autenticado via as glicemias e refeições de todo mundo — falha
de controle de acesso sobre dado sensível de saúde (LGPD art. 11). Agora o
escopo sai do papel: paciente vê o próprio, nutricionista vê os vinculados,
administrador vê tudo.

**4. O paciente caía no onboarding a cada abertura do app** (`aa48614`)
`perfilCompleto` nunca era calculado, e o app tratava a ausência como
"incompleto". Junto veio outra correção: a data de nascimento era enviada em
`DD/MM/AAAA` e o Postgres a lia como `MM/DD/AAAA` — `12/04/1985` virava
dezembro.

**5. Glicemia baixa não gerava alerta à noite** (`a4a43e5`)
A classificação usava só o teto da faixa, nunca o piso. Como o alvo antes de
dormir começa em 90, uma medição de 78 mg/dL às 22h aparecia como "normal" ao
lado do texto "alvo 90–150" — a tela se contradizia e o nutricionista não era
avisado. O piso existe justamente como margem contra a hipoglicemia noturna.

**6. O administrador não conseguia entrar no painel** (`a9d3762`)
O login recusava com "exclusiva para nutricionistas", a rota inicial levava a um
dashboard que responde 403 para quem não é nutricionista, e o menu mostrava as
telas erradas. Agora o destino pós-login sai de um mapa por perfil.

**7. A tela de registros do painel exibia "Invalid Date"** (`b9f5570`)
Lia `criadoEm` em vez de `dataHora` e `tipo_refeicao` em vez de `tipoRefeicao`,
e os rótulos estavam chaveados nos apelidos do POST, não nos valores do ENUM —
o nutricionista via `pos_prandial` cru. Os dois botões de "novo registro"
também eram beco sem saída: sempre retornavam 404, porque só um paciente pode
registrar. Foram removidos e a linha do tempo ganhou alerta, carboidratos e
observação.

**8. O onboarding do app jogava fora o que o paciente digitava** (`69895fe`)
O submit era um `setTimeout` de 600 ms com um `TODO`: data de nascimento, tipo
de diabetes, peso, altura e restrições eram preenchidos e descartados. Agora
chama `PATCH /perfil/paciente` e avisa se a gravação falhar. E a tela de
Registros, que montava a linha do tempo a partir de três itens fixos no
arquivo, passou a consumir `GET /registros` com estados de carregando, erro e
vazio.

---

## 7. Limpeza do repositório

- **`node_modules` e `.env` fora do versionamento** — de 3.986 para 205 arquivos
  rastreados. A causa era o `sincronizar.ps1`, que roda `git add .` + commit +
  push a cada 10 segundos (daí os commits "Salvo automaticamente").
- **API Express duplicada removida** (`web/Api`, 557 linhas) — era código morto:
  guardava tudo em memória, na porta 3333, enquanto o painel sempre apontou para
  a 3000. Continua recuperável pelo histórico.
- **`seeds_admin.sql` passou a ser carregado pelo Docker** — antes, quem subia
  por `docker compose up` não tinha nenhuma conta de administrador e o `/admin`
  era inacessível.
- **Senha padrão do administrador trocada**, com script para gerar um hash
  próprio.

O histórico **não** foi reescrito: os arquivos antigos continuam nos commits
passados. Limpar isso exigiria `push --force`, que quebraria os clones do Natan
e do Henrique no meio do TCC. Como o único dado sensível envolvido é um Google
Client ID (público por natureza), a decisão foi não reescrever.

---

## 8. Documentação criada

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Arquitetura, como rodar cada parte, endpoints, faixas glicêmicas, requisitos e limitações |
| `docs/DIAGRAMAS.md` | Diagramas em Mermaid |
| `docs/REVISAO_CODIGO.md` | Revisão completa de segurança, performance, clean code e arquitetura |
| `docs/O_QUE_FOI_FEITO.md` | Este documento |

---

## 9. Ambiente nesta máquina

Não há Docker nem `psql.exe` instalados aqui, apesar de o `docker-compose.yml` e
o `iniciar.bat` do repositório assumirem Docker. Para rodar o sistema foi
instalado um **PostgreSQL 16.14 portátil** em
`C:\Users\isacb\AppData\Local\NutriCare\pgsql`, escutando em `127.0.0.1:5433`,
com banco, usuário e senha todos `tcc`. O SQL é aplicado por scripts `.mjs` que
usam o driver `pg`.

Portas: banco **5433**, API **3000**, painel **5173**, Expo web **8081**.

Para rodar de novo, subir o Postgres portátil **antes** da API — não tentar
`docker compose up`.

---

## 10. Requisitos atendidos

> **Atenção:** a numeração RF01–RF14 abaixo é a lista **interna** do projeto e
> **não corresponde** aos RF01–RF10 do briefing da equipe de Nutrição. Pela
> lista do cliente, 1 requisito está atendido, 4 parciais e 5 não atendidos —
> ver `docs/RESUMO_ENTREGA.md`, que é o documento válido para a entrega.

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

Regras de negócio garantidas no código: RN01 (paciente só acessa os próprios
dados), RN02 (nutricionista só acessa vinculados), RN05 (só nutricionista cria
plano), RN06 (só administrador gerencia usuários), RN07 (registros vão para o
histórico) e RN10 (acesso separado por perfil).

---

## 11. O que continua em aberto

**O briefing de Nutrição está atendido no banco e na API, mas ainda não nas
telas.** Os oito módulos novos existem e respondem, com testes nos cálculos, e é
possível usá-los hoje pela API. O que falta é a interface:

- **Painel web** — telas de alimentos, receitas, medidas corporais, cálculo de
  necessidade energética e gráficos de evolução.
- **App mobile** — consulta de alimentos, medidas corporais, registro
  emocional, lembretes e as receitas reais no lugar das três receitas fixas
  que ainda estão escritas no código
  (`apps/mobile/src/app/(tabs)/alimentacao/receitas/index.tsx`), além dos
  dados de exemplo na tela de saúde (`(tabs)/saude/index.tsx`).

Enquanto essas telas não existirem, o cliente não consegue exercitar esses
recursos pela interface — vale dizer isso claramente na apresentação em vez de
demonstrar só o que já tem tela.

**Entregue nesta rodada (Fase 1 deste pacote de melhorias)**: o paciente já
gerencia os próprios medicamentos e restrições alimentares pelo app (antes
eram só leitura/texto livre), recebe um banner de status glicêmico com alerta
de hipo/hiperglicemia baseado na última leitura + notificação local, e o app
adapta a interface (fonte e botões maiores, menos cards) para pacientes com
55 anos ou mais. Detalhes e o que ainda fica para depois estão na seção
"Fase 2 (planejado)" do README.

Os demais pontos abertos não impedem a entrega, mas são os que a banca tem mais
chance de questionar:

1. **Vínculo sem consentimento do paciente** — o nutricionista vincula qualquer
   paciente cadastrado sem aprovação dele. Em dados de saúde isso conflita com a
   LGPD (art. 11). O ideal seria um `status` pendente/aceito no vínculo; no
   mínimo, registrar a limitação na monografia.
2. **CRN não é validado** — aceito como texto livre; não existe API pública do
   CFN. A mitigação realista é aprovação manual pelo administrador, que já
   existe.
3. **Refresh token automático no mobile** — a web já faz, o app ainda não.
4. **Cobertura de testes** — os cálculos nutricionais, a glicemia, o controle de
   acesso e os cinco módulos novos estão cobertos; planos, relatórios e
   mensagens ainda não têm teste automatizado.
5. **Faixas de referência e tabela de alimentos precisam de validação clínica** —
   as faixas glicêmicas são referências gerais e os 36 alimentos de exemplo têm
   valores aproximados. Antes de qualquer uso com paciente real, os dois pontos
   precisam ser conferidos pelo curso de Nutrição.
6. **Mensagens por polling** (15 s na conversa, 30 s na lista) em vez de
   WebSocket.
7. **PDF gerado pelo navegador**, não no servidor.
8. **Migrations sem controle de versão** — arquivos soltos, aplicados à mão; a
   ordem está documentada no README.

---

## 12. Commits

```
1ecd4ac  fix(mobile): liga a tela de Registros na API
69895fe  fix(mobile): salva o onboarding do paciente na API de verdade
b9f5570  fix(web): corrige a leitura dos registros e remove os formularios mortos
a9d3762  fix(web): da ao administrador um painel que ele consegue usar
a4a43e5  fix(api): considera o piso da faixa ao classificar a glicemia
c89e1db  fix(api): restringe GET /registros ao escopo do usuario logado
aa48614  fix(api): calcula o perfil completo de verdade e normaliza a data BR
29c0e8f  fix(db): corrige o seed de exemplo (hash bcrypt e cast de TIME)
2f34d3a  docs: corrige as versoes do mobile na documentacao
5a96065  docs: atualiza revisao de codigo e progresso do mobile
c134dd4  fix(db): carrega o seed do admin no Docker e troca a senha padrao
894773d  chore: remove a API Express duplicada (web/Api)
38339f7  chore: remove node_modules e .env do versionamento
97cf733  chore: ajustes finais
1c5c647  docs: README, diagramas em Mermaid e relatorio de revisao de codigo
5bb67e6  feat(mobile): plano alimentar real, mensagens, conteudos educativos e push
cdc7dda  feat(web): telas de planos, relatorios, mensagens, conteudos e administracao
029cfde  test(api): configura Jest e adiciona 26 testes das regras criticas
c41189d  feat(api): notificacoes push via Expo em alertas criticos e mensagens
4f10bd2  feat(api): modulo administrativo com metricas e gestao de usuarios (RF13)
88bb258  feat(api): conteudos educativos com rascunho e publicacao (RF12)
598e334  feat(api): mensagens entre paciente e nutricionista (RF11)
ff0dfa5  feat(api): relatorios consolidados com exportacao CSV (RF10)
0691851  feat(api): classificacao de glicemia e alertas de hipo/hiperglicemia
2c49ac1  feat(api): CRUD de planos alimentares com transacao (RF08, RN05)
fdd9bb0  feat(api): vinculo nutricionista-paciente e restricao de acesso (RN02)
55bd979  fix(auth): cadastro de nutricionista nao criava registro na tabela nutricionista
af5f75e  feat(api): RolesGuard e decorator @Roles para autorizacao por perfil
167d8a5  feat(db): vinculo nutricionista-paciente, mensagens, administrador, conteudos e push
da402bf  chore: adiciona .gitignore na raiz (node_modules, .env, builds)
```
