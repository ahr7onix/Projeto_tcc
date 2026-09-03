# Análise do projeto NutriCare — conferência da documentação contra o código

**Data da conferência:** 30 de agosto de 2026
**Base analisada:** `Projeto_tcc` (branch `feature/fase1-nutricare`), `Projeto_tcc_testes`, `monitoramento-nutricare`
**Método:** leitura do código-fonte, do schema do banco, dos arquivos de configuração e do
histórico do Git; execução da suíte de testes automatizados; comparação item a item com os
documentos existentes em `docs/` e com o `README.md` recuperado do Git.

> Nada nesta análise foi presumido a partir da documentação antiga. Onde não houve evidência
> no código, o ponto está marcado como **[PENDENTE DE CONFIRMAÇÃO]**.

---

## 1 O QUE EXISTE ATUALMENTE

### 1.1 Estrutura do repositório

| Caminho | O que é | Tamanho |
|---|---|---|
| `apps/api` | API NestJS 10 + TypeScript 5.6 | 26 módulos |
| `apps/mobile` | Aplicativo Expo 54 / React Native 0.81 / React 19 | 32 telas |
| `apps/web` | Painel Vite 5 + React 18 | 19 páginas |
| `database` | `schema.sql`, 14 migrations, 3 arquivos de seed | 1.216 linhas de SQL |
| `docs` | 8 documentos de apoio | 2.196 linhas |
| `scripts` | Teste de fumaça ponta a ponta com Playwright | 1 script |

Fora do repositório principal existem `Projeto_tcc_testes` (cópia de trabalho divergente) e
`monitoramento-nutricare` (central de monitoramento externa, desligada por padrão).

### 1.2 Backend — o que está implementado

26 módulos NestJS, 24 controllers e cerca de 90 rotas HTTP. Os módulos são:
`auth`, `perfil`, `pacientes`, `vinculos`, `registros`, `saude`, `antropometria`, `emocional`,
`medicamentos`, `restricoes`, `anotacoes`, `alimentos`, `receitas`, `planos`, `nutricional`,
`conteudos`, `mensagens`, `notificacoes`, `push`, `lembretes`, `alertas`, `relatorios`,
`admin`, `health`, `status`, `mail`.

**Autenticação:** cadastro e login por e-mail e senha, login pelo Google (web e mobile),
token de acesso JWT de 15 minutos, refresh token de 30 dias com rotação, recuperação de senha
por e-mail com token de uso único e validade de 1 hora, e desativação de conta (exclusão suave).

**Autorização:** `JwtAuthGuard` + `RolesGuard` + decorador `@Roles()` para o papel; e o serviço
`VinculosService` para a checagem fina de "este profissional pode ver este paciente?".

**Tempo real:** canal SSE em `GET /mensagens/stream`, consumido pelo painel e pelo aplicativo.

**Notificações:** push via Expo (`push_token` + `notificacao`) e notificação local no aparelho
disparada pelo hook `use-glycemic-watch`.

### 1.3 Banco de dados — o que existe de fato

PostgreSQL 16, **7 tipos ENUM** e **24 tabelas** (mais `migracao_aplicada`, criada pelo
`preparar-banco.mjs` para controlar o que já foi aplicado):

`usuario`, `paciente`, `nutricionista`, `nutricionista_paciente`, `mensagem`, `administrador`,
`conteudo_educativo`, `push_token`, `alimento`, `receita`, `notificacao`, `refresh_token`,
`registro_glicemia`, `registro_refeicao`, `registro_antropometrico`, `registro_emocional`,
`medicamento`, `restricao_alimentar`, `anotacao_paciente`, `plano_alimentar`, `refeicao`,
`refeicao_item`, `lembrete`, `senha_reset_token`.

### 1.4 Testes — número conferido rodando

Execução de `npx jest --ci` em `apps/api` no dia 30/08/2026:

    Test Suites: 12 passed, 12 total
    Tests:       168 passed, 168 total
    Time:        17.023 s

O aplicativo mobile e o painel web **não têm testes automatizados**. Existe um teste de fumaça
ponta a ponta em `scripts/e2e-smoke.mjs` (Playwright), que cobre 9 casos.

### 1.5 Sistema publicado

Painel: `https://nutricare-adj-painel.onrender.com` · API: `https://nutricare-adj-api.onrender.com`
Plano gratuito do Render: a API hiberna e leva cerca de 50 s para responder à primeira
requisição; o banco gratuito expira em 30 dias.

---

## 2 O QUE MUDOU EM RELAÇÃO À DOCUMENTAÇÃO ANTIGA

| Ponto | Documentação antiga diz | O código mostra |
|---|---|---|
| Mensagens em tempo real | Consulta repetida a cada 15 s / 30 s (`README.md`, `REVISAO_CODIGO.md`) | **SSE** em `GET /mensagens/stream`, com sinais de "digitando" e "leitura" |
| Quantidade de testes | 104 (`O_QUE_FOI_FEITO.md`) e 161 (`REVISAO_CODIGO.md`) | **168**, em 12 suítes |
| RF01 — tabela de alimentos | "Em construção" (`RESUMO_ENTREGA.md`) | Tabela `alimento` + módulo + tela `AlimentosPage` + busca no plano: **implementado** |
| RF02 — necessidade energética | "O cálculo não existe ainda" | `calcularVet` (Mifflin-St Jeor e Harris-Benedict) + `POST /nutricional/calcular` + campo no plano: **implementado** |
| RF03 — macronutrientes | "Depende dos dois itens acima" | `calcularMacros`, colunas `perc_*` no plano, CHECK somando 100, cálculo em gramas na tela: **implementado** |
| RF09 — receitas | "Mostra três exemplos fixos gravados dentro do programa" | Tabela `receita`, módulo, `ReceitasPage` no painel e telas de receita no app: **implementado** |
| RF08 — gráficos | "Nenhum gráfico existe ainda" | Existe **um** gráfico no painel (evolução dos alertas, na tela inicial). No aplicativo, nenhum |
| Login Google no mobile | `README.md` diz que não funciona no Expo Go | Implementado com `expo-auth-session`, com Client ID configurado no `.env`. **[PENDENTE DE CONFIRMAÇÃO]** se funciona no Expo Go ou só em *development build* |
| Migrations | O `README.md` lista a instalação até a migration 010 | Existem **14** migrations (011 a 014 não estão na lista) |
| ORM | Nenhum documento afirma TypeORM, mas o roteiro do TCC pede o item | **Não há ORM**. O acesso ao banco é feito com o driver `pg` e SQL parametrizado |

---

## 3 O QUE ESTÁ ERRADO

1. **Erro real de interface.** Em `apps/web/src/pages/app/RelatorioPacientePage.tsx`,
   o cartão "Registros do profissional" está escrito duas vezes (linhas 88 e 94). O relatório
   mostra o mesmo bloco repetido.
2. **`README.md` apagado do disco.** O arquivo continua no histórico do Git, mas não existe na
   pasta. Todos os outros documentos apontam para ele.
3. **Nome do aplicativo desatualizado.** `apps/mobile/app.json` ainda declara
   `"name": "Projeto TCC"`, slug `projeto-tcc-mobile` e pacote `com.projetotcc.mobile`.
4. **`apps/mobile/README.md` descreve versões que não são mais as do projeto** (fala em Expo
   SDK 52, React Native 0.76 e Expo Router 4; o `package.json` traz Expo 54, RN 0.81, Router 6).
5. **O modelo entidade-relacionamento de `docs/DIAGRAMAS.md` está incompleto.** Faltam
   `alimento`, `receita`, `notificacao`, `registro_antropometrico`, `registro_emocional`,
   `restricao_alimentar`, `anotacao_paciente`, `refeicao_item` e `senha_reset_token`, além dos
   campos de VET e macronutrientes em `plano_alimentar` e do `desativado_em` em `usuario`.
6. **`RESUMO_ENTREGA.md` está desatualizado** em cinco dos dez requisitos do briefing (ver
   seção 2). O documento é de 26 de julho; o código andou depois disso.
7. **Dados sensíveis em arquivos versionados:** o e-mail pessoal de um dos autores aparece em
   `apps/api/.env.example`; senhas de demonstração estão impressas em `docs/PUBLICAR.md`; o
   Client ID do Google está fixo no `render.yaml`.
8. **O `docker-compose.yml` usa CORS liberado para qualquer origem e um segredo de JWT de
   exemplo.** É aceitável para ambiente local, mas precisa estar dito na documentação para não
   ser lido como configuração de produção.

---

## 4 O QUE PRECISA SER REMOVIDO

**Código inalcançável no painel web — cerca de 1.643 linhas.** Confirmado por leitura das rotas
em `App.tsx` e por busca de importações:

| Arquivo | Linhas | Situação |
|---|---|---|
| `pages/app/SaudePage.tsx` | 711 | Não é importada em `App.tsx` |
| `pages/app/RegistrosPage.tsx` | 183 | Não é importada; a rota `/registros` redireciona para `/acompanhamento` |
| `components/AlertasPanel.tsx` | 152 | Nenhum arquivo a importa |
| `components/GraficoLinha.tsx` | 167 | Só é usada por `SaudePage` |
| `components/MedidaModal.tsx` | 251 | Só é usada por `SaudePage` |
| `components/MedicamentoModal.tsx` | 179 | Só é usada por `SaudePage` |

Consequência prática: **o componente de gráfico de linha do painel não pode ser aberto por
ninguém**, e as telas web de medidas corporais e de medicamentos ficaram inacessíveis. Isso
explica a impressão de que "não há gráficos" — há um só, escrito diretamente em SVG dentro de
`HomePage.tsx`.

Também deve sair da documentação:

- a descrição das mensagens por consulta repetida (foi substituída por SSE);
- a afirmação de que as receitas do aplicativo são exemplos fixos;
- a afirmação de que não existe cálculo de VET nem de macronutrientes;
- a menção a TypeORM, caso apareça em qualquer versão do texto.

---

## 5 O QUE PRECISA SER ATUALIZADO

1. Número de testes: **168 em 12 suítes**.
2. Lista de migrations: **001 a 014**.
3. Situação dos requisitos RF01, RF02, RF03, RF08 e RF09.
4. Mecanismo de mensagens: SSE.
5. Quadro de tecnologias: sem ORM; acesso ao banco com `pg` e SQL parametrizado.
6. Versões do mobile: Expo 54, React Native 0.81.5, React 19.1.0, Expo Router 6.
7. Modelo entidade-relacionamento completo (24 tabelas).
8. Lista de endpoints (cerca de 90 rotas, contra a lista parcial do `README.md`).
9. Identidade do aplicativo (`app.json`) para NutriCare.
10. Limitações conhecidas: retirar o que já foi resolvido, acrescentar o que apareceu
    (código inalcançável no painel, ausência de testes no front, token guardado em
    `localStorage` no painel).

---

## 6 O QUE ESTÁ FALTANDO

### 6.1 Funcionalidade construída no servidor mas sem tela

**Lembretes.** Existem a tabela `lembrete`, o módulo, os DTOs, o serviço, 6 rotas
(`GET /lembretes`, `GET /lembretes/hoje`, `POST`, `PATCH :id`, `PATCH :id/concluir`,
`DELETE :id`) e 11 testes automatizados. **Não existe nenhuma tela**, nem no aplicativo nem
no painel. O paciente não tem como programar "medir a glicemia às 7h".

### 6.2 Gráficos

- No painel: existe apenas o gráfico de evolução dos alertas na tela inicial. **Não existe
  gráfico de evolução da glicemia nem do peso** em tela alcançável.
- No aplicativo: **nenhum gráfico**. Não há biblioteca de gráficos nas dependências.

### 6.3 Testes

Não há testes automatizados no aplicativo mobile (não existe Jest nem *testing-library* no
`package.json`) nem no painel web.

### 6.4 Imagens

**Não existe nenhum arquivo de imagem no projeto inteiro.** Não há capturas de tela, não há
diagramas exportados como figura, e a pasta `apps/mobile/assets` contém apenas um `.gitkeep`
dizendo onde colocar o ícone e a tela de abertura. Todas as figuras da monografia precisam ser
produzidas pelos autores.

### 6.5 Validação clínica

O `docs/CONFERENCIA_NUTRICAO.md` tem o bloco de assinatura da equipe de Nutrição **em branco**.
Os 36 alimentos carregados no banco continuam com `fonte = 'exemplo'`. As faixas de glicemia,
as fórmulas de VET e a distribuição de macronutrientes ainda não foram validadas.

### 6.6 Consentimento no vínculo

No cadastro de um paciente — tanto por e-mail quanto pelo Google — o sistema **vincula
automaticamente o novo paciente a todos os nutricionistas já cadastrados**
(`auth.service.ts`, linhas 108–122 e 240–252). O comportamento é intencional e está coberto
pelo teste de fumaça ("API vínculo auto → lista Camila"), mas nenhum documento o descreve, e ele
contraria o que o `LIMITACOES_LGPD.md` diz sobre consentimento.

---

## 7 QUAIS IMAGENS PRECISAM SER SUBSTITUÍDAS

Não há imagem a substituir: **não existe imagem nenhuma no projeto**. O que existe é uma lista
de figuras a produzir. Todas devem ser capturadas na versão atual do sistema, porque as telas
mudaram (a tela de login e cadastro do painel virou um painel deslizante único; o
acompanhamento do paciente virou uma página com quatro abas).

Figuras a capturar, na ordem em que aparecem na documentação:

| Figura | O que capturar | Onde |
|---|---|---|
| 1 | Tela de login do painel | `/login` |
| 2 | Tela de cadastro (painel deslizante) | `/cadastro` |
| 3 | Tela inicial do nutricionista, com o gráfico de alertas | `/inicio` |
| 4 | Lista de pacientes | `/pacientes` |
| 5 | Acompanhamento do paciente — aba Informações | `/acompanhamento/:id` |
| 6 | Acompanhamento — aba Glicemia | `/acompanhamento/:id/glicemia` |
| 7 | Montagem do plano alimentar, com VET e macronutrientes | modal em `/alimentacao` |
| 8 | Tabela de alimentos | `/alimentos` |
| 9 | Conversa com o paciente | `/mensagens` |
| 10 | Relatório do paciente | `/relatorios/:id` |
| 11 | Painel do administrador | `/admin` |
| 12 | Login do aplicativo | app, `(auth)/login` |
| 13 | Tela inicial do aplicativo, com o aviso de glicemia | app, `(tabs)/home` |
| 14 | Registro de glicemia | app, `(tabs)/registros/glicemia` |
| 15 | Histórico de registros | app, `(tabs)/registros` |
| 16 | Plano alimentar visto pelo paciente | app, `(tabs)/alimentacao` |
| 17 | Modo simplificado (perfil com 55 anos ou mais) | app, `(tabs)/home` |
| 18 | Notificação de glicemia fora da faixa | app, notificação do sistema |
| 19 | Diagrama de casos de uso | exportar de `docs/DIAGRAMAS.md` |
| 20 | Diagrama de classes | exportar de `docs/DIAGRAMAS.md` |
| 21 | Modelo entidade-relacionamento (versão corrigida) | exportar da nova documentação |
| 22 | Diagrama de arquitetura em camadas | exportar da nova documentação |
| 23 | Diagrama de sequência — registro de glicemia com alerta | exportar de `docs/DIAGRAMAS.md` |

---

## 8 QUAIS PARTES PRECISAM DE CONFIRMAÇÃO

Cada um destes pontos está marcado como **[PENDENTE DE CONFIRMAÇÃO]** também no corpo da
documentação.

1. **Autoria.** O histórico do Git tem 198 commits de três autores: Isac Buzelli (131),
   "NutriCare Dev" (61) e Natan Lourenço (6). **Henrique Payá Ferreira não tem commits**, embora
   conste como autor no `README.md` e no `RESUMO_ENTREGA.md`. É preciso dizer como a participação
   dele se deu.
2. **O que está publicado.** A branch de trabalho `feature/fase1-nutricare` está **19 commits à
   frente e 9 atrás** da `main`, e há 75 alterações não commitadas, incluindo módulos inteiros
   ainda não versionados (`health`, `logging`, `monitoring`, exclusão de conta, migrations 013 e
   014). Não dá para afirmar, a partir do repositório, qual versão está no ar no Render.
3. **Docker.** `docker-compose.yml`, `apps/api/Dockerfile` e `render.yaml` existem e estão
   completos, mas o Docker **não está instalado na máquina de desenvolvimento**
   (`docker: command not found`), e o documento de entrega diz que foi usado um PostgreSQL
   portátil na porta 5433. Além disso, no `Dockerfile` a troca para o usuário `node` aparece
   **antes** da instalação das dependências, num diretório pertencente ao root — o que costuma
   falhar. Não foi possível testar.
4. **Login pelo Google no aplicativo.** Está implementado com `expo-auth-session` e o Client ID
   está configurado, mas não foi possível verificar se funciona dentro do Expo Go ou se exige
   um *development build*.
5. **Notificação push pelo servidor.** O módulo `push` e a tabela `push_token` existem, e o
   envio é disparado quando uma medição é crítica. Não foi possível confirmar a entrega real
   da notificação em um aparelho.
6. **`Projeto_tcc_testes`.** É uma cópia divergente, com módulos que o projeto principal não
   tem (`common/acesso`, `modules/acesso`). Precisa ser dito se é uma linha de trabalho ativa ou
   material descartado — a documentação a trata como cópia de apoio, fora da entrega.
7. **`monitoramento-nutricare`.** Projeto separado, desligado por padrão
   (`MONITORING_ENABLED=false`). Precisa ser dito se entra no escopo do TCC.
8. **Faixas de glicemia e fórmulas nutricionais.** Sem a assinatura da equipe de Nutrição, os
   parâmetros do sistema são referências gerais e não podem ser apresentados como validados.
