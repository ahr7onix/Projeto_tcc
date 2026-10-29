# Análise de segurança, redes e LGPD — NutriCare

Análise feita em 28/10/2026 sobre o estado atual da `main` (mais a branch
`feat/olho-senha`), cobrindo API, painel web, app mobile, infraestrutura de
rede e conformidade com a LGPD. Complementa, não substitui, o
`docs/REVISAO_CODIGO.md` e o `docs/LIMITACOES_LGPD.md`.

Legenda de gravidade: **[CRÍTICO]** · **[ALTO]** · **[MÉDIO]** · **[BAIXO]** ·
**[INFO]** (observação, sem ação obrigatória) · **[OK]** (testado e correto).

## Como foi testado

- **Backend:** leitura dos guards, do serviço de autenticação, do serviço de
  vínculos e de todos os módulos clínicos; mais 86 testes ativos (IDOR,
  escalada de perfil, JWT forjado, injeção SQL, força bruta, enumeração de
  contas, sessão, entrada maliciosa) rodados contra uma cópia local da API
  (`node dist/main.js` com `NODE_ENV=production`) ligada a um **banco Postgres
  isolado** (`tcc_seg`), criado e descartado só para o teste. Nenhum dado real
  foi tocado.
- **Deploy publicado:** verificações **passivas** na própria cópia do time
  (`nutricare-tcc-*.onrender.com`): cabeçalhos HTTP, versões de TLS, CORS,
  redirecionamento HTTP→HTTPS, bundle do painel e comportamento do limite de
  tentativas. Só leitura e requisições de login com as credenciais que já são
  públicas no README; nada destrutivo.
- **Dependências:** `npm audit` de produção nos três aplicativos.
- **Regulatório:** levantamento das normas vigentes (LGPD, resoluções da ANPD,
  CFN, Lei 13.787/2018 e a Lei 15.211/2025 — "ECA Digital").

O que o navegador/celular não mostra (comportamento do app Android empacotado)
não entrou nesta rodada.

---

## 1. Resumo executivo

O projeto está, no essencial, **bem construído em segurança de aplicação**: a
autorização por perfil funciona, o acesso a dado de saúde passa por um ponto
único de verificação de vínculo, não há injeção SQL, os segredos não vão para o
repositório, os logs são higienizados e o deploy usa TLS 1.3 com bons
cabeçalhos. A arquitetura de consentimento (convite + aceite) e a aprovação do
CRN pela administração resolvem a maior falha de LGPD que o
`LIMITACOES_LGPD.md` apontava.

O que precisa de atenção se divide em três blocos:

1. **Operacional, para resolver já (mesmo sendo demonstração):** as credenciais
   de administrador e dos usuários de exemplo são **públicas** (estão no README
   de um repositório público) e **funcionam no site no ar**. Qualquer pessoa
   entra como administrador. Isto já estava marcado como prioridade no plano de
   fechamento.
2. **Dois bugs de código reais:** um endpoint de plano alimentar vaza dados
   clínicos entre pacientes sem vínculo (item 2.1), e o limite de tentativas de
   login não está confiável atrás do proxy do Render (item 2.3).
3. **Conformidade para uso real:** antes de qualquer paciente de verdade, há
   itens de LGPD que não são de código (crianças/adolescentes, encarregado,
   resposta a incidente, transferência internacional). Detalhado na seção 6.

**Conclusão honesta para a banca:** o sistema **não está frágil a ataque
técnico comum** (injeção, escalada de perfil, token forjado — tudo barrado). A
fragilidade está em **configuração de demonstração** (senhas públicas no ar) e
em **requisitos de conformidade** que faltam para sair da demonstração. É
exatamente o recorte de um TCC, e dá uma ótima seção de "limitações e trabalhos
futuros".

---

## 2. Backend (API NestJS)

### 2.1 [ALTO] `/planos/ativo` entrega o plano de qualquer paciente

[planos.service.ts:462](../apps/api/src/modules/planos/planos.service.ts#L462)

Todos os outros caminhos clínicos (registros, saúde, anotações, medicamentos,
emocional, relatórios, mensagens, lista de planos) passam por
`garantirVinculo`/`resolverPacienteAlvo` e foram testados: um nutricionista
**sem vínculo** e o **administrador** recebem 400/403. O `findAtivo` ficou de
fora:

```ts
async findAtivo(user: JwtPayload, pacienteId?: string) {
  const alvo = user.role === 'paciente' ? user.sub : pacienteId;
  if (!alvo) throw new BadRequestException('Informe o pacienteId');
  // ...consulta direto por up.id_usuario = alvo, sem conferir vínculo
```

Confirmado no teste: um nutricionista aprovado mas **sem vínculo** com o João, e
também o **administrador**, leram o plano alimentar ativo completo do João
(refeições, horários, observações clínicas) por
`GET /planos/ativo?pacienteId=3`. É uma falha de autorização em nível de objeto
(OWASP API #1 / A01:2025 Broken Access Control) e um vazamento de dado sensível.

**Correção:** no `findAtivo`, quando `user.role === 'nutricionista'`, chamar
`this.vinculos.garantirVinculo(user.sub, pacienteId)` antes da consulta — igual
ao que o `findAll` do mesmo serviço já faz pelo filtro por `un.id_usuario`. E o
administrador não deve alcançar este recurso (os outros módulos clínicos já o
recusam). É uma correção de poucas linhas, no padrão que o resto do serviço já
usa.

### 2.2 [CRÍTICO (operacional)] Credenciais padrão públicas e ativas no ar

[README.md:105](../README.md#L105) · [seeds_admin.sql](../database/seeds_admin.sql) · [preparar-banco.mjs:121](../apps/api/preparar-banco.mjs#L121)

- O repositório é **público** (`ahr7onix/Projeto_tcc`, `visibility: public`).
- O README traz `admin@nutricare.local` / `NutriCare@2026`, e o `PUBLICAR.md`
  traz `camila.souza@nutri.com` / `Senha123!` e `joao.silva@email.com` /
  `Senha123!`.
- `preparar-banco.mjs` roda `seeds_admin.sql` **a cada inicialização** (não só
  na primeira), e o `render-tcc.yaml` sobe com `SEED_DEMO=true`.

Verificado no site no ar: as três credenciais **entram** — inclusive a de
administrador. Ou seja, qualquer pessoa que ache o repositório tem o painel de
administração da cópia publicada.

Isto é tolerável **só** porque o ambiente é declaradamente de demonstração com
dados fictícios. Mas é exposição real e já estava anotado como prioridade no
plano de fechamento ("trocar as senhas do admin e da Camila na cópia
`nutricare-tcc`").

**Correção:** trocar a senha do admin na cópia publicada (gerar hash com
`database/gerar-hash-admin.js`, como o `PUBLICAR.md` ensina), trocar as senhas
dos usuários de exemplo, e **antes de qualquer uso real** subir com
`SEED_DEMO=false` e apagar os usuários de exemplo. Mapeia para A02:2025
(Security Misconfiguration) e A07:2025 (Authentication Failures).

### 2.3 [MÉDIO] Limite de tentativas de login não confiável no Render

[limite-tentativas.ts](../apps/api/src/common/limite-tentativas.ts) · [auth.controller.ts:66](../apps/api/src/modules/auth/auth.controller.ts#L66) · [main.ts:21](../apps/api/src/main.ts#L21)

A chave do bloqueio é `req.ip | email`. Dois problemas observados:

- **Local:** o bloqueio funciona (11ª senha errada vira 429), **mas** é
  contornável mandando um cabeçalho `X-Forwarded-For` falso — a chave muda de IP
  e a contagem zera. Com `app.set('trust proxy', 1)` e sem proxy real na
  frente, o IP que o Express usa passa a ser o que o cliente declarou.
- **Produção:** 11 logins errados seguidos na mesma conta **não** dispararam o
  429. Atrás do Render (que fica atrás do Cloudflare) há mais de um salto de
  proxy, então `trust proxy: 1` não resolve o IP real do cliente de forma
  estável e a contagem por IP não se mantém.

Agrava isso a vulnerabilidade **crítica** do pacote `proxy-addr` (ver seção 5):
falha de confiança em IPv4 mapeado em IPv6, que é exatamente o mecanismo em que
esse bloqueio se apoia.

Além disso, o limite por minuto (cadastro, esqueci-senha) tem chave `ip:email`:
variando o e-mail, um mesmo IP cria contas e dispara e-mails **sem limite**
(testado: 7 cadastros e 8 "esqueci a senha" seguidos, todos aceitos). Com SMTP
real (Brevo), isso gasta a cota de e-mail e pode virar "bombardeio" de caixas de
terceiros (OWASP API #4/#6). O `LEIA_PRIMEIRO_IA.md` já registra que esse limite
é em memória e só vale com uma instância.

**Correção:** definir o `trust proxy` conforme a cadeia real do Render (número
de saltos correto, ou a função de confiança do Express), atualizar o
`proxy-addr`, e — antes de escalar para mais de uma instância — trocar o
armazenamento do limite por algo compartilhado (ex.: Redis) ou um
rate-limit na borda. Para o e-mail, um teto por IP independente do e-mail.

### 2.4 [MÉDIO] Token de acesso continua válido após logout, troca de senha e exclusão

[perfil.service.ts:36](../apps/api/src/modules/perfil/perfil.service.ts#L36)

Já listado como pendência conhecida; aqui vai medido. O refresh token é
revogado, mas o **access token** (15 min) segue aceito depois de:

- **logout** — testado: `/auth/me` responde 200 com o token antigo;
- **troca de senha pelo perfil** — testado: 200; e, pior, a troca pelo perfil
  **não revoga as sessões de outros aparelhos** (o refresh de outro aparelho
  continuou renovando). O fluxo de "esqueci a senha"
  ([auth.service.ts](../apps/api/src/modules/auth/auth.service.ts)) revoga tudo;
  a troca pelo perfil, não — é uma inconsistência.
- **exclusão da conta** — testado: 200 em `/registros` com o token antigo.

Numa situação de aparelho roubado ou compartilhado, isso deixa uma janela de 15
minutos.

**Correção:** no `perfil.service.update`, quando trocar a senha, revogar os
refresh tokens do usuário (como o redefinir-senha já faz). Para fechar os 15
min do access token, a opção barata é checar no `JwtAuthGuard` um carimbo de
"senha trocada em" / "conta desativada em" contra o `iat` do token, ou manter
uma lista curta de revogação.

### 2.5 [MÉDIO] `?dias=` / `?limite=` inválido ainda gera 500

[registros.controller.ts](../apps/api/src/modules/registros/registros.controller.ts) · [admin.controller.ts:34](../apps/api/src/modules/admin/admin.controller.ts#L34)

Já na lista de pendências. Confirmado: `/registros?dias=abc`,
`/registros?dias=99999999999` e `/admin/analise?dias=abc` respondem **500**
(o cast `(dias || ' days')::INTERVAL` estoura). Não vaza dado, mas é erro não
tratado, suja o log de ERROR e é um vetor de ruído/indisponibilidade barato
(A10:2025, Mishandling of Exceptional Conditions). O `/alertas` e o
`/emocional/resumo` já normalizam o número; falta fazer o mesmo nos demais, de
preferência validando na borda (DTO de query com `@IsInt`/`@Min`/`@Max`).

### 2.6 [MÉDIO] Enumeração de contas (três canais)

- **Cadastro** com e-mail existente → 409 "E-mail já cadastrado" (revela que a
  conta existe).
- **Tempo do login:** conta existente ~66 ms vs inexistente ~3 ms. O `bcrypt.
  compare` só roda quando o usuário é encontrado, criando um oráculo de tempo —
  mesmo com a mensagem genérica. **Correção:** rodar sempre um `bcrypt.compare`
  contra um hash fixo quando o e-mail não existe, para igualar o tempo.
- **Convite** ([convites.service.ts](../apps/api/src/modules/vinculos/convites.service.ts)):
  `POST /vinculos/convites` devolve 404 "Nenhum paciente com este e-mail" para
  e-mail não cadastrado e **201 com nome e e-mail** do paciente para um
  existente. Um nutricionista aprovado consegue descobrir quais e-mails são
  pacientes e colher os nomes. Num serviço de diabetes, confirmar que alguém é
  paciente já é informação sensível por associação. **Correção:** resposta
  genérica (ex.: "se houver um paciente com este e-mail, o convite foi
  enviado") e não devolver nome/e-mail de volta para quem convida.

Positivo: o "esqueci a senha" responde mensagem genérica e teve tempo
equivalente para e-mail existente vs inexistente — está correto.

### 2.7 [BAIXO] Política de senha fraca e inconsistente na troca

[perfil.controller.ts:29](../apps/api/src/modules/perfil/perfil.controller.ts) · [redefinir-senha.dto.ts](../apps/api/src/modules/auth/dto/redefinir-senha.dto.ts)

O cadastro exige 8 caracteres, mas a troca pelo perfil aceita **6** — testado:
`123456` foi aceito. Não há verificação de senha óbvia/vazada em lugar nenhum.
**Correção:** unificar em ≥ 8 e recusar as senhas mais comuns.

### 2.8 [BAIXO] Entrada armazenada sem validação de formato

- Nome `<img src=x onerror=...>` é gravado cru. Hoje o React escapa texto por
  padrão (não executa), mas é bom limitar caracteres de controle no nome.
- `imagemCapa` aceita `javascript:alert(1)` cru
  ([create-conteudo.dto.ts](../apps/api/src/modules/conteudos/dto/create-conteudo.dto.ts)).
  O painel usa como `<img src>`, que não executa `javascript:`, mas é URL não
  validada guardada. **Correção:** validar o esquema (só `http`/`https`) com
  `@IsUrl`.

### 2.9 O que foi testado e está correto [OK]

- **Escalada de perfil:** paciente → `/pacientes`, `/admin/*`, `POST /alimentos`,
  `POST /conteudos` → 403/400. Nutricionista → `/admin/*` → 403. Administrador →
  `/registros`, `/saude`, `/relatorios` de paciente → 403. Cadastro legado com
  `role: 'administrador'` no corpo → vira paciente. A escolha do papel pela rota
  (e não pelo corpo) está certa.
- **IDOR horizontal:** paciente pedindo dados de outro via `?pacienteId=` →
  ignorado (devolve os próprios) ou 403; `/mensagens/:outro` → 403;
  `/planos/:id` de outro → 403/404. (A exceção é o 2.1.)
- **IDOR sem vínculo:** registros, pacientes, saúde, anotações, relatórios, CSV,
  mensagens, emocional, medicamentos → todos barrados para nutricionista sem
  vínculo. (A exceção é o 2.1.)
- **JWT:** `alg=none` → 401; payload adulterado com assinatura velha → 401;
  token forjado com o segredo `troque-isto-em-producao` do `.env.example`/
  `docker-compose` → 401 (produção usa `JWT_SECRET` gerado pelo Render).
- **Injeção SQL:** `' OR '1'='1`, `UNION SELECT`, `; DROP TABLE` em `/alimentos`,
  `/pacientes`, `/admin/usuarios`, `/receitas` → sem 500, sem linhas a mais.
  Tudo parametrizado (`$1,$2`); as interpolações são só de identificadores
  internos.
- **Injeção em CSV:** o `escaparCsv`
  ([relatorios.service.ts:223](../apps/api/src/modules/relatorios/relatorios.service.ts#L223))
  prefixa `=`,`+`,`-`,`@` com aspa — fórmula maliciosa no Excel neutralizada.
- **Robustez:** corpo de 2 MB → 413; senha de 90 mil caracteres → 401 em 72 ms
  (bcrypt não trava); `__proto__` no corpo → 400/401 (sem prototype pollution);
  JSON quebrado → 400 sem stack trace. O `AllExceptionsFilter` não vaza stack,
  SQL nem nome de tabela.
- **Sessão (parcial):** refresh token reusado após rotação → 401; link de
  redefinir senha é de uso único (UPDATE atômico); troca pelo "esqueci a senha"
  revoga as sessões.

---

## 3. Painel web (React + Vite)

- **[OK] Sem sinks de XSS perigosos:** nenhum `dangerouslySetInnerHTML` com dado
  de usuário; o único `innerHTML` em [LoginPage.tsx](../apps/web/src/pages/auth/LoginPage.tsx)
  limpa o container do botão do Google (string vazia), não injeta dado.
- **[OK] Sem redirecionamento aberto:** não há `navigate(param)` nem
  `redirect=` lido da URL.
- **[INFO] Token em `localStorage`** ([AuthContext.tsx:36](../apps/web/src/contexts/AuthContext.tsx#L36)):
  access e refresh ficam em `localStorage`. É o padrão de SPA e é defensável
  (não há cookie de sessão a proteger com CSRF), mas significa que **qualquer
  XSS** no painel levaria os tokens. Como a defesa contra XSS é o React + o CSP
  do helmet, mantenha esses dois intactos. Alternativa mais robusta (futuro):
  refresh token em cookie `HttpOnly`.
- **[BAIXO] Logout do painel é só local** ([AuthContext.tsx:40](../apps/web/src/contexts/AuthContext.tsx#L40)):
  limpa o `localStorage` mas não chama `POST /auth/logout`, então o refresh
  token continua válido no servidor até expirar. O app mobile revoga; o painel
  não. **Correção:** chamar o logout da API antes de limpar.
- **[OK] Bundle publicado:** sem segredo embutido (só o Client ID do Google, que
  é público, e as URLs). O source map (`.js.map`) **não** está publicado (a rota
  devolve o `index.html`).
- **[OK] Sem chave secreta no `.env.example`** da web; o `VITE_` só carrega o que
  é público por natureza.

---

## 4. App mobile (Expo / React Native)

- **[OK] Token no armazenamento seguro:** [storage.ts](../apps/mobile/src/lib/storage.ts)
  usa `expo-secure-store` (Keychain/Keystore) no device; `AsyncStorage` só no
  Expo web. Correto.
- **[OK] Logger não vaza:** [logger.ts](../apps/mobile/src/lib/logger.ts) registra
  só rota, status, tipo de erro e `requestId`; em release silencia tudo que não
  seja WARN/ERROR. Nada de token, senha ou dado de saúde.
- **[OK] Consentimento no vínculo:** [ConvitesAcompanhamento.tsx](../apps/mobile/src/components/ConvitesAcompanhamento.tsx)
  mostra ao paciente o que o nutricionista passa a ver e pede dupla
  confirmação; o aceite é o que cria o vínculo. É o ponto forte de LGPD do app.
- **[MÉDIO] "Termos de Uso" e "Política de Privacidade" são links de texto sem
  destino** ([auth/LoginForm.tsx:290](../apps/mobile/src/components/auth/LoginForm.tsx#L290)):
  o cadastro coleta o aceite, mas não há documento por trás. No painel, a aba
  "Termos" tem só uma frase genérica. Para a LGPD (art. 9º) o aviso de
  privacidade precisa existir de verdade e dizer finalidade, retenção e com quem
  os dados são compartilhados (Render, Brevo, Google, Expo). Ver seção 6.
- **[INFO] `EXPO_PUBLIC_API_URL`** vai embutida no APK — é só a URL da API,
  pública por natureza. Sem segredo no cliente.
- **[INFO] Push:** a notificação de "nova mensagem" leva os primeiros 120
  caracteres do texto no corpo do push
  ([mensagens.service.ts:261](../apps/api/src/modules/mensagens/mensagens.service.ts#L261)).
  Push passa pelos servidores da Expo/Apple/Google e aparece na tela de bloqueio.
  A de alerta glicêmico é mais contida ("Um paciente registrou X mg/dL"), mas
  ainda é dado de saúde na tela de bloqueio. Avaliar notificações sem conteúdo
  ("Você tem uma nova mensagem") para dado sensível.
- **[INFO] Versões do Expo congeladas até a banca** (decisão do time): isso
  carrega as vulnerabilidades da seção 5 até lá. Aceitável como risco assumido e
  documentado, já que a maioria é da cadeia de ferramentas, não do app em
  execução.

---

## 5. Dependências (cadeia de suprimento — A03:2025)

`npm audit` de **produção** (28/10/2026):

| App | Baixa | Média | Alta | Crítica |
|---|---|---|---|---|
| API | 0 | 5 | 5 | **1** |
| Painel web | 0 | 2 | 1 | 0 |
| Mobile | 9 | 8 | 12 | **1** |

Destaques que importam para este sistema:

- **API — `proxy-addr` (CRÍTICA):** IP spoofing via IPv4 mapeado em IPv6. Bate
  direto no limite de tentativas por IP (item 2.3). Tem correção.
- **API — `nodemailer` (ALTA):** usado no envio de e-mail; a correção está
  disponível sem salto maior.
- **API — `body-parser`/`multer`/`lodash` (ALTA):** vêm por baixo do
  `@nestjs/platform-express`; a maioria só fecha com um salto de versão maior do
  Nest (teste antes, pode haver quebra).
- **Mobile — `shell-quote` (CRÍTICA)** e `node-forge`, `undici`, `postcss`,
  `image-size` (ALTAS): quase tudo é cadeia de build do Expo; `undici` (fetch) e
  `node-forge` (cripto) são os que mais pesam em runtime. Só fecham com salto
  de SDK do Expo — combina com a decisão de atualizar depois da banca.
- **Web — `follow-redirects` (ALTA)** e `react-router` (open redirect, MÉDIA).

**Recomendação:** rodar `npm audit fix` (sem `--force`) nos três agora para o
que fecha sem salto maior; agendar os saltos de major (Nest, Expo) para depois
da banca, com teste. Rodar o audit no CI ajudaria a não regredir.

---

## 6. Infraestrutura e rede

### O que está correto [OK]

- **TLS 1.3**, com TLS 1.0/1.1 **recusados** nas duas pontas; certificado válido
  (Google Trust Services, via Cloudflare).
- **HTTP → HTTPS** com 301; **HSTS** presente (no painel, com `preload`).
- **helmet** aplica CSP, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy`, e remove `X-Powered-By`.
- **CORS** restrito à origem do painel; origem estranha não recebe
  `Access-Control-Allow-Origin`.
- **`JWT_SECRET` gerado pelo Render** (`generateValue: true`), não o do exemplo.
- **Segredos fora do Git:** `.gitignore` cobre `.env`/`.env.*`; SMTP e Google
  secret entram por `sync: false` no painel do Render.
- **CI** reproduz o ambiente (Node 20, mesmo Postgres) e confere schema ×
  migrations.

### Pontos de atenção

- **[CRÍTICO (operacional)] Repositório público + credenciais no README + site
  no ar com essas credenciais** — ver item 2.2. É a soma que importa: os três
  juntos é que dão o acesso.
- **[MÉDIO] `sincronizar.ps1`** faz `git add . && commit && push` **a cada 10
  segundos**. Foi assim que `.env` e `node_modules` foram parar no histórico
  (já corrigido no estado atual, mas ainda no histórico). Enquanto esse script
  rodar, qualquer segredo que cair na árvore vai para o repositório público em
  10 s. **Recomendação:** não usar; se for manter, garantir que nada sensível
  entre na pasta. Reescrever o histórico para limpar o que já passou tem o custo
  já discutido no `REVISAO_CODIGO.md` (quebra os clones do time) — e, como o
  único dado era um Client ID público, não compensa.
- **[INFO] `DATABASE_SSL=no-verify`** no Render: a conexão com o banco é
  criptografada, mas o certificado não é verificado. É o aceitável para o
  certificado interno do Render e está documentado.
- **[INFO] Banco gratuito do Render expira ~26/11/2026** e o plano é de
  instância única (ver limite em memória do item 2.3).
- **[INFO] `/health` e `/health/services` são públicos** e mostram estado,
  uptime e contagem de conexões em tempo real. Sem segredo nem PII; aceitável.
- **[INFO] `docker-compose.yml`** tem `JWT_SECRET: troque-isto-em-producao` e
  `CORS_ORIGIN: '*'` — é só desenvolvimento local, mas convém deixar claro que
  esse arquivo nunca descreve produção.

---

## 7. LGPD e normas de saúde

Resumo aplicado; a base legal completa com números de resolução e links está no
levantamento que embasou este documento. O `LIMITACOES_LGPD.md` continua válido
e esta seção o atualiza.

**Papéis (art. 5º):** o controlador é a ADJ Birigui (ou quem operar o sistema);
Render (EUA), Brevo (França), Google (EUA) e Expo (EUA) são operadores. Hoje,
com dados fictícios, não há tratamento de dado pessoal real — é o que sustenta a
operação atual.

**O que o projeto já resolve [OK]:**

- **Consentimento para dado sensível (art. 11):** o vínculo só nasce do aceite
  do paciente, e o acesso clínico passa por ele. Some-se a aprovação do CRN pela
  administração (base do art. 11, II, "f" — tutela da saúde por profissional).
- **Revogação / oposição (art. 18):** o paciente encerra o acompanhamento e
  desativa a conta pelo app.
- **Portabilidade parcial (art. 18, V):** exportação em CSV do período.
- **Segurança (art. 46/49):** TLS, hash de senha (bcrypt), logs higienizados,
  autorização por vínculo — privacidade desde a concepção em boa parte.

**O que falta para sair da demonstração:**

- **[ALTO] Crianças e adolescentes (art. 14 + Lei 15.211/2025 "ECA Digital", em
  vigor desde 17/03/2026).** A ADJ é de diabetes **juvenil** → é provável haver
  menores. Hoje não há verificação de idade, consentimento de responsável
  (art. 14, §1º, para menores de 12), nem ferramenta de supervisão parental.
  O ECA Digital alcança serviço de "acesso provável" por crianças/adolescentes
  e **não abre exceção para saúde**; exige privacidade por padrão, supervisão
  parental e relatório de impacto. É o maior item de conformidade para uso real.
- **[ALTO] Transferência internacional (art. 33).** A ANPD reconheceu UE/EEE
  como adequados (Res. 32/2026) — cobre a Brevo (França). Render, Expo e Google
  (EUA) **não** têm decisão de adequação; precisariam das cláusulas-padrão da
  ANPD ou de consentimento específico. Os contratos padrão desses fornecedores
  trazem as cláusulas da UE, não as da ANPD.
- **[MÉDIO] Aviso de privacidade real (art. 9º).** O aceite existe, mas sem
  documento por trás (ver item 4). Precisa dizer finalidade, retenção e os
  operadores (Render, Brevo, Google, Expo).
- **[MÉDIO] Encarregado (art. 41, Res. ANPD 18/2024):** indicar por ato escrito
  e publicar nome/contato em local visível. Como o tratamento envolve dado
  sensível de menores, é provável que o projeto **não** se enquadre nos
  benefícios de "agente de pequeno porte" (Res. ANPD 2/2022, que exclui alto
  risco).
- **[MÉDIO] Resposta a incidente (Res. ANPD 15/2024):** não há plano. Com dado
  sensível/de menor, quase todo vazamento seria comunicável à ANPD e aos
  titulares em **3 dias úteis**. Vale um procedimento escrito, ainda que
  simples.
- **[MÉDIO] Registro de operações e RIPD (arts. 37 e 38; ECA Digital art. 16):**
  não existem. Um registro simples das operações e um relatório de impacto
  (exigível de quem atende crianças) são esperados antes do uso real.
- **[BAIXO] Retenção / exclusão suave.** A "exclusão suave" que mantém o
  histórico **tem base** para o prontuário: CFN Res. 594/2017 e Lei 13.787/2018
  pedem guarda de ~20 anos, e a LGPD (art. 16, I) admite a conservação por
  obrigação legal. Dois cuidados: (a) o que é retido deve ficar **bloqueado**
  para outros usos; (b) dado que **não** é prontuário (ex.: paciente que nunca
  teve vínculo com nutricionista) não tem essa base e deveria ser eliminado ou
  anonimizado. Atenção também à remoção **definitiva** pelo administrador
  (`DELETE` em cascata): num paciente real, apagar o histórico clínico pode
  conflitar com o dever de guarda de 20 anos.
- **[INFO] Telenutrição (CFN Res. 760/2023):** exige cadastro no e-Nutricionista
  e TCLE antes do primeiro atendimento. Fica como requisito de processo, não de
  código.
- **[INFO] Auditoria de acesso:** não há log de quem leu o quê. Boa prática para
  demonstrar conformidade; fica como trabalho futuro.

---

## 8. Priorização sugerida

**Resolver antes da banca (barato e visível):**

1. Trocar as senhas do admin e dos usuários de exemplo na cópia publicada
   (item 2.2).
2. Corrigir o `/planos/ativo` (item 2.1) — poucas linhas, fecha o único
   vazamento clínico encontrado.
3. `npm audit fix` sem `--force` nos três apps (seção 5).
4. Corrigir o 500 do `?dias=` inválido (item 2.5) e o logout do painel chamar a
   API (seção 3).

> **Feito em 28/10/2026 (branch `fix/seguranca-antes-da-banca`):** itens 2, 3 e 4.
> O `/planos/ativo` confere o vínculo e recusa o administrador; o `/planos/:id`
> também passou a recusar o administrador, que lia qualquer plano pelo número.
> `?dias=` e `?limite=` inválidos usam o padrão do serviço em todas as rotas. O
> "Sair" do painel revoga o refresh token. `npm audit fix` sem `--force`: API de
> 51 para 34 alertas (3 críticos para 0), painel de 6 para 4; o app ficou de
> fora porque quase tudo é da cadeia de build do Expo e mexer arriscaria o APK.
> O que sobra exige subir versão maior (Nest 12, Vite 8, React Router 7). Falta o
> item 1, que é feito no painel publicado.

**Trabalho futuro (seção de limitações da monografia):**

5. Revogar o access token / sessões na troca de senha e na exclusão (item 2.4).
6. Enumeração de contas: tempo do login e resposta do convite (item 2.6).
7. Limite de tentativas confiável atrás de proxy e compartilhado entre
   instâncias (item 2.3).
8. Conformidade LGPD para uso real: menores (ECA Digital), aviso de privacidade,
   encarregado, plano de incidente, transferência internacional, RIPD (seção 7).
9. Saltos de versão (Nest, Expo) com teste, depois da banca.

Nenhum desses é bloqueio para apresentar o TCC como **demonstração com dados
fictícios**. Os itens 1 a 4 são os que valem fechar agora; o resto é um bom
roteiro de "trabalhos futuros".
