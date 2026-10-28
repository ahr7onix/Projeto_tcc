# Análise de desempenho e concorrência — NutriCare

Análise feita em 28/10/2026 sobre o estado atual da `main`, cobrindo a API, o
banco, o painel web, o app mobile e a hospedagem no Render. A pergunta que ela
responde: **o sistema aguenta várias pessoas usando ao mesmo tempo?** Complementa
a seção "Performance" do `docs/REVISAO_CODIGO.md`, que é anterior ao canal de
mensagens em tempo real e às telas atuais do painel.

Legenda de gravidade: **[CRÍTICO]** · **[ALTO]** · **[MÉDIO]** · **[BAIXO]** ·
**[INFO]** (observação, sem ação obrigatória) · **[OK]** (testado e adequado).

## Como foi testado

- **Leitura do código:** pool de conexões, autenticação, todas as consultas dos
  módulos clínicos, o canal SSE, o polling do painel e o uso de rede do app.
  Os planos de execução das consultas pesadas foram conferidos com
  `EXPLAIN ANALYZE`.
- **Banco descartável com volume de uso real** (`tcc_perf`, Postgres 16),
  populado por [scripts/carga/popular-carga.sql](../scripts/carga/popular-carga.sql):
  20 nutricionistas com 50 pacientes cada (1.000 pacientes) e 90 dias de uso,
  com 5 glicemias, 4 refeições e 1 registro de humor por dia. São 450 mil
  glicemias, 360 mil refeições, 90 mil registros de humor e 20 mil mensagens, em
  142 MB. Criado e descartado só para o teste; nenhum dado real foi tocado.
- **Dois ambientes:**
  - **PC, sem limite** — a API (`node dist/main.js`, `NODE_ENV=production`) num
    Windows com 12 núcleos e o banco no Docker. Mostra o teto do código.
  - **"Render gratuito" simulado** — a API num contêiner Docker com **0,1 CPU e
    512 MB** e o banco em outro contêiner com **0,1 CPU e 256 MB**, os limites do
    plano gratuito do Render para o serviço web e o Postgres
    ([instâncias do Render](https://render.com/docs/compute-plans),
    [plano gratuito](https://render.com/docs/free)). É o ambiente que importa
    para a banca.
- **Ferramenta:** [scripts/carga/teste-carga.mjs](../scripts/carga/teste-carga.mjs),
  sem dependências. Mede cada rota sozinha com 1, 5, 10 e 50 chamadas simultâneas
  e simula pessoas usando o painel e o app ao mesmo tempo, com o **mesmo polling
  que o código dos clientes faz**. Também testa logins simultâneos e o canal de
  mensagens. A seção 6 explica como repetir.
- **Cópia publicada:** só 13 leituras do `/status` de
  `nutricare-tcc-api.onrender.com`, uma de cada vez, sem login e sem carga.

Limites do método: o gerador de carga roda na mesma máquina da API; o Docker no
Windows não é o hardware do Render; no PC a mesma rodada variou até 2x entre uma
execução e outra. Leia os números como **ordem de grandeza**, não como medida
exata.

---

## 1. Resumo executivo

**Resposta curta:** para a banca e para uma demonstração, aguenta — **desde que
se corrija antes o travamento do login (item 2.1)**. Hoje, uns 15 logins no
mesmo instante (uma turma apertando "Entrar" junto, ou os aplicativos renovando
a sessão quando o servidor acorda) **congelam a API até alguém reiniciá-la**, e
o Render não percebe sozinho. *(Corrigido logo depois desta análise, na branch
`fix/travamento-login`: ver o fim do item 2.1.)*

Fora isso, o gargalo não são os pacientes, é o **painel da nutricionista**:

- **O app do paciente é leve.** Parado, faz menos de 1 requisição por minuto e
  fecha o canal de mensagens em segundo plano. Em uso ativo, ~6 por minuto. O
  servidor gratuito aguenta uns **100 pacientes usando o app no mesmo instante**,
  o que corresponde a uns 2.500 pacientes cadastrados (seção 4).
- **O painel pesa muito.** Cada nutricionista com o painel aberto busca 3 rotas
  a cada 5 s, em qualquer tela, inclusive com a aba escondida. Na tela Início
  busca mais 4 a cada 30 s, e uma delas devolve **todas as glicemias de 90 dias
  de todos os pacientes: 10,8 MB de JSON e 6 s de processamento** no servidor
  gratuito (com 50 pacientes ativos).
- **No Render gratuito, com o código de hoje, cabe 1 nutricionista com a Início
  aberta e uns 50 pacientes usando o app.** Mesmo assim, a cada 30 s o servidor
  fica uns 5 s ocupado só com a Início, e as telas dos pacientes que caem nessa
  janela esperam. Com 2 nutricionistas na Início e 50 pacientes, uma tela do app
  leva **17 s** para abrir; com 4 nutricionistas, tudo passa de 20 s.
- **Com três mudanças pequenas no painel e no login (seção 5), medido no mesmo
  servidor: 10 nutricionistas e 100 pacientes usando ao mesmo tempo**, com a tela
  do app em ~30 ms no caso típico e ~1,3 s nas 5% mais lentas.

O banco **não** é o problema: os índices cobrem as consultas por paciente, e a
consulta mais pesada do painel leva 4 ms no Postgres. O tempo vai no Node,
montando e serializando JSON grande demais e com frequência demais.

---

## 2. Achados

### 2.1 [CRÍTICO] Login e renovação de sessão travam a API com ~15 pedidos simultâneos

[auth.service.ts:498](../apps/api/src/modules/auth/auth.service.ts#L498),
[auth.service.ts:283](../apps/api/src/modules/auth/auth.service.ts#L283)

O pool tem 10 conexões ([database.module.ts:54](../apps/api/src/database/database.module.ts#L54)).
O `issueSession` (chamado pelo login, pelo cadastro e pelo login com Google)
pega uma conexão com `pool.connect()` e, **antes de soltá-la**, chama
`toPublicUser`, que faz `perfilEstaCompleto(this.pool, ...)`
([auth.service.ts:585](../apps/api/src/modules/auth/auth.service.ts#L585)) e
precisa de **uma segunda conexão**:

```ts
private async issueSession(user: UserRow): Promise<AuthResponse> {
  const client = await this.pool.connect();      // 1ª conexão, presa
  try {
    const session = await this.createRefreshToken(client, ...);
    ...
    return { user: await this.toPublicUser(user), ... };  // pede a 2ª
  } finally {
    client.release();                             // só solta depois da 2ª
  }
}
```

Quando 10 logins chegam a esse ponto juntos, cada um segura uma conexão e espera
outra que nunca vai vagar. O `refresh` faz o mesmo dentro da transação, e o
cadastro e o login com Google prendem até três. Como o pool não tem
`connectionTimeoutMillis`, **a espera é eterna**: a partir daí **nenhuma rota que
usa o banco responde mais**, nem para quem não estava fazendo login.

Reproduzido nos dois ambientes:

| Teste | PC | "Render" (0,1 CPU) |
|---|---|---|
| 10 logins simultâneos | ok (0,8 s) | ok (9,2 s) |
| 15 logins simultâneos | **nenhum responde; API parada** | **nenhum responde; API parada** |
| 15 renovações de sessão simultâneas | — | **nenhuma responde; API parada** |
| `/status` depois do travamento | `200` com `"banco":"indisponivel"` | `200` com `"banco":"indisponivel"` |

No banco, as 10 conexões ficam paradas em "idle" com a última consulta sendo o
`INSERT INTO refresh_token`.

**Quando isso acontece na vida real:** uma turma ou a banca entrando junto na
demonstração; ou o Render acordando o serviço depois de 15 min parado, quando
os apps e painéis abertos voltam todos ao mesmo tempo com o token de 15 min
vencido e renovam a sessão juntos.

**Por que ninguém percebe:** o `/status` (o `healthCheckPath` do Render) devolve
`200` mesmo com o banco inacessível
([status.controller.ts:22](../apps/api/src/modules/status/status.controller.ts#L22)),
então o Render considera o serviço saudável e não reinicia.

**Correção:** o `issueSession` grava o refresh token direto pelo pool, sem
`pool.connect()`; o `refresh` só monta o usuário público depois de `COMMIT` +
`release()`; o cadastro e o Google chamam o `issueSession` fora do bloco que
segura a conexão. Junto, `connectionTimeoutMillis` no pool, para um pool
esgotado falhar em segundos em vez de pendurar para sempre. Testei numa cópia da
API as duas primeiras partes e o tempo limite, que cobrem o login e a renovação,
os dois que acontecem em massa. No "Render": **15 e 30 logins e 20 renovações
simultâneas passaram e a API seguiu respondendo**. Com 30 logins, 4 voltaram 500 porque esperaram mais de 10 s por
conexão (o bcrypt de 30 logins em 0,1 CPU leva ~30 s); o certo é traduzir esse
erro em `503` e usar um tempo limite de 15 a 30 s. Vale também o `/status`
devolver `503` quando o banco não responde, para o Render reiniciar o serviço.

**Situação: corrigido** na branch `fix/travamento-login`, nos quatro pontos e com
`connectionTimeoutMillis` de 15 s. O `/status` passou a devolver `503` sem banco
(item 2.5). Conferido no "Render" com o código final: 15 e 30 logins simultâneos
e 30 renovações simultâneas, todos com `200`, e o banco seguiu respondendo.
Derrubando o banco, o `/status` respondeu `503` em 3 s e voltou a `200` sozinho
quando o banco voltou. O `auth.service.spec.ts` repete o cenário com um pool de
uma conexão só, e falha no código antigo. O erro de tempo limite do pool ainda
sai como `500`: traduzir para `503` mexeria no `AllExceptionsFilter`, que está
na lista de "não mexa".

### 2.2 [ALTO] O painel consulta a API a cada 5 s, em qualquer tela e com a aba escondida

[NotificationCenter.tsx:29](../apps/web/src/components/NotificationCenter.tsx#L29),
[NotificationCenter.tsx:51](../apps/web/src/components/NotificationCenter.tsx#L51)

A central de notificações fica montada em todo o painel da nutricionista e busca
`/notificacoes?limite=100`, `/alertas?dias=7` e `/pacientes` a cada 5 s, com
`setInterval`. Não olha se a aba está visível; o Chrome só começa a espaçar
depois de uns 5 min escondida. Com 50 pacientes ativos:

| Rota (a cada 5 s) | Resposta | Custo no "Render" |
|---|---|---|
| `/alertas?dias=7` | 337 KB | ~270 ms |
| `/pacientes` | 7,6 KB | ~90 ms |
| `/notificacoes?limite=100` | 10 KB | ~40 ms |

Isso dá **36 requisições por minuto por nutricionista parada** e cerca de **8% da
CPU do servidor gratuito por painel aberto**, só nessa central. O `/alertas`
devolve todas as glicemias fora da faixa da semana de todos os pacientes e é
recalculado inteiro a cada 5 s. A consulta em si leva 4 ms no banco; o resto é
o Node classificando e serializando ~4 mil linhas
([alertas.service.ts](../apps/api/src/modules/alertas/alertas.service.ts)).

O canal SSE de mensagens já existe e já fica aberto no painel; ele é o caminho
natural para avisar "chegou alerta novo" em vez de perguntar a cada 5 s.

### 2.3 [ALTO] A tela Início baixa 10,8 MB a cada 30 s

[HomePage.tsx:70](../apps/web/src/pages/app/HomePage.tsx#L70),
[HomePage.tsx:87](../apps/web/src/pages/app/HomePage.tsx#L87)

A Início pede `/registros?dias=90&tipo=glicemia` sem `pacienteId`, o que traz
**todas as glicemias de 90 dias de todos os pacientes** da nutricionista
([registros.service.ts:219](../apps/api/src/modules/registros/registros.service.ts#L219)),
para desenhar indicadores e distribuições que só precisam de contagens e médias.
Com 50 pacientes: **22,5 mil registros, 10,8 MB de JSON, 6,1 s de processamento
no "Render"** (0,3 s no PC). Repetido a cada 30 s, isso consome sozinho **~20%
da CPU do servidor gratuito por nutricionista que deixa a Início aberta**.

Também esbarra na **banda**: o plano gratuito (Hobby) do Render inclui **5 GB de
saída por mês** e, sem cartão cadastrado, **desliga os serviços até o mês
seguinte** quando passa disso
([documentação do Render](https://render.com/docs/outbound-bandwidth)). Uma
nutricionista com a Início aberta transfere ~1,5 GB por hora nesse cenário
(Início mais a central do item 2.2): os 5 GB acabam em umas 3 horas. Fora da
Início, só a central já soma ~240 MB por hora por painel aberto. A API não
comprime as respostas (não usa `compression`). Não conferi se o Cloudflare do
Render comprime antes de contar a banda; se comprimir, o volume cai uns 10x,
mas o custo de CPU continua.

Com os dados de demonstração de hoje (poucos pacientes e registros), as
respostas são pequenas. O problema aparece com o volume de uso real.

### 2.4 [MÉDIO] Polling sem freio: quando a API fica lenta, as requisições se acumulam

O `setInterval` da central (5 s) e o da Início (30 s) disparam a rodada seguinte
mesmo que a anterior não tenha voltado. O axios do painel não tem `timeout`
([api.ts:25](../apps/web/src/lib/api.ts#L25)), e em erro o polling não recua.
Quando o servidor passa de 5 s para responder, cada aba aberta acrescenta 3
requisições a cada 5 s, que disputam as mesmas 10 conexões e deixam tudo ainda
mais lento.

E desistir no cliente não alivia o servidor: a requisição abandonada continua
sendo processada até o fim. No teste por rota, oito chamadas da Início que o
cliente abandonou aos 30 s seguiram ocupando a CPU, e a medição seguinte, de uma
rota que leva ~0,2 s, deu 25 s.

### 2.5 [MÉDIO] Pool sem tempo limite e `/status` sempre `200`

Além de transformar o item 2.1 em travamento permanente, a falta de
`connectionTimeoutMillis` faz qualquer esgotamento do pool virar espera sem fim
em vez de erro. E o `/status` responde `200` com `"banco":"indisponivel"`. Para
o Render, que só olha o código HTTP, o serviço está sempre saudável.

### 2.6 [MÉDIO] Login caro no servidor gratuito

O hash das senhas é `bcryptjs` com custo 10, em JavaScript puro. No "Render", um
login leva **0,6 a 1,3 s** sozinho, e 10 logins simultâneos levam **9 s** (a CPU
é uma só e os hashes entram em fila). Nesse tempo as outras rotas também
esperam. O custo 10 é o recomendado e não deve baixar (RNF01); o que ajuda é
não somar logins desnecessários. Por exemplo, a corrida de renovação entre abas
do painel (item 2.10) desloga as duas abas e força login de novo.

### 2.7 [MÉDIO] Hibernação e distância do servidor gratuito

- **Hibernação:** o serviço gratuito dorme depois de 15 min sem acesso. Na cópia
  publicada, a primeira chamada levou **33,6 s** para responder. No contêiner com
  0,1 CPU, só a subida da API levou de 15 a 65 s. Na banca, abra o painel e o app
  uns 2 min antes de apresentar.
- **Distância:** o Render roda em Oregon (EUA). Do Brasil, cada `/status` levou
  **0,32 a 0,8 s**. Toda tela paga isso pelo menos uma vez; telas que buscam em
  duas ondas, como a ficha do paciente
  ([PacienteDetalhePage.tsx:77](../apps/web/src/pages/app/PacienteDetalhePage.tsx#L77)),
  pagam duas vezes. Em uso real, a região da Virgínia fica mais perto do Brasil.
- **Banco gratuito:** expira em 30 dias (já anotado no `docs/PUBLICAR.md`) e tem
  1 GB. Pelo volume do teste, cada paciente ativo ocupa uns **0,5 MB por ano**:
  1 GB dá para uns 1.000 pacientes registrando todo dia por quase 2 anos.

### 2.8 [BAIXO] Listas e períodos sem teto

- `GET /registros?dias=` aceita qualquer número; sem `pacienteId`, o
  nutricionista recebe tudo de todos os pacientes. Um teto (como os 90 dias do
  `/alertas` e os 365 do `/relatorios`) também resolve a pendência do 500 com
  `?dias=` inválido.
- `/pacientes` e a lista de conversas (`/mensagens`) não paginam. Com 50
  pacientes está bom (7,6 KB); passa a importar acima de algumas centenas.
- O relatório individual do painel pede `dias=3650&completo=true`
  ([RelatorioPacientePage.tsx](../apps/web/src/pages/app/RelatorioPacientePage.tsx)),
  ou seja, o histórico inteiro do paciente. Hoje custa ~0,2 s no "Render" e
  cresce com os anos de uso.

### 2.9 [BAIXO] App mobile

- **Busca sem espera entre teclas** em
  [alimentos/index.tsx:34](../apps/mobile/src/app/(tabs)/alimentacao/alimentos/index.tsx#L34)
  e em `receitas/index.tsx`: uma requisição por letra ("arroz integral" = 14). O
  painel já espera 300 ms.
- **Histórico buscado duas vezes ao abrir**
  ([registros/index.tsx:127](../apps/mobile/src/app/(tabs)/registros/index.tsx#L127)):
  o `useQuery` busca e o `useFocusEffect` chama `refetch()` logo em seguida.
- **Listas em `ScrollView` + `.map`**, sem `FlatList`. Os registros de 30 dias
  (~150 a 300 linhas) são renderizados de uma vez. Ainda é aceitável nesse
  tamanho.
- **[OK]** Timeout de 15 s, uma única nova tentativa, cache do React Query de
  60 s, SSE fechado em segundo plano e nada pesado na abertura do app.

### 2.10 [BAIXO] Renovação de sessão entre abas do painel

Cada aba renova o token por conta própria e o refresh token é trocado a cada uso.
Se duas abas recebem 401 quase juntas, a segunda usa um token já revogado e as
duas abas saem (o `localStorage` é compartilhado). É raro, mas cada ocorrência
vira um login a mais, que é caro no servidor gratuito (item 2.6).

### 2.11 [INFO] Estado em memória prende a API a uma instância

O canal de mensagens (`MensagensEventosService`, um `Subject` em memória) e os
limites de tentativa de login ficam na memória do processo. Com mais de uma
instância, cada uma só enxerga os próprios clientes. Já anotado no
`LEIA_PRIMEIRO_IA.md`: antes de escalar para várias instâncias, trocar por
armazenamento compartilhado (LISTEN/NOTIFY do Postgres ou Redis). Uma instância
paga maior resolve muito antes disso.

### 2.12 O que está bom [OK]

- **Índices certos:** toda tabela clínica tem índice `(id_paciente, data_hora
  DESC)`, e o `EXPLAIN` mostra uso de índice nas consultas pesadas. A do
  `/alertas` executa em **4 ms** com 50 pacientes.
- **Sem N+1 (uma consulta por item) na API:** a lista de pacientes usa
  subconsultas (o comentário em `pacientes.service.ts` explica por que não usar
  `JOIN` + `GROUP BY`), e os planos carregam as refeições numa consulta só.
- **SSE leve:** o canal de mensagens não ocupa conexão do banco (o guard só
  confere o JWT) e manda um batimento a cada 25 s. Com 1.000 conexões abertas
  a API usou ~76 MB e a mensagem chegou em 20 ms (seção 3.3).
- **Rotas do paciente estáveis com o histórico crescendo:** como filtram por
  paciente e por período com índice, ficam iguais com 90 dias ou com anos.
- **App mobile econômico:** menos de 1 requisição por minuto parado, cache, e
  nenhuma rajada de novas tentativas.
- **Painel:** 137 KB de JavaScript comprimido (um arquivo só, sem divisão por
  rota). É estático, não pesa na API e carrega rápido.
- **[INFO] Log:** a linha por requisição (terminal e arquivo, com `writeSync`)
  custa algo. No "Render", com `LOG_LEVEL=WARN`, as rotas leves fizeram de 7% a
  20% mais requisições por segundo (`/lembretes/hoje`: 23 para 28 req/s). Nas
  rotas pesadas a diferença some. Não é prioridade, e o log é útil.

---

## 3. Resultados dos testes

### 3.1 Cada rota sozinha

Requisições por segundo no ponto de saturação (o maior valor observado com 1 a
50 chamadas simultâneas no PC e com 1 a 10 no "Render") e o tempo de uma chamada
sozinha (mediana com 1 chamada por vez). "Custo" é quanto tempo do servidor de
0,1 CPU cada chamada ocupa: o inverso do máximo por segundo. O relatório não
tem tempo sozinho no "Render" porque essa medição pegou o servidor ainda
ocupado com requisições abandonadas da rota anterior (item 2.4).

| Rota | PC: req/s | PC: 1 chamada | "Render": req/s | "Render": 1 chamada | Custo no "Render" |
|---|---|---|---|---|---|
| `GET /status` | 1.076 | 3 ms | 47 | 7 ms | ~21 ms |
| Paciente: `GET /registros` (30 dias) | 63 | 13 ms | 7,9 | 100 ms | ~127 ms |
| Paciente: `GET /registros/glicemia/ultimo` | 156 | 8 ms | 25 | 51 ms | ~40 ms |
| Paciente: `POST /registros/glicemia` | 145 | 11 ms | 21 | 88 ms | ~48 ms |
| Paciente: `GET /planos/ativo` | 137 | 13 ms | 18 | 88 ms | ~55 ms |
| Paciente: `GET /lembretes/hoje` | 296 | 9 ms | 25 | 9 ms | ~40 ms |
| Nutri: `GET /pacientes` (50) | 180 | 15 ms | 11 | 95 ms | ~90 ms |
| Nutri: `GET /alertas?dias=7` | 62 | 78 ms | 3,7 | 299 ms | **~270 ms** |
| Nutri: `GET /alertas/resumo` | 49 | 47 ms | 5,2 | 201 ms | ~190 ms |
| Nutri: `GET /notificacoes?limite=100` | 332 | 5 ms | 25 | 9 ms | ~40 ms |
| Nutri: `GET /registros?dias=90&tipo=glicemia` (Início) | 5,5 | 314 ms | 0,2 | **6.092 ms** | **~6 s** |
| Nutri: `GET /relatorios` (completo) | 93 | 20 ms | 4,6 | — | ~220 ms |
| Nutri: `GET /mensagens` (conversas) | 350 | 5 ms | 24 | 12 ms | ~42 ms |
| Nutri: `GET /mensagens/nao-lidas` | 398 | 5 ms | 29 | 10 ms | ~35 ms |
| Login (`bcryptjs`, custo 10) | 11 | 92 ms | ~1,1 | 600–1.300 ms | ~0,9 s |

No PC, durante os testes, o processo da API ficou perto de 100% de um núcleo: o
limite é o Node (montar e serializar a resposta), não o banco.

### 3.2 Pessoas usando ao mesmo tempo ("Render" com 0,1 CPU)

Cada rodada durou 90 s. Os pacientes abrem uma tela do app, leem por 10 a 30 s e
abrem outra; as nutricionistas deixam o painel aberto com o polling do código.
Todos ficam com o canal de mensagens aberto. "Em regime" é depois dos primeiros
20 s; "entrada" é a rajada do começo, com todo mundo abrindo o app nos mesmos
10 s (como uma turma começando junto). "Típica" é a mediana; "lentas" são as 5%
mais demoradas (p95).

**Código de hoje** (central a cada 5 s, nutricionista na Início):

| Pessoas ao mesmo tempo | Tela do app em regime (típica / lentas) | Painel (central / Início) | Tela do app na entrada (lentas) |
|---|---|---|---|
| 50 pacientes | 15 ms / 0,6 s | — | 3,2 s |
| 100 pacientes | 50 ms / 1,7 s | — | 9,7 s |
| 200 pacientes¹ | 12 s / 29 s, com timeouts | — | — |
| 1 nutricionista | — | 0,2 s / 5,4 s | — |
| 1 nutricionista + 50 pacientes | 14 ms / **4,8 s** | 0,2 s / 5,2 s | 7,5 s |
| 2 nutricionistas + 50 pacientes¹ | **17 s / 19 s** | 11 s / 19 s | — |
| 4 nutricionistas¹ | — | 20 s / 30 s, com timeouts | — |

¹ Primeira rodada, de 60 s e sem separar a entrada do regime. O servidor já
estava saturado, então a separação não mudaria a conclusão.

**Com as correções** (pool corrigido, central a cada 30 s, Início sem o
`/registros` de 90 dias). Na simulação as nutricionistas ficam numa tela sem
polling próprio. A Início corrigida, com um resumo calculado no servidor, deve
custar como o `/alertas/resumo`: ~1% da CPU por nutricionista.

| Pessoas ao mesmo tempo | Tela do app em regime (típica / lentas) | Central (típica / lentas) | Tela do app na entrada (lentas) |
|---|---|---|---|
| 2 nutricionistas + 50 pacientes | 11 ms / 0,25 s | 0,24 s / 0,36 s | 3,1 s |
| 5 nutricionistas + 100 pacientes | 26 ms / 1,0 s | 0,7 s / 1,9 s | 10 s |
| 10 nutricionistas + 100 pacientes | 28 ms / 1,3 s | 0,5 s / 2,9 s | 9,8 s |

O que sobra de lento depois das correções é a entrada: 100 pessoas abrindo o app
nos mesmos 10 s ainda fazem as telas mais lentas passarem de 9 s. Isso é o limite
do 0,1 CPU, não do código.

### 3.3 Canal de mensagens (SSE)

Conexões abertas ao mesmo tempo, cada uma de um paciente, e 20 mensagens
enviadas pelo nutricionista para pacientes conectados. Rodado num contêiner com
1 CPU e 512 MB, porque fazer 1.000 logins em 0,1 CPU levaria uns 15 minutos; a
memória não depende da CPU.

| Conexões abertas | Memória da API | Mensagens entregues | Tempo até chegar (mediana / pior) |
|---|---|---|---|
| 0 (parada) | 37 MB | — | — |
| 200 | ~49 MB | 20 de 20 | 11 ms / 22 ms |
| 1.000 | ~76 MB | 20 de 20 | 20 ms / 45 ms |

São uns 30 KB por conexão: os 512 MB comportam milhares. O canal em tempo real
não é o limite do sistema.

---

## 4. Projeções

Cada pessoa gera uma carga previsível, porque o polling do painel e o uso do app
seguem o código (levantamento em `apps/web` e `apps/mobile`):

| Quem | Requisições | Carga no "Render" (0,1 CPU) |
|---|---|---|
| Paciente com o app parado | ~0,5 por minuto | desprezível |
| Paciente usando o app (uma tela a cada 10–30 s) | ~6 por minuto | ~0,7% |
| Nutricionista com o painel aberto em outra tela | 36 por minuto | ~8% |
| Nutricionista com o painel na Início | 44 por minuto | **~29%** |
| Nutricionista, com as correções da seção 5 | 6 a 14 por minuto | ~2% |

A conta: custo de cada rota (seção 3.1) vezes a frequência com que o código a
chama. Acima de ~70% da CPU, a fila cresce e as telas passam de 1 s. Acima de
100%, o painel começa a acumular requisições (item 2.4) e não se recupera
sozinho. A média esconde um efeito: a Início ocupa o servidor uns 5 s seguidos,
então mesmo com folga na média ela atrasa quem chega nessa janela (a linha
"1 nutricionista + 50 pacientes" da seção 3.2).

**De "ao mesmo tempo" para "cadastrados":** o paciente usa o app alguns minutos
por dia, e a nutricionista fica com o painel aberto o expediente inteiro.
Supondo 10 min de uso por paciente por dia, espalhados em 12 horas e com pico de
3x a média, os pacientes usando no mesmo instante são uns 4% dos cadastrados:

| Pacientes cadastrados | Usando no mesmo instante (pico) |
|---|---|
| 100 | ~4 |
| 1.000 | ~40 |
| 2.500 | ~100 |

**Capacidade projetada** (CPU abaixo de ~70%; a primeira coluna é o que foi
medido):

| Servidor | Código de hoje | Com as correções da seção 5 |
|---|---|---|
| Render gratuito (0,1 CPU) | 1 nutricionista na Início + ~50 pacientes ativos (~1.200 cadastrados); fora da Início, uns 5 a 8 nutricionistas sem sobrar espaço para pacientes | ~10 nutricionistas + ~100 pacientes ativos (~2.500 cadastrados, medido), ou ~20 nutricionistas + ~50 pacientes ativos |
| Render pago de 0,5 CPU (Starter) | ~5 nutricionistas na Início | ~5x o gratuito |
| Render pago de 1 CPU (Standard) | ~10 nutricionistas na Início | ~10x o gratuito |

As linhas pagas são projeção, não medida: a capacidade cresce mais ou menos na
proporção da CPU até 1 núcleo, porque um processo Node usa um núcleo só. Acima
disso é preciso mais de um processo, e aí entra o item 2.11. A banda é do plano
da conta, não da instância (Hobby 5 GB, Pro 25 GB por mês): com a Início de
hoje mandando 10,8 MB a cada 30 s por nutricionista, uma instância maior não
resolve a banda.

**Para a banca:** com dados de demonstração e meia dúzia de pessoas, o código de
hoje dá conta, **desde que ninguém dispare o travamento do item 2.1** (banca e
colegas entrando juntos é exatamente o caso). Com o volume de uma clínica de
verdade, as correções da seção 5 são o que separa "funciona" de "trava".

---

## 5. Recomendações, por prioridade

**Antes da banca (pequenas, e resolvem o risco de cair na apresentação):**

1. **Corrigir o travamento do pool (2.1).** São quatro pontos do
   `auth.service.ts` (`issueSession`, `refresh`, cadastro e login com Google) e
   uma linha no pool. O modo `travamento` do script confere a correção. De
   quebra, `/status` devolvendo `503` sem banco (2.5). **Feito** em
   `fix/travamento-login`.
2. **Central de notificações: de 5 s para 30–60 s**, parando quando a aba está
   escondida (`document.visibilityState`) e sem disparar uma rodada nova com a
   anterior em andamento (2.2 e 2.4). Só espaçar não resolve a banda: o
   `/alertas` de 337 KB a cada 30 s ainda soma ~7 GB por mês por nutricionista
   em tempo integral. O ideal é recarregar só quando chegar um evento pelo SSE,
   que já está aberto.
3. **Início sem o `/registros?dias=90`:** trocar por um resumo calculado no
   servidor (contagens e médias por paciente e por dia), ou ao menos baixar para
   7 dias e recarregar só pelo SSE (2.3). É o item que mais derruba o servidor
   gratuito e o que mais gasta banda.

**Depois (trabalho futuro / limitações da monografia):**

4. Teto em `?dias=` no `/registros` (resolve também a pendência do 500) e
   paginação de `/pacientes` e de `/mensagens` quando passar de ~100 itens (2.8).
5. App: espera de ~300 ms na busca de alimentos e receitas, tirar o `refetch`
   duplicado do histórico, `FlatList` no histórico (2.9).
6. Painel: renovação de sessão coordenada entre abas (`BroadcastChannel`) (2.10)
   e `timeout` no axios.
7. Compressão das respostas da API (`compression`), que reduz banda sem mexer em
   regra nenhuma.
8. Para uso real: instância paga (sem hibernação), banco pago (sem prazo de 30
   dias), região mais perto do Brasil. Só depois disso pensar em várias
   instâncias, e aí trocar o estado em memória (2.11).

O `/alertas` poderia ficar mais barato filtrando a faixa direto no SQL, mas isso
duplicaria a regra clínica de `common/glicemia`, que está na lista de "não mexa".
O ganho certo é chamar menos vezes (item 2).

---

## 6. Como repetir

Precisa de Docker e Node 20+. Nunca rode contra o banco publicado: o teste grava
glicemias e mensagens.

```bash
# 1. banco descartável (aqui na porta 5440) com o volume do teste
docker exec <container-postgres> createdb -U tcc tcc_perf
DATABASE_URL="postgres://tcc:tcc@127.0.0.1:5440/tcc_perf" SEED_DEMO=true node apps/api/preparar-banco.mjs
docker exec -i <container-postgres> psql -U tcc -d tcc_perf < scripts/carga/popular-carga.sql

# 2. API apontando para ele (no PC, ou num contêiner com --cpus 0.1 -m 512m
#    para imitar o Render gratuito)
NODE_ENV=production PORT=3020 DATABASE_URL=".../tcc_perf" JWT_SECRET=teste node apps/api/dist/main.js

# 3. testes
node scripts/carga/teste-carga.mjs endpoints  --url http://127.0.0.1:3020 --niveis 1,10,50 --sem login
node scripts/carga/teste-carga.mjs sessoes    --url http://127.0.0.1:3020 --mix 0:100,2:0,2:50
node scripts/carga/teste-carga.mjs sse        --url http://127.0.0.1:3020 --conexoes 100,500
node scripts/carga/teste-carga.mjs travamento --url http://127.0.0.1:3020 --n 15
```

O modo `travamento` é o que confirma a correção do item 2.1: com o código de
hoje, depois dele o `/status` mostra `"banco":"indisponivel"` e a API precisa ser
reiniciada.
