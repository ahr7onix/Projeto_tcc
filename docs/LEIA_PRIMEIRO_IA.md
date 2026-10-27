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
| Exclusão de conta feita pelo paciente (`desativado_em`) | É suave de propósito: não troque por `DELETE`, o histórico de saúde precisa ficar. (A remoção feita pelo administrador é definitiva, e isso também é intencional.) |
| Plano alimentar "ativo" | É calculado pelas datas de início e fim, não por coluna. Criar plano novo encerra o anterior. |
| Raiz do repositório sem npm workspaces | O Render instala cada serviço isolado pelo `rootDir`. Workspaces quebram o deploy. |
| `render.yaml` (`NODE_ENV=production`) e `RESET_LINK_NA_RESPOSTA` | Em produção o link de criar/redefinir senha nunca pode vir na resposta da API (`common/ambiente.ts`). Não ligue `RESET_LINK_NA_RESPOSTA` fora do desenvolvimento. |
| Segredos (`.env`, `JWT_SECRET`, senhas) | Nunca vão para o Git. A senha do admin do seed vale só em desenvolvimento. |
| Limites de tentativa (`common/limite-tentativas.ts`, `LimitePorMinutoGuard`) | Ficam na memória de uma instância. Com mais de uma réplica da API deixam de proteger; troque por armazenamento compartilhado antes de escalar. |
| Versões do Expo / React Native no app | Foram testadas juntas. Atualizar sem testar no celular pode quebrar o app. |

## Ao rodar o projeto (armadilhas)

- **Login com Google:** o `apps/web/.env.example` vem com um Client ID de mentira. Quem só copia o
  arquivo vê "Configure VITE_GOOGLE_CLIENT_ID no .env..." na tela de login. É preciso colocar o ID
  real (em `docs/LOGIN_GOOGLE.md`) em `VITE_GOOGLE_CLIENT_ID` no `apps/web/.env` e o mesmo valor em
  `GOOGLE_CLIENT_ID` no `apps/api/.env`, e reiniciar o painel e a API. Não troque o ID nem a
  credencial no Google sem a equipe, e nunca coloque a chave secreta do cliente no repositório.
- **App mobile:** em `EXPO_PUBLIC_API_URL` use o IP da máquina na rede, não `localhost`.
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

## Em andamento

- PR #10: barra lateral nova do painel web.

## Pendências conhecidas

Bugs pequenos, podem ser corrigidos:

- `?dias=` inválido ou gigante responde 500 em `/registros`, `/emocional/resumo` e
  `/emocional/glicemia` (falta validar o número).
- `tipo_refeicao` não é validado na API. O app usa `cafe`, `almoco`, `lanche`, `jantar` e `ceia`.
- Apagar medicamento só desativa; apagar de novo devolve 200 em vez de 404.
- O token de acesso continua valendo até expirar (15 min) depois de desativar a conta ou trocar a
  senha.
- Os testes automáticos escrevem erros falsos no `logs/` real da API.

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
