# Histórico de alterações

Entradas mais novas primeiro. Regras e formato: veja `docs/LEIA_PRIMEIRO_IA.md`.

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
