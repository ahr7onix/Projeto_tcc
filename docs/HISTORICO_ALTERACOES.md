# Histórico de alterações

Entradas mais novas primeiro. Regras e formato: veja `docs/LEIA_PRIMEIRO_IA.md`.


## 2026-10-28 — Limpeza de scripts sem uso na raiz
- Quem: equipe, com apoio de IA
- PR/branch: `chore/limpeza-repo`
- O que foi removido:
  - `sincronizar.ps1`: fazia `git add .`, commit e push a cada 10 s. Foi ele que levou `.env` e
    `node_modules` para o histórico, e a análise de segurança recomenda não usar.
  - `iniciar.bat` e `expo-com-log.bat`: atalho do Windows (Docker + painel + Expo). O mesmo se faz
    pelos comandos do `README.md` ("Como rodar").
  - `iniciar-email.bat`: só chamava `npm run maildev` na API.
  - `scripts/e2e-retest.mjs` e `scripts/e2e-web-only.mjs`: testes avulsos que ninguém chamava e que
    o `scripts/e2e-smoke.mjs` (`npm run e2e`) já cobre.
- O que foi modificado: `docs/REVISAO_CODIGO.md` e `docs/ANALISE_SEGURANCA_LGPD.md` (avisam que o
  `sincronizar.ps1` saiu; o link quebrado virou texto). Nada em código da aplicação.
- Atenção para quem vier depois: tudo continua no histórico do Git. Para subir o sistema no

## 2026-10-30 — Versão 1.0
- Quem: Natan, com apoio de IA
- PR/branch: `release/v1.0`
- O que foi modificado:
  - App e API passam para a versão 1.0.0 (`apps/mobile/app.json`, `package.json` e
    `package-lock.json` de `apps/mobile` e `apps/api`; a raiz e o painel já estavam em 1.0.0).
    Como a `runtimeVersion` segue o `version`, o app precisa de APK novo: as atualizações pela
    internet publicadas depois deste merge só chegam ao APK 1.0.0.
  - Revisão da documentação para a entrega. `DOCUMENTACAO_TCC.md`: login Google no app e
    lembretes e alertas conferidos em aparelho (saem os "[PENDENTE DE CONFIRMAÇÃO]" desses
    pontos), push do servidor descrito como sem Firebase, e-mail configurado no ar, APK e
    `expo-updates` na seção do Expo, funcionalidades novas na 10.3, 10.4 e 12.2 atualizadas,
    277 testes em 27 arquivos e o teste ponta a ponta na 10.6. `RESUMO_ENTREGA.md`: RF07 e
    próximos passos. `README.md` e `PUBLICAR.md`: as duas cópias no ar (a `nutricare-tcc` é a
    do APK), o APK no lugar de "roda pelo Expo" e o consentimento do paciente, que já existe.
- Atenção para quem vier depois: continuam pendentes, de propósito, a autoria (seção inicial do
  documento), a execução por Docker (8.11), o banco sem prazo, o Firebase e a conferência da
  Nutrição. Trocar as senhas de exemplo do admin e da Camila na cópia `nutricare-tcc` ficou para
  depois, por decisão do Natan.

## 2026-10-29 — TACO no ar e contagem da tela Alimentos do painel
- Quem: Natan, com apoio de IA
- PR/branch: `fix/alimentos-total-taco`
- O que aconteceu: depois do PR #24, a TACO 4ª edição foi importada no painel no ar, com a conta
  da Camila e fonte "TACO 4ª edição": 578 novos em 7 s. Os 36 alimentos de exemplo foram
  desativados (`ativo = false`); no ar ficaram 578 alimentos ativos, todos da TACO, em 15 grupos.
  A atualização do app pela internet com as telas do PR #24 saiu no mesmo dia.
- O que foi modificado: a tela Alimentos do painel busca no máximo 200 e dizia "200 alimentos
  listados", como se a tabela tivesse 200. Agora diz "200 de 578 na tabela" (total tirado da
  contagem por grupo, que a tela já carregava) e avisa no fim da lista que use a busca ou o
  grupo para achar os outros. "Remover" passou a atualizar essa contagem.
- Documentação: README (seed e RF15), `DOCUMENTACAO_TCC.md` (limitação 1, requisito 1, tabela
  nutricional, 10.4 e 12), `RESUMO_ENTREGA.md`, `CONFERENCIA_NUTRICAO.md` (nota na seção 2) e
  `LEIA_PRIMEIRO_IA.md` deixam de dizer que falta a tabela oficial. Continua faltando a
  conferência da Nutrição e decidir os 19 alimentos que a TACO traz sem valor.
- Atenção para quem vier depois: a listagem `GET /alimentos` devolve no máximo 500 itens; para
  contar ou varrer a tabela inteira, use `GET /alimentos/grupos` (traz o total de cada grupo) ou
  filtre por grupo.

## 2026-10-29 — Importação da TACO inteira pelo painel
- Quem: Natan, com apoio de IA
- PR/branch: `fix/taco-tracos`
- O que aconteceu: testando a importação com a TACO 4ª edição pronta em CSV
  (github.com/brolesi/taco, 597 alimentos), o painel recusava 57. O arquivo grava o traço ("Tr")
  como `1e-05`, e o leitor da planilha não aceitava número em notação científica.
- O que foi modificado:
  - `lerNumero` (`apps/web/src/lib/planilha-alimentos.ts`) aceita notação científica. Agora
    entram 578. Os 19 de fora não têm o dado na própria TACO (óleos e azeites sem carboidrato e
    proteína, 6 alimentos sem análise, 4 carnes e peixes com carboidrato levemente negativo), e
    a tela mostra o motivo de cada um.
  - App, tela Alimentos: com a TACO são uns 30 grupos, e os filtros quebrando linha cobriam a
    tela antes do resultado. Agora ficam numa linha só que desliza para o lado.
  - App, telas Alimentos e Refeição: o carboidrato da lista aparecia cru ("11.94"); agora sai
    como no detalhe ("11,9"). A função de formatar, que estava copiada em duas telas, foi para
    `formatarQuantidade` em `apps/mobile/src/lib/api/alimentos.ts`.
- Atenção para quem vier depois: importada duas vezes no painel local. Na 1ª, 578 gravados em
  2 s; na 2ª, 0 novos e 578 atualizados (não duplica). Na busca, os 36 alimentos de exemplo
  aparecem ao lado dos da TACO ("Arroz integral cozido" e "Arroz, integral, cozido"); desativar
  os de exemplo é decisão da equipe. A importação no painel no ar fica para depois deste merge,
  porque o painel de lá ainda recusa os 57. A parte do app é só JavaScript: vai ao celular pela
  atualização da internet (`npm run atualizar`). `npm run verificar` e `npm run e2e:fluxo`
  (21/21) passaram.

## 2026-10-29 — Teste no ar: paciente cadastrado pela nutricionista
- Quem: Natan, com apoio de IA
- PR/branch: sem mudança de código (registrado junto com `fix/taco-tracos`)
- O que foi testado: no painel no ar, a Camila cadastrou um paciente novo; o e-mail com o link
  chegou na caixa principal do Gmail; o paciente criou a senha (o mesmo link usado de novo foi
  recusado), entrou no app, o primeiro acesso veio com nascimento, sexo e tipo de diabetes já
  preenchidos, aceitou o convite e apareceu na lista da Camila. No fim ele excluiu a conta e
  saiu da lista. Tudo passou.
- Atenção para quem vier depois: o Brevo troca o link do e-mail por um endereço de rastreamento
  de cliques (`sendibt3.com`) que redireciona para o painel; no plano gratuito não dá para
  desligar. Paciente recém-aceito aparece como "Inativo" no painel: "Ativo" quer dizer registro
  nos últimos 7 dias.

## 2026-10-29 — App aguenta a API acordando; primeira atualização pela internet
- Quem: Natan, com apoio de IA
- PR/branch: `fix/servidor-acordando`
- O que aconteceu: no celular, às vezes o login demorava ou falhava e às vezes era rápido. A API
  do Render gratuito dorme depois de 15 min parada e leva de 30 a 60 s para acordar, e o app
  desistia com 15 s. Pior: o tempo esgotado aparecia como "E-mail ou senha incorretos".
- O que foi modificado:
  - Espera de até 60 s nas chamadas do app (`lib/api.ts`).
  - O app manda um "acorda" (`GET /status`) ao abrir e ao voltar para a frente.
  - No login, depois de 5 s aparece "Acordando o servidor. A primeira entrada depois de um
    tempo parado pode levar até 1 minuto."
  - Tempo esgotado tem mensagem própria ("O servidor demorou para responder...").
  - Login com Google sem internet (código 7 do Google) diz "Sem internet para falar com o
    Google..." no lugar de "NETWORK_ERROR".
- Arquivos principais: `apps/mobile/src/lib/api.ts`, `apps/mobile/src/app/_layout.tsx`,
  `apps/mobile/src/components/auth/LoginForm.tsx`, `apps/mobile/src/hooks/use-auth.ts`,
  `apps/mobile/src/lib/google-sign-in.ts`.
- Atenção para quem vier depois: conferido no Chrome atrasando o login em 20 s de propósito (o
  aviso aparece e o login completa). Em 29/10 saiu a primeira atualização pela internet (as
  correções do PR #22): o celular mostrou "Versão 0.1.0 · atualização de 29/10, 09:23" no
  Perfil, sem APK novo. Esta correção também é só JavaScript e vai do mesmo jeito.

## 2026-10-29 — Acabamentos do app e do gráfico do painel
- Quem: Natan, com apoio de IA
- PR/branch: `feat/fluxo-e-acabamentos`
- O que foi adicionado: no fim da tela Perfil do app, "Versão 0.1.0" e, quando o código veio
  pela atualização da internet, "· atualização de DD/MM, HH:MM" (`expo-updates`). É como se
  confere no celular que a atualização nova chegou.
- O que foi modificado:
  - Barra de abas do app: o texto encolhe um pouco só quando não cabe
    (`adjustsFontSizeToFit`). Em celular de 360 de largura "Alimentação" virava "Alimenta…".
    No navegador isso não tem efeito; vale no celular.
  - "Gerenciar" (Restrições e Medicamentos) e "Esqueceu a senha?" ganharam área de toque
    (`hitSlop`) e nome para leitor de tela.
  - Perfil do app: o selo dizia "Cliente"; agora diz "Paciente", como o resto do sistema.
  - Gráfico de linha do painel (`GraficoLinha`): com uma medida só, a área sombreada saía da
    borda esquerda e desenhava uma rampa que parecia tendência. Agora a área sai de baixo do
    primeiro ponto, e com um ponto só aparece só o ponto.
- Arquivos principais: `apps/mobile/src/app/(tabs)/_layout.tsx`,
  `apps/mobile/src/app/(tabs)/perfil/index.tsx`, `apps/web/src/components/GraficoLinha.tsx`.
- Atenção para quem vier depois: tudo do app aqui é JavaScript, então vai pela atualização da
  internet (`npm run atualizar`), sem APK novo. O encolhimento das abas só dá para conferir num
  celular estreito.

## 2026-10-29 — Teste do fluxo completo no repositório (`npm run e2e:fluxo`)
- Quem: Natan, com apoio de IA
- PR/branch: `feat/fluxo-e-acabamentos`
- O que foi adicionado: `scripts/e2e-fluxo.mjs`, que refaz a demonstração inteira no navegador
  em 21 passos, com contas novas: cadastro e aprovação da nutricionista, conta e primeiro acesso
  do paciente, convite e aceite, glicemia alta virando alerta, plano alimentar, mensagens nos dois
  sentidos, planilha de alimentos, receita, conteúdo educativo, relatório, humor, medidas,
  medicamento, anotação e o paciente encerrando o acompanhamento. Comando `npm run e2e:fluxo` na
  raiz. Fecha o item "atualizar o teste ponta a ponta com os fluxos novos" do plano de fechamento.
- O que foi modificado: README (tabela de comandos), regra 4 do `LEIA_PRIMEIRO_IA.md` (mexeu em
  tela ou fluxo, roda o teste), limitação 5 da `DOCUMENTACAO_TCC.md` (277 testes da API e o
  teste do fluxo). `.gitignore` ignora `scripts/e2e-falhas/`, onde ficam os prints dos passos que
  falham.
- Arquivos principais: `scripts/e2e-fluxo.mjs`, `scripts/package.json`, `package.json`.
- Atenção para quem vier depois: o teste cria contas e entra como o administrador do seed, então
  só roda em banco de desenvolvimento; ele se recusa a rodar contra endereço `onrender.com`. O
  app tem que estar em modo web (`npm run web` em `apps/mobile`) com o `EXPO_PUBLIC_API_URL`
  apontando para a mesma API. `MOSTRAR=1` abre o navegador na tela. Rodou 21/21 em 29/10, com o
  navegador visível e escondido.

## 2026-10-29 — Fluxo completo da demonstração conferido; três ajustes no painel
- Quem: Natan, com apoio de IA
- PR/branch: `feat/app-segundo-apk`
- O que foi conferido: a demonstração inteira no Chrome, com contas novas, painel e app (modo
  web) apontando para uma API local com o código da `main`. 23 passos: nutricionista se cadastra,
  fica barrada até a aprovação, admin aprova; paciente cria conta e faz o primeiro acesso;
  convite, aceite e paciente na lista; glicemia de 320 no app vira aviso no app e alerta no
  painel; plano alimentar criado no painel aparece no app; mensagens nos dois sentidos em tempo
  real; planilha de alimentos importada aparece na busca do app; receita publicada aparece no
  app; relatório abre com a glicemia.
- O que foi modificado:
  - Pacientes (painel): em tela de 1280 px o nome do paciente sumia, porque os botões da linha
    tomavam a largura toda; e o cabeçalho tinha colunas diferentes das linhas. Agora os dois usam
    as mesmas colunas, o nome tem largura mínima e os botões quebram linha.
  - Aviso de erro do painel (`AlertBanner`): rola até ficar visível quando aparece. No plano
    alimentar, o erro "Preencha o nome e os itens de todas as refeições" ficava no topo da janela
    enquanto a pessoa estava no botão "Criar plano", e parecia que o botão não fazia nada. Vale
    para todas as janelas e telas que usam o aviso.
  - Central de notificações (painel): cada alerta de glicemia aparecia duas vezes, uma delas sem
    o nome ("Um paciente registrou..."), porque somava o alerta e o histórico do push. O
    histórico do tipo `alerta_glicemia` ficou de fora da central.
  - App: o botão de enviar mensagem ganhou nome para leitor de tela ("Enviar mensagem").
- Arquivos principais: `apps/web/src/pages/app/PacientesPage.tsx`,
  `apps/web/src/components/ui/index.tsx`, `apps/web/src/components/NotificationCenter.tsx`,
  `apps/mobile/src/app/(tabs)/mensagens/[id].tsx`.
- Atenção para quem vier depois: no app em modo web, a tela ainda se monta logo depois de
  aparecer; teste automático que digita cedo demais perde o texto (no celular não acontece). O
  cadastro de paciente feito pela nutricionista (link de senha por e-mail) não entrou nesta
  rodada; o envio do link foi conferido no ar em 27/10.

## 2026-10-29 — Segundo APK conferido no celular
- Quem: Natan, com apoio de IA
- PR/branch: `feat/app-segundo-apk`
- O que foi conferido: o APK do build `6ae15033` do EAS, instalado por cima do primeiro num
  Android de verdade. Ícone e tela de abertura novos, login com Google (entrou como paciente
  novo) e lembrete no modo alarme (som de 30 s) funcionaram. Antes de entregar o APK, ele foi
  baixado e conferido: mesma assinatura do primeiro (SHA-1 cadastrado no Google Cloud), som em
  `res/raw`, Client ID web e endereço da API no pacote, atualização pela internet no manifesto.
- O que foi modificado: só documentação. `LEIA_PRIMEIRO_IA.md` (feito e limitações) e a
  limitação 6 da `DOCUMENTACAO_TCC.md`, que ainda dizia que o app não tinha sido conferido num
  celular. O que continua de fora é o push enviado pelo servidor, que depende do Firebase.
- Atenção para quem vier depois: a atualização pela internet está configurada, mas ainda não foi
  publicada nenhuma; a primeira deve ser conferida no celular (abrir, fechar e abrir o app).

## 2026-10-28 — Ícone e tela de abertura do app (logo provisório)
- Quem: Natan, com apoio de IA
- PR/branch: `feat/app-segundo-apk`, que junta num PR só as três entradas abaixo (login com
  Google no APK, lembrete como alarme e atualização pela internet) e esta
- O que foi adicionado: logo provisório (gota de glicemia com uma folha, no azul do app) em
  `apps/mobile/assets/logo.svg` e os PNGs que o Expo usa: `icon.png`, `adaptive-icon.png`
  (Android), `splash-icon.png` (tela de abertura, fundo azul) e `favicon.png` (navegador).
- O que foi modificado: `app.json` aponta para as imagens e configura o `expo-splash-screen`.
- O que foi removido: `assets/.gitkeep`, que só marcava onde esses arquivos iam.
- Atenção para quem vier depois: o logo é provisório; o grupo pode trocar por um melhor. Ícone e
  tela de abertura são nativos: trocar exige subir o `version` do `app.json` e gerar APK novo
  (não vão pela atualização pela internet). Conferido no `expo prebuild`.

## 2026-10-28 — Atualização do app pela internet (EAS Update)
- Quem: Natan, com apoio de IA
- PR/branch: `feat/atualizacao-pela-internet` (criada em cima de `feat/lembrete-alarme`)
- O que foi adicionado: `expo-updates` (`~29.0.20`, a versão do Expo 54; nenhuma outra versão
  mudou). O APK passa a buscar atualização no Expo toda vez que abre e aplica na abertura
  seguinte. Script `npm run atualizar -- "o que mudou"` (`apps/mobile/scripts/publicar-atualizacao.mjs`),
  que publica com as variáveis do perfil `preview` do `eas.json`, e não com o `.env` da máquina.
- O que foi modificado: `app.json` ganhou `runtimeVersion` (`policy: appVersion`) e
  `updates.url`; o perfil `preview` do `eas.json` ganhou `"channel": "preview"`.
- Arquivos principais: `apps/mobile/app.json`, `apps/mobile/eas.json`,
  `apps/mobile/scripts/publicar-atualizacao.mjs`, `docs/PUBLICAR.md`.
- Atenção para quem vier depois: só JavaScript vai pela internet. Mudança nativa exige subir o
  `version` do `app.json` e gerar APK novo, senão a atualização chega ao APK antigo e quebra o
  app. O APK que já existia (sem `expo-updates`) não recebe atualização. Conferido no
  `expo prebuild` (o manifesto do Android leva o endereço e a versão `0.1.0`); falta conferir
  no celular com o próximo APK.

## 2026-10-28 — Lembretes podem tocar como alarme
- Quem: Natan, com apoio de IA
- PR/branch: `feat/lembrete-alarme` (criada em cima de `feat/login-google-apk`)
- O que foi adicionado: na tela Saúde > Lembretes, o cartão "Como o celular avisa", com a chave
  "Tocar como alarme" e o botão "Tocar um teste" (toca em 5 segundos). Com a chave ligada, no
  Android os lembretes vão para o canal `lembretes-alarme`: som de 30 s
  (`assets/sounds/alarme.wav`, gerado pela equipe, sem direitos de terceiros), tocado no volume
  do alarme, vibração de ~12 s e aviso na tela bloqueada. O som para quando a pessoa abre a
  barra de notificações, toca no aviso ou o descarta. A escolha fica só no aparelho
  (`AsyncStorage`); banco e API não mudaram.
- O que foi modificado: `app.json` passa o som para o plugin do `expo-notifications`;
  `agenda-lembretes.ts` agenda no canal do modo escolhido e reagenda tudo ao trocar a chave.
- Arquivos principais: `apps/mobile/src/lib/agenda-lembretes.ts`,
  `apps/mobile/src/app/(tabs)/saude/lembretes.tsx`, `apps/mobile/app.json`.
- Atenção para quem vier depois: ficaram de fora os botões "Feito" e "Adiar 10 min" na
  notificação. Com o app fechado o Android só executa esses botões com o `expo-task-manager`
  (mais uma peça nativa), e sem ele o botão não faz nada. Conferido no navegador (a chave
  liga e continua ligada depois de recarregar) e no `expo prebuild` (o som vai para
  `res/raw`). No Expo Go a chave e o teste funcionam, mas toca o som padrão do celular, uma vez
  só: o arquivo do som só existe dentro do APK. O som de alarme só dá para conferir no celular,
  com o próximo APK.

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

## 2026-10-28 — Correções de segurança antes da banca
- Quem: Natan, com apoio de IA
- PR/branch: `fix/seguranca-antes-da-banca`
- O que foi adicionado: `common/numero-da-query.ts` (`diasDaQuery`, `limiteDaQuery`): o que não é
  inteiro positivo vira o padrão do serviço e o que passa do teto (3650 dias, 1000 itens) é
  cortado. Testes novos para isso e para a autorização dos planos (263 para 277).
- O que foi modificado:
  - `GET /planos/ativo` confere o vínculo (`garantirVinculo`) e recusa o administrador; antes
    entregava o plano de qualquer paciente (`ANALISE_SEGURANCA_LGPD.md`, item 2.1).
  - `GET /planos/:id` também recusa o administrador, que lia qualquer plano pelo número.
  - Todas as rotas com `?dias=` ou `?limite=` usam as funções acima; `?dias=abc` dava 500.
  - O "Sair" do painel chama `POST /auth/logout`, como o app, e o refresh token deixa de valer.
  - `npm audit fix` sem `--force` na API e no painel (só `package-lock.json`): API de 51 para 34
    alertas, 3 críticos para 0; painel de 6 para 4. O app ficou de fora de propósito (cadeia de
    build do Expo, risco para o APK).
- Arquivos principais: `apps/api/src/modules/planos/planos.service.ts`,
  `apps/api/src/common/numero-da-query.ts`, os controllers com `dias`/`limite`,
  `apps/web/src/contexts/AuthContext.tsx`.
- Atenção para quem vier depois: conferido numa cópia da API com o banco local, antes e depois:
  nutricionista sem vínculo 200 → 400, administrador 200 → 403, `?dias=abc` 500 → 200; e no
  Chrome, o "Sair" do painel manda o logout e o refresh antigo passa a dar 401. O que sobra do
  `npm audit` exige subir versão maior (Nest 12, Vite 8, React Router 7): fica para depois da
  banca.

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
