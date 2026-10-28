# Leia primeiro (vale para IA e para gente)

Se você vai mexer neste projeto com ajuda de uma IA, a IA precisa ler este arquivo **antes** de
qualquer alteração. Se você é a IA: leia tudo, siga as regras e, quando terminar, atualize o
`docs/HISTORICO_ALTERACOES.md` (veja "Como registrar o que você fez").

NutriCare: API (NestJS), painel web (React/Vite, nutricionista e administração), app mobile
(Expo, paciente) e banco PostgreSQL. Como rodar está no `README.md`. O detalhe de cada parte
está no `docs/DOCUMENTACAO_TCC.md`.

## Regras do fluxo de trabalho

1. Leia este arquivo e o topo do `docs/HISTORICO_ALTERACOES.md` antes de começar.
2. Trabalhe numa branch própria, nunca direto na `main`.
3. Mexa só no que o pedido exige. Não reescreva arquivo inteiro para "melhorar".
4. Antes de subir, rode `npm run verificar` na raiz (typecheck dos três projetos, testes da API e
   build). Mexeu no banco? Rode também `npm run db:verificar`.
5. Suba para o GitHub (commit, push e Pull Request) a cada atualização. Não deixe trabalho só na
   máquina.
6. Registre a mudança no `docs/HISTORICO_ALTERACOES.md` e, se mudou o que está "feito",
   "pendente" ou "não mexa", corrija esta página também. Tudo no mesmo PR da mudança.
7. Não apague nem pule teste para ficar verde. Se um teste quebrou, descubra por quê.
8. Não reescreva o histórico da `main` (nada de force-push nela).
9. Sem assinatura de ferramenta em código, commit ou PR (decisão da equipe). Comentário curto,
   em português, só quando explica o porquê. Sem emoji.

## NÃO MEXA sem combinar com a equipe

Cada item já deu problema sério ou daria. Se o pedido parece exigir mexer em algum deles, pare
e avise a equipe antes.

| Parte | Por que não mexer |
|---|---|
| `database/schema.sql` e `database/migrations/*.sql` | Os dois têm que descrever o mesmo banco. Toda mudança de banco vai nos dois, e migration já criada nunca é editada: cria-se uma nova com o número seguinte (a próxima é a 018). O CI confere (`npm run db:verificar`). Já houve tabela que existia só na migration e todo banco novo nascia sem ela. |
| Vínculo nutricionista–paciente (`nutricionista_paciente`, `VinculosService.garantirVinculo` / `resolverPacienteAlvo`, `ConvitesService`) | É o que autoriza o nutricionista a ver dado de saúde do paciente (LGPD, dado sensível). O vínculo só nasce quando o paciente aceita o convite. Não crie caminho que vincule sem aceite e não leia dado clínico sem passar por essa checagem. Já existiu vínculo automático com todos os nutricionistas e isso vazava dados. |
| Aprovação do nutricionista pela administração (migration 017) | O painel só abre depois que o admin confere o CRN e aprova. Não pule essa etapa. |
| `JwtAuthGuard`, `RolesGuard` e os `@Roles(...)` dos controllers | Afrouxar abre dado de um perfil para outro. Paciente só vê os próprios dados. |
| Faixas de glicemia (`apps/api/src/common/glicemia`) e fórmulas de nutrição (`apps/api/src/common/nutricao`) | É regra clínica. Só muda com validação do curso de Nutrição (`docs/CONFERENCIA_NUTRICAO.md`). Os alimentos do seed (`fonte = 'exemplo'`) são aproximados. |
| `AllExceptionsFilter` (formato das respostas de erro) | O painel e o app leem as mensagens de erro nesse formato. |
| Conexão presa do pool (`pool.connect()`) | Quem segura um `client` não pode chamar `this.pool` (nem serviço que use o pool) antes do `release()`. O pool tem 10 conexões: com ~15 pedidos juntos, todas ficavam presas esperando uma segunda e a API parava de falar com o banco até ser reiniciada. Já aconteceu no login e na renovação de sessão; o `auth.service.spec.ts` testa com um pool de uma conexão só. |
| Exclusão de conta feita pelo paciente (`desativado_em`) | É suave de propósito: não troque por `DELETE`, o histórico de saúde precisa ficar. (A remoção feita pelo administrador é definitiva, e isso também é intencional.) |
| Plano alimentar "ativo" | É calculado pelas datas de início e fim, não por coluna. Criar plano novo encerra o anterior. |
| Raiz do repositório sem npm workspaces | O Render instala cada serviço isolado pelo `rootDir`. Workspaces quebram o deploy. |
| `render.yaml` e `render-tcc.yaml` (`NODE_ENV=production`) e `RESET_LINK_NA_RESPOSTA` | Em produção o link de criar/redefinir senha nunca pode vir na resposta da API (`common/ambiente.ts`). Não ligue `RESET_LINK_NA_RESPOSTA` fora do desenvolvimento. |
| Segredos (`.env`, `JWT_SECRET`, senhas) | Nunca vão para o Git. A senha do admin do seed vale só em desenvolvimento. |
| Limites de tentativa (`common/limite-tentativas.ts`, `LimitePorMinutoGuard`) | Ficam na memória de uma instância. Com mais de uma réplica da API deixam de proteger; troque por armazenamento compartilhado antes de escalar. |
| Versões do Expo / React Native no app | Foram testadas juntas. Atualizar sem testar no celular pode quebrar o app. |

## Ao rodar o projeto (armadilhas)

- **Login com Google:** o `apps/web/.env.example` vem com um Client ID de mentira. Quem só copia o
  arquivo vê "Configure VITE_GOOGLE_CLIENT_ID no .env..." na tela de login. É preciso colocar o ID
  real (em `docs/LOGIN_GOOGLE.md`) em `VITE_GOOGLE_CLIENT_ID` no `apps/web/.env` e o mesmo valor em
  `GOOGLE_CLIENT_ID` no `apps/api/.env`, e reiniciar o painel e a API. Não troque o ID nem a
  credencial no Google sem a equipe, e nunca coloque a chave secreta do cliente no repositório.
  O `render-tcc.yaml` usa outro ID de propósito: é o cliente da segunda cópia, em outra conta.
- **App mobile:** em `EXPO_PUBLIC_API_URL` use o IP da máquina na rede, não `localhost`.
- **Android ocupa a tela inteira (edge-to-edge):** o teclado e a barra do sistema ficam por cima
  do app. Tela nova com campo de digitar vai dentro do `ScreenContainer` ou de um
  `KeyboardAvoidingView` com `behavior="padding"` (também no Android). Não tire a soma de
  `useSafeAreaInsets` da barra de abas.
- **APK:** não troque `slug`, `owner`, `extra.eas.projectId` nem `android.package` no
  `apps/mobile/app.json`. Eles ligam o app ao projeto do Expo, onde está a chave de assinatura.
  O SHA-1 dessa chave está cadastrado no Google Cloud para o login com Google do APK; chave
  nova exige cadastrar o SHA-1 novo (`docs/LOGIN_GOOGLE.md`, "APK (Android)").
  Como gerar: `docs/PUBLICAR.md`, "APK do aplicativo".
- **Lembretes como alarme:** o Android grava som e vibração do canal `lembretes-alarme` na
  primeira vez e ignora mudanças depois; para mudar, use outro id de canal
  (`apps/mobile/src/lib/agenda-lembretes.ts`). O som (`apps/mobile/assets/sounds/alarme.wav`)
  entra no APK pelo plugin do `expo-notifications` no `app.json`: trocar o som exige APK novo.
- **Atualização pela internet (EAS Update):** só para mudança de JavaScript, com
  `npm run atualizar -- "o que mudou"` em `apps/mobile`. Mudou algo nativo (pacote com código
  nativo, plugin, som, ícone, permissão)? Suba o `version` do `app.json` e gere APK novo, senão
  a atualização chega ao APK antigo e quebra o app (`docs/PUBLICAR.md`).
- **Dados de demonstração:** só existem se o banco for preparado com `SEED_DEMO=true`.

## O que já está feito

Resumo; o completo está em `docs/DOCUMENTACAO_TCC.md` (seção 10.3) e `docs/RESUMO_ENTREGA.md`.

- API com cadastro e login (e-mail e Google), refresh, redefinir senha, perfil, registros de
  glicemia e refeição, medidas, humor, medicamentos, lembretes, restrições, planos alimentares,
  alimentos (com importação por planilha), receitas, conteúdos, mensagens em tempo real,
  relatórios, alertas, notificações e administração.
- Painel web (nutricionista e administrador) e app mobile (paciente).
- Convite de vínculo com aceite do paciente, e o paciente pode encerrar o acompanhamento.
- Cadastro de nutricionista com aprovação pela administração.
- Correções do teste funcional (PR #6): plano novo encerra o anterior, histórico de notificações
  dos alertas críticos, validação de data de nascimento, peso e altura, erros 500 que viraram
  400/409/413, `helmet`, link de redefinir senha só com opt-in.
- Segunda cópia publicada pelo `render-tcc.yaml`, na conta do Render do Natan
  (`nutricare-tcc-painel.onrender.com`), com e-mail pelo Brevo e login Google em cliente próprio.
  A cópia do `render.yaml` continua sem e-mail.
- APK de demonstração gerado pelo EAS Build (`apps/mobile/eas.json`, perfil `preview`) e testado
  num Android de verdade. O login com Google do APK (Google Sign-In nativo), o modo alarme dos
  lembretes e a atualização pela internet estão no código e ainda precisam ser conferidos no
  celular, no próximo APK.

## Em andamento

- PR #10: barra lateral nova do painel web.

## Pendências conhecidas

Desempenho (detalhe em `docs/ANALISE_DESEMPENHO.md`):

- **Banda do painel:** a central de notificações ainda baixa o `/alertas?dias=7` inteiro (337 KB
  com 50 pacientes) a cada 30 s. Uma nutricionista com o painel aberto o dia todo passa dos 5 GB
  de banda por mês do Render gratuito. Próximo passo: recarregar só quando o SSE avisar.
- **Resumo da Início:** custa ~1,1 s no servidor gratuito porque classifica no Node as
  glicemias de 60 dias. Baixar mais pede gravar a severidade na glicemia (migration nova).

Bugs pequenos, podem ser corrigidos:

- **Autorização:** `GET /planos/ativo?pacienteId=` (`planos.service.ts`, `findAtivo`) não passa
  por `garantirVinculo` e entrega o plano alimentar de qualquer paciente a nutricionista sem
  vínculo e ao administrador. É o único vazamento clínico achado na análise de segurança
  (`docs/ANALISE_SEGURANCA_LGPD.md`, item 2.1). Corrigir no padrão do `findAll` do mesmo serviço.
- `?dias=` inválido ou gigante responde 500 em `/registros`, `/emocional/resumo` e
  `/emocional/glicemia` (falta validar o número).
- `tipo_refeicao` não é validado na API. O app usa `cafe`, `almoco`, `lanche`, `jantar` e `ceia`.
- Apagar medicamento só desativa; apagar de novo devolve 200 em vez de 404.
- O token de acesso continua valendo até expirar (15 min) depois de desativar a conta ou trocar a
  senha.
- Os testes automáticos escrevem erros falsos no `logs/` real da API.
- App em celular estreito (360 de largura): a barra de abas corta "Alimentação" e "Mensagens".
- App: "Gerenciar" (Saúde e Alimentação) e "Esqueceu a senha?" têm área de toque pequena
  (menos de 32 px de altura, sem `hitSlop`).

Limitações assumidas pela equipe (seção 1.8 da documentação): parâmetros clínicos ainda sem
validação da Nutrição, CRN conferido à mão, e-mail depende de SMTP configurado, ambiente
publicado é de demonstração, app não conferido em celular de verdade.

## Como registrar o que você fez

No fim de cada alteração, coloque uma entrada **no topo** do `docs/HISTORICO_ALTERACOES.md`:

```
## AAAA-MM-DD — título curto
- Quem: nome da pessoa e/ou ferramenta de IA usada
- PR/branch: link ou nome
- O que foi adicionado: ...
- O que foi modificado: ...
- O que foi removido: ...
- Arquivos principais: ...
- Atenção para quem vier depois: ...
```

Se a mudança altera o que está "feito", "em andamento", "pendente" ou "não mexa" aqui em cima,
atualize esta página também. Quem achar este arquivo desatualizado deve corrigi-lo.
