# Histórico de alterações

Entradas mais novas primeiro. Regras e formato: veja `docs/LEIA_PRIMEIRO_IA.md`.

## 2026-10-28 — Lembretes podem tocar como alarme
- Quem: Natan, com apoio de IA
- PR/branch: `feat/lembrete-alarme` (criada em cima de `feat/login-google-apk`)
- O que foi adicionado: na tela Saúde > Lembretes, o cartão "Como o celular avisa", com a chave
  "Tocar como alarme" e o botão "Tocar um teste" (toca em 5 segundos). Com a chave ligada, no
  Android os lembretes vão para o canal `lembretes-alarme`: som de ~6 s
  (`assets/sounds/alarme.wav`, gerado pela equipe, sem direitos de terceiros), tocado no volume
  do alarme, vibração longa e aviso na tela bloqueada. A escolha fica só no aparelho
  (`AsyncStorage`); banco e API não mudaram.
- O que foi modificado: `app.json` passa o som para o plugin do `expo-notifications`;
  `agenda-lembretes.ts` agenda no canal do modo escolhido e reagenda tudo ao trocar a chave.
- Arquivos principais: `apps/mobile/src/lib/agenda-lembretes.ts`,
  `apps/mobile/src/app/(tabs)/saude/lembretes.tsx`, `apps/mobile/app.json`.
- Atenção para quem vier depois: ficaram de fora os botões "Feito" e "Adiar 10 min" na
  notificação. Com o app fechado o Android só executa esses botões com o `expo-task-manager`
  (mais uma peça nativa), e sem ele o botão não faz nada. Conferido no navegador (a chave
  liga e continua ligada depois de recarregar) e no `expo prebuild` (o som vai para
  `res/raw`); o som de alarme só dá para conferir no celular, com o próximo APK.

## 2026-10-28 — Login com Google no APK
- Quem: Natan, com apoio de IA
- PR/branch: `feat/login-google-apk`
- O que foi adicionado: no APK do Android o botão "Continuar com Google" usa o Google Sign-In
  nativo (`@react-native-google-signin/google-signin`, que já estava instalado e sem uso).
  Cliente "NutriCare - App Android" no projeto `nutricare-tcc` do Google Cloud, com o pacote e
  o SHA-1 da chave do APK.
- O que foi modificado: `eas.json` passa o Client ID web da segunda cópia para o APK. No Expo Go,
  no iPhone e no navegador nada muda.
- Arquivos principais: `apps/mobile/src/lib/google-sign-in.ts`,
  `apps/mobile/src/components/auth/LoginForm.tsx`, `apps/mobile/eas.json`,
  `docs/LOGIN_GOOGLE.md`.
- Atenção para quem vier depois: o token sai em nome do Client ID web, então a API não mudou.
  O módulo é carregado só na hora do login, porque no Expo Go ele quebra assim que é importado.
  Conferido só até o pacote JavaScript do Android (`expo export`); falta testar no celular com o
  próximo APK.

## 2026-10-28 — Painel mais leve para o servidor (central e tela Início)
- Quem: Natan, com apoio de IA
- PR/branch: `perf/painel-polling` (criada em cima de `fix/travamento-login`)
- O que foi adicionado: rota `GET /registros/resumo-glicemia?dias=` (7 a 90, padrão 30) com o
  que a Início mostra já contado: medições e alertas por dia, a última medição de cada paciente
  e os alertas do período anterior. A classificação é a do `avaliarGlicemia`, sem repetir regra.
  `apps/web/src/lib/polling.ts`: repete a busca só com a aba visível, sem rodada sobreposta, e
  recarrega ao voltar para a aba. Testes do resumo em `registros.service.spec.ts`.
- O que foi modificado:
  - Início (`HomePage.tsx`): usa o resumo em vez de baixar todas as glicemias de 90 dias de
    todos os pacientes (10,8 MB com 50 pacientes; agora 3,5 KB). Trocar o período busca de novo.
  - Central de notificações (`NotificationCenter.tsx`): de 5 s para 30 s, parada com a aba
    escondida. Mensagem nova continua aparecendo na hora pelo SSE.
  - `scripts/carga/teste-carga.mjs` simula o painel novo; o antigo com
    `--central-ms 5000 --inicio-antigo`.
- Arquivos principais: `apps/api/src/modules/registros/registros.service.ts`,
  `apps/web/src/pages/app/HomePage.tsx`, `apps/web/src/components/NotificationCenter.tsx`,
  `apps/web/src/lib/polling.ts`.
- Atenção para quem vier depois: conferido no navegador, Início antiga e nova lado a lado com a
  mesma nutricionista (50 pacientes, 90 dias): indicadores, situação dos pacientes, gráfico e
  rodapé iguais nos três períodos. A única diferença foi o selo "↑ x% nos alertas", porque o
  cálculo antigo ignorava medições com hora futura só nele (os outros números já as contavam);
  no uso real não existe medição no futuro. Com a Início parada 35 s: 25 chamadas e 12,6 MB
  antes, 7 chamadas e 0,35 MB agora. Aba escondida por 65 s: nenhuma chamada.

## 2026-10-28 — Travamento da API com logins simultâneos
- Quem: Natan, com apoio de IA
- PR/branch: `fix/travamento-login` (criada em cima de `docs/analise-desempenho`)
- O que foi adicionado: `auth.service.spec.ts`, que faz login, renovação de sessão, cadastro e
  login com Google num pool de uma conexão só e falha se alguém pedir uma segunda conexão
  segurando a primeira. Linha nova no "NÃO MEXA" do `LEIA_PRIMEIRO_IA.md` sobre isso.
- O que foi modificado:
  - `auth.service.ts`: o `issueSession` grava o refresh token direto pelo pool, e a renovação, o
    cadastro e o login com Google só montam a sessão depois de soltar a conexão da transação.
    Antes, com ~15 logins ou renovações juntos, as 10 conexões ficavam presas esperando uma
    segunda e a API parava de falar com o banco até ser reiniciada.
  - `database.module.ts`: `connectionTimeoutMillis` de 15 s; pool esgotado vira erro em vez de
    espera sem fim.
  - `status.controller.ts`: `/status` responde 503 quando o banco não responde (o corpo é o
    mesmo). É o `healthCheckPath` do Render, que só olha o código HTTP.
- Arquivos principais: `apps/api/src/modules/auth/auth.service.ts`,
  `apps/api/src/database/database.module.ts`, `apps/api/src/modules/status/status.controller.ts`.
- Atenção para quem vier depois: conferido num contêiner com 0,1 CPU (igual ao Render gratuito)
  com `node scripts/carga/teste-carga.mjs travamento --n 30`: 30 logins e 30 renovações
  simultâneos passaram. O erro de tempo limite do pool ainda sai como 500 (traduzir para 503
  mexeria no `AllExceptionsFilter`). Com o banco fora, o Render agora marca a API como fora do
  ar e pode reiniciá-la.

## 2026-10-28 — Análise de desempenho e concorrência
- Quem: Natan, com apoio de IA
- PR/branch: `docs/analise-desempenho` (criada em cima de `docs/analise-seguranca-lgpd`)
- O que foi adicionado: `docs/ANALISE_DESEMPENHO.md` (desempenho da API, banco, painel, app e
  hospedagem, com testes de carga e projeções); `scripts/carga/teste-carga.mjs` (teste de carga
  sem dependências: rota a rota, pessoas usando ao mesmo tempo, SSE e travamento do login) e
  `scripts/carga/popular-carga.sql` (1.000 pacientes com 90 dias de uso, só para banco
  descartável).
- O que foi modificado: só documentação (este histórico e as pendências do
  `LEIA_PRIMEIRO_IA.md`). Nenhuma mudança no código da aplicação.
- Arquivos principais: `docs/ANALISE_DESEMPENHO.md`, `scripts/carga/`.
- Atenção para quem vier depois: achado crítico — ~15 logins ou renovações de sessão
  simultâneos travam a API até reiniciar (pool de conexões preso no `auth.service.ts`); a
  correção está descrita e foi testada, mas não entrou neste PR. O painel é o que mais pesa no
  servidor gratuito (polling de 5 s e a Início com 10,8 MB a cada 30 s). Os testes rodaram num
  banco Postgres isolado e num contêiner com 0,1 CPU imitando o Render gratuito; nada tocou o
  banco publicado.

## 2026-10-28 — Análise de segurança, redes e LGPD
- Quem: Natan, com apoio de IA
- PR/branch: `docs/analise-seguranca-lgpd`
- O que foi adicionado: `docs/ANALISE_SEGURANCA_LGPD.md` — análise da API, painel, app,
  infraestrutura e conformidade LGPD. Metodologia: leitura do backend, 86 testes ativos contra
  uma cópia local da API com banco Postgres isolado (criado e descartado só para o teste),
  verificações passivas no deploy do time, `npm audit` e levantamento regulatório.
- O que foi modificado: só documentação (este histórico e a lista de pendências do
  `LEIA_PRIMEIRO_IA.md`). Nenhuma mudança em código.
- Arquivos principais: `docs/ANALISE_SEGURANCA_LGPD.md`.
- Atenção para quem vier depois: achado novo de autorização — `GET /planos/ativo?pacienteId=`
  (`planos.service.ts`, `findAtivo`) não confere vínculo e entrega o plano de qualquer paciente
  a nutricionista sem vínculo e ao administrador. É o único vazamento clínico encontrado; os
  outros módulos estão corretos. Credenciais de demonstração (admin e exemplos) são públicas no
  README e funcionam no site no ar — trocar antes de qualquer uso real.

## 2026-10-28 — Olho para mostrar a senha no login
- Quem: Natan, com apoio de IA
- PR/branch: `feat/olho-senha` (criada em cima de `feat/apk-eas`, PR #14)
- O que foi adicionado: botão de olho que mostra e esconde a senha no login e no cadastro do app
  (no `FormField`, para todo campo com `secureTextEntry`) e no login e no cadastro do painel
  (`CampoSenha` em `LoginPage.tsx`).
- O que foi modificado: os olhos que já existiam em Perfil > Alterar senha e Excluir conta ganharam
  `hitSlop`, porque a área de toque tinha 18 px.
- Arquivos principais: `apps/mobile/src/components/FormField.tsx`,
  `apps/web/src/pages/auth/LoginPage.tsx`, `apps/web/src/pages/auth/LoginPage.module.css`.
- Atenção para quem vier depois: no painel o olho nativo do Edge foi escondido
  (`::-ms-reveal`) para não aparecerem dois.

## 2026-10-28 — APK de demonstração pelo EAS Build
- Quem: Natan, com apoio de IA
- PR/branch: `feat/apk-eas`
- O que foi adicionado: `apps/mobile/eas.json` com o perfil `preview` (APK de instalação direta,
  apontando para `nutricare-tcc-api.onrender.com`); seção "APK do aplicativo" no
  `docs/PUBLICAR.md`.
- O que foi modificado: `apps/mobile/app.json` ganhou `owner` e `extra.eas.projectId`, que ligam o
  app ao projeto `@natanzinho23/projeto-tcc-mobile` no expo.dev. Nenhuma versão mudou.
- Arquivos principais: `apps/mobile/eas.json`, `apps/mobile/app.json`, `docs/PUBLICAR.md`.
- Atenção para quem vier depois: a chave de assinatura (keystore) está guardada no Expo, na conta
  do Natan. Testado num Android de verdade: login, alerta de glicemia, lembrete com som e
  mensagens em tempo real funcionaram. O login com Google ainda não funciona no APK (o botão
  avisa "Google não configurado").

## 2026-10-28 — Teclado e barra de abas no Android; aviso da própria mensagem no painel
- Quem: Natan, com apoio de IA
- PR/branch: `fix/teclado-e-aviso-de-mensagem`
- O que foi modificado:
  - App: no Android o teclado cobria o campo de digitar e o botão de enviar. Com o app ocupando a
    tela inteira (edge-to-edge, Expo 54), o sistema não encolhe mais a tela; agora o
    `ScreenContainer` e as telas de login, primeiro acesso do paciente, esqueci a senha, conversa e
    perfil (editar, senha, excluir) abrem o espaço com `KeyboardAvoidingView`
    (`behavior="padding"`) também no Android.
  - App: a barra de abas ficava atrás dos botões do Android (◁ ○ □). Ela passa a somar a altura
    da barra do sistema (`useSafeAreaInsets`). No iPhone e no navegador nada muda.
  - Painel: a nutricionista recebia "Nova mensagem de ..." com o próprio nome ao enviar uma
    mensagem, porque o servidor manda o evento para os dois lados da conversa. O aviso agora
    ignora mensagem própria.
- Arquivos principais: `apps/mobile/src/components/ScreenContainer.tsx`,
  `apps/mobile/src/app/(tabs)/_layout.tsx`, `apps/web/src/components/NotificationCenter.tsx`.
- Atenção para quem vier depois: nas telas de perfil o diff é quase todo indentação (use
  `git diff -w`). Conferido num Android de verdade com navegação de 3 botões, pelo Expo Go.

## 2026-10-27 — Login com Google próprio na segunda cópia
- Quem: Natan, com apoio de IA
- PR/branch: `feat/render-tcc-google`
- O que foi adicionado: cliente "NutriCare - Painel Web" no projeto `nutricare-tcc` do Google
  Cloud, na conta do Natan, com a origem `https://nutricare-tcc-painel.onrender.com`.
- O que foi modificado: `GOOGLE_CLIENT_ID` e `VITE_GOOGLE_CLIENT_ID` no `render-tcc.yaml` passam a
  usar esse cliente. O ID da equipe (`render.yaml`, `.env` de desenvolvimento) não mudou.
- Arquivos principais: `render-tcc.yaml`, `docs/LOGIN_GOOGLE.md`, `docs/PUBLICAR.md`.
- Atenção para quem vier depois: os usuários de teste dessa cópia ficam no projeto
  `nutricare-tcc`, não no projeto do cliente original.

## 2026-10-27 — Segunda cópia no Render (`render-tcc.yaml`)
- Quem: Natan, com apoio de IA
- PR/branch: commit `2290c6d`, que entrou direto na `main`, sem PR (a branch local
  `feat/render-tcc` seguia a `origin/main` por engano). O CI passou.
- O que foi adicionado: `render-tcc.yaml`, igual ao `render.yaml` fora os nomes
  (`nutricare-tcc-*`) e os endereços. Foi publicado como Blueprint na conta do Render do Natan,
  porque o plano gratuito não deixa convidar ninguém para a conta da cópia original. Essa cópia
  já envia e-mail pelo Brevo, na porta 2525.
- O que foi modificado: comentário no topo do `render.yaml` apontando para a segunda cópia; nova
  seção "Segunda cópia" no `docs/PUBLICAR.md`.
- Atenção para quem vier depois: mudou o `render.yaml`? Mude o `render-tcc.yaml` também. O banco
  da segunda cópia nasceu em 27/10 e o gratuito do Render vence em 30 dias. O commit `2290c6d`
  ficou com rodapé de ferramenta; tirar exigiria reescrever a `main`.

## 2026-10-27 — Aviso sobre o login com Google no README
- Quem: equipe, com apoio de IA
- PR/branch: #11, `docs/ia-e-limpeza`
- O que foi adicionado: aviso no `README.md` (passos da API e do painel) e seção "Ao rodar o
  projeto (armadilhas)" em `docs/LEIA_PRIMEIRO_IA.md`. Explica por que aparece "Configure
  VITE_GOOGLE_CLIENT_ID no .env" e como resolver.
- O que foi modificado: nada em código.
- Atenção para quem vier depois: o Client ID não é segredo; a chave secreta do cliente nunca vai
  para o repositório.

## 2026-10-27 — Documentação para IA e limpeza de comentários
- Quem: equipe, com apoio de IA
- PR/branch: `docs/ia-e-limpeza`
- O que foi adicionado: `CLAUDE.md`, `AGENTS.md`, `docs/LEIA_PRIMEIRO_IA.md` e este histórico.
- O que foi modificado: comentários dos arquivos que a IA alterou no PR #6 (e no PR #10, na
  branch dele), deixados curtos e no jeito do resto do código. Nenhuma função foi alterada.
- O que foi removido: rodapé de ferramenta nas descrições dos PRs #6, #7 e #10. Os commits que
  já existem (`45c1e4c` na `main` e `170dca3` na branch do PR #10) continuam com o rodapé, porque
  tirar isso exigiria reescrever histórico com force-push. Commits novos saem sem rodapé.
- Atenção para quem vier depois: antes de mexer em qualquer coisa, leia as regras de "não mexa".

## 2026-10-27 — Barra lateral nova do painel web (PR #10, aberto)
- Quem: equipe, com apoio de IA
- PR/branch: #10, `feat/sidebar-redesign`
- O que foi adicionado: contador de mensagens não lidas no item "Mensagens".
- O que foi modificado: topo da barra (agora mostra o perfil), grupos separados por fio, item
  ativo com ícone em quadrado azul, rodapé com "Recolher menu" e "Sair da conta".
- O que foi removido: ícone e nome "NutriCare / Painel clínico" do topo da barra lateral.
- Arquivos principais: `apps/web/src/components/layout/AppLayout.tsx` e `AppLayout.module.css`.
- Atenção para quem vier depois: a barra do topo no celular ainda mostra "NutriCare".

## 2026-10-27 — Convite de vínculo (PR #7, fechado; entrou na main por outro caminho)
- Quem: equipe, com apoio de IA
- PR/branch: #7, `feat/convite-vinculo` (obsoleta, não usar)
- O que aconteceu: a primeira versão do convite ficou nessa branch e o PR foi fechado. A versão
  que vale está na `main` (PR #8, tabela `solicitacao_vinculo`, `ConvitesService`).
- Atenção para quem vier depois: não faça merge dessa branch; ela usa a migration 016 com outro
  conteúdo e conflita com a que está na `main`.

## 2026-10-27 — Correções do teste funcional (PR #6, na `main`)
- Quem: equipe, com apoio de IA
- PR/branch: #6, `fix/bugs-teste-funcional`
- O que foi adicionado: `common/data-nascimento.ts`, `common/limite-tentativas.ts`, `helmet`,
  gravação do histórico de notificações dos alertas críticos, validação de peso/altura.
- O que foi modificado: plano novo encerra o anterior; mensagens de validação da glicemia em
  português; `AllExceptionsFilter` devolve 400/409/413 para id inválido, duplicidade e corpo
  grande; link de redefinir senha só com `RESET_LINK_NA_RESPOSTA=true`.
- O que foi removido: o vínculo automático do paciente com todos os nutricionistas.
- Arquivos principais: `apps/api/src/modules/auth/*`, `planos/planos.service.ts`,
  `push/push.service.ts`, `common/logging/all-exceptions.filter.ts`, `render.yaml`.
- Atenção para quem vier depois: depois do PR, paciente novo só aparece para o nutricionista
  depois de um vínculo. Hoje esse vínculo depende do aceite do paciente (PR #8).
