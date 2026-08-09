# Treinamento: UGC de Rosto Roblox (estilo Marketplace moderno)

Objetivo: criar rostos UGC no estilo **doodled / soft-anime / flat-decal** — o desenho parece impresso na frente da cabeça Roblox, não um rosto 3D nem máscara volumosa.

> Use as referências só como **linguagem visual**. Nunca copie traços, IDs ou designs existentes.

---

## 1. O que esse estilo realmente é

Esses itens do Marketplace costumam ser:

| Tipo | Como parece | Quando usar |
|------|-------------|-------------|
| **Face Accessory (Face)** | Mesh fino na frente da cabeça + textura PNG com fundo transparente | Estilo mais comum dos “doodled faces” |
| **Face clássico (Decal)** | Textura aplicada no `Face` da cabeça | Mais simples, menos controle comercial |
| **Avatar Makeup** | Texturas por região (olhos / face / lábios) | Looks misturáveis (sistema mais novo) |

Para o visual das suas referências, foque em **Face Accessory flat** (categoria Face) ou conceito de textura flat para preview.

### Checklist visual obrigatório

- [ ] Cabeça Roblox básica (branca / cinza claro / bege suave)
- [ ] Rosto **2D flat** colado na superfície frontal
- [ ] Sem cabelo, orelhas, chifres, capacete, armadura
- [ ] Sem volume 3D saltado no rosto
- [ ] Traço limpo OU doodle expressivo (escolha um e seja consistente)
- [ ] Expressão forte com poucos elementos
- [ ] Design **original**

---

## 2. DNA do estilo (extraído das suas refs)

### 2.1 Composição na cabeça

```
┌─────────────────────┐
│     testa grande    │  ← muito espaço vazio em cima
│                     │
│    ○         ○      │  ← olhos GRANDES, centro-médio
│      (blush)        │  ← blush logo abaixo dos olhos
│         ⌣ / :3 / ▢  │  ← boca PEQUENA, bem embaixo
└─────────────────────┘
```

Regras:

1. **Testa grande** = personagem mais fofo
2. Olhos ocupam boa parte da metade superior do terço facial
3. Boca fica baixa e pequena (quase nunca larga demais, salvo expressão específica)
4. Quase **sem nariz** (no máximo um ponto mínimo)
5. Margem segura nas bordas da face (não encostar no canto da cabeça)

### 2.2 Famílias de estilo (escolha UMA por peça)

| Família | Olhos | Boca | Blush | Sensação |
|---------|-------|------|-------|----------|
| **Soft Angel** | ver módulo §9 (5 subestilos) | `w` / mínimo | hatch / oval / espiral / corações | fofo, kawaii |
| **Doodled Emotion** | enormes, scribble/brilho dentro | V aberto, onda, coração | ar airbrush rosa | emocional, meme-kawaii |
| **Alt / Goth-kawaii** | amendoados, cílios pontudos, íris pastel | boca `ω` ou `w` | blush suave | cool, charmoso |
| **Clown / Jester marks** | linha simples + marca assimétrica (losango/estrela) | língua, :3, grin | espirais ou linhas | brincalhão |
| **Minimal Derpy** | 2 ovais pretos pequenos | retângulo / linha | pincelada rosa central | meme, clean |

### 2.3 Paleta típica

- Linha: preto, navy, roxo escuro ou vermelho escuro (1 só)
- Blush: rosa / pêssego soft (airbrush, baixa opacidade)
- Acento (opcional): 1 cor só (rosa coração, azul lágrima, amarelo estrela)
- Fundo da textura: **transparente**
- Cabeça no preview: branca ou cinza claro (mais “Marketplace”)

### 2.4 O que NÃO fazer (erros comuns de IA / iniciante)

- Rosto “boneco realista” com sombreamento 3D
- Olhos pequenos demais no centro
- Pele bege hiper-renderizada com poros
- Muitos detalhes (cílio individual demais, sobrancelha complexa, nariz)
- Elementos flutuando fora da face
- Copiar faces famosas do catálogo

---

## 3. Pipeline técnico (do zero ao Marketplace)

### Etapa A — Desenho da textura (2D)

**Ferramentas:** Ibis Paint / Procreate / Photoshop / Clip Studio / Photopea

1. Canvas **1024×1024** (bom equilíbrio) ou **2048×2048** (máx. Marketplace)
2. Fundo transparente
3. Guia mental: desenhe só a área frontal da cabeça
4. Camadas sugeridas:
   - `blush`
   - `eyes_fill`
   - `lineart`
   - `highlights` (estrelas, corações, sparkles)
   - `mouth`
5. Exporte PNG com alpha: `face_albedo.png`

**Dica de traço doodled:**

- Linha com leve irregularidade (não vetor perfeito demais)
- Espessura maior nos olhos
- Destaques brancos “rabiscados” dentro do olho

**Dica de traço soft:**

- Linha fina e estável
- Blush com aerógrafo bem soft
- Pouquíssimos elementos

### Etapa B — Mesh Face Accessory (3D)

**Ferramenta:** Blender

1. Use manequim Classic (cabeça Roblox básica)
2. Crie um plano/curvo **bem fino** só na frente da cabeça (quase colado)
3. UV unwrap da frente → textura cabe limpa
4. Aplique o PNG com alpha
5. Orçamento: acessório rígido ≤ **4k triângulos** (face flat usa muito menos)
6. Limite Classic Face: até **3 × 2 × 2** studs
7. Attachment: `FaceFrontAttachment` (ou via Accessory Fitting Tool)

### Etapa C — Roblox Studio

1. Importe FBX/glTF
2. Use **Accessory Fitting Tool** → tipo **Face**
3. Teste em cabeça branca / bege / heads populares
4. Confira:
   - Material Plastic
   - Transparency 0 no mesh (alpha vem da textura)
   - Sem scripts extras
5. Publique no Creator Dashboard / Marketplace (seguindo políticas)

Docs oficiais úteis:

- [Rigid accessory specifications](https://create.roblox.com/docs/art/accessories/specifications)
- [Create face accessories](https://create.roblox.com/docs/art/characters/facial-animation/create-face-accessories)
- [Avatar Makeup](https://create.roblox.com/docs/en-us/makeup) (alternativa moderna por regiões)

---

## 4. Treino prático (7 dias)

### Dia 1 — Silhueta e placement

Desenhe só:

- 2 olhos fechados (curvas)
- blush
- boca mínima

Faça 6 variações só mudando posição/tamanho. Objetivo: acertar a “testa grande”.

### Dia 2 — Soft Angel

Replique a **linguagem** (não o design):

- cílios em asa
- 3 risquinhos no blush
- sorriso mínimo
- 1 cor de linha (navy ou preto)

### Dia 3 — Olhos doodled

6 pares de olhos:

1. scribble interno  
2. coração highlight  
3. pupilas slit  
4. meio-fechado sleepy  
5. estrela sparkle  
6. assimétrico (um piscando)

### Dia 4 — Expressões

Mesma base de olhos, mude só boca/sobrancelha:

- feliz  
- bravo  
- triste  
- :3  
- boca aberta V  
- love-struck  

### Dia 5 — Marcas temáticas (Clown lite)

Adicione 1 marca por lado (losango / estrela / lágrima), sem lotar.

### Dia 6 — Textura tela cheia (formato de entrega)

Monte a face como **desenho UGC full-frame**:

- só olhos / sobrancelhas / blush / boca (sem cabeça 3D)  
- fundo branco ou transparente  
- composição centrada, pronta para decal  
- sem textos/logos/UI  

(Preview na cabeça 3D é opcional e só se pedido.)

### Dia 7 — Pack original

Crie 3 faces da mesma “coleção” (mesma linha/paleta, expressões diferentes).

---

## 5. Fórmula rápida para inventar um rosto original

Use este gerador mental:

1. **Família:** Soft / Doodled / Alt / Clown-lite / Derpy  
2. **Olhos:** abertos | fechados | meio-fechados  
3. **Pupila/highlight:** ponto | coração | estrela | scribble | slit  
4. **Boca:** `⌣` | `ω` | V | onda | nenhuma  
5. **Blush:** círculo soft | linhas diagonais | espiral | faixa central  
6. **Acento único:** lágrima | fang | 1 marca assimétrica | nenhum  

Exemplo:

> Doodled + olhos abertos + coração highlight + boca onda + blush airbrush + sem nariz  
> → “lovestruck doodle” original

---

## 6. Rubrica de qualidade (antes de publicar)

Dê nota 0–2 em cada item (meta: ≥ 10/12):

1. Lê bem em thumbnail pequena  
2. Parece flat na cabeça (não máscara grossa)  
3. Expressão clara em 1 segundo  
4. Traço consistente  
5. Paleta limitada e limpa  
6. Originalidade (não parece cópia de catálogo)

---

## 7. Prompt de conceito (formato tela cheia)

Use este briefing (formato padrão de entrega):

```
Full-frame Roblox UGC face texture drawing ONLY.
Solid white background. No 3D head, no body, no text, no UI.
Centered flat 2D face features only (eyes, brows, blush, mouth, optional marks).
Soft Angel substyle: [Heart Gaze | Puppy Soft | Soft Clown | Ultra Minimal | Pastel Marks]
Original design — do not copy existing Roblox faces.
Clean marketplace kawaii decal aesthetic.
```

---

## 8. Próximo passo recomendado

1. Escolher **1 subestilo Soft Angel** do §9  
2. Fazer os exercícios A–E do §9.3  
3. Gerar um pack de 5 faces (um de cada subestilo)  
4. Só então ir para Blender + Studio  

Quando quiser, peça: “gera Heart Gaze” / “gera pack Soft Angel 5 subestilos”.

---

## 9. Módulo Soft Angel avançado (baseado nos seus modelos)

> Referências usadas só como **linguagem**. Não copie layout, proporção nem detalhes iguais.

### 9.1 Formato que esses modelos ensinam

Todos os 5 modelos compartilham o mesmo formato de produto:

| Regra | Detalhe |
|-------|---------|
| Entrega | **Tela cheia** — só o desenho do rosto |
| Fundo | Branco / off-white limpo |
| Sem | cabeça 3D, cabelo, contorno de rosto, texto, UI |
| Simetria | quase sempre simétrica (Clown pode quebrar de propósito) |
| Espaço | bastante margem branca em volta dos traços |
| Leitura | thumbnail pequena ainda entende a expressão |

### 9.2 Os 5 subestilos (DNA)

#### A) Heart Gaze
- Olhos **grandes e abertos**
- Íris com gradiente escuro → rosa na base
- Highlight branco grande + sparkles pequenos
- **Coração rosa** dentro de cada olho (discreto)
- Cílios grossos com pontas externas
- Sobrancelhas finas, levemente “preocupadas/fofas”
- Boca `w` minúscula
- Blush: 3 risquinhos diagonais + **1–2 corações** do lado de fora

**Sensação:** apaixonado / shiny eyes  
**Camadas:** `iris` → `highlights` → `lineart` → `hearts` → `blush` → `mouth`

#### B) Puppy Soft
- Igual Heart Gaze, mas sobrancelhas mais **pedintes** (inclinam para o centro)
- Olhos um pouco mais redondos
- Mesma boca `w` + blush com corações

**Sensação:** “me dá atenção” / sad-cute  
**Diferença-chave:** só sobrancelha + leve formato do olho

#### C) Soft Clown (harlequin kawaii)
- **Assimétrico de propósito:** 1 olho fechado (curva + cílios) + 1 olho aberto (preto com highlight coração/círculo)
- Marcas: **losango** em um lado + **estrela** no outro
- Nariz = bolinha rosa com brilho branco
- Boca sorrindo com **língua** saindo
- Blush = **espirais** rosa (não hatch)

**Sensação:** brincalhão, jester fofo  
**Cuidado:** não virar maquiagem de palhaço pesada — pastel e clean

#### D) Ultra Minimal
- Olhos fechados = 2 curvas pretas **espessas**, pontas simples
- Nariz = **1 ponto** preto
- Boca = `w` pequena
- Blush = **2 ovais** rosa inclinados por lado (sem corações, sem estrelas)
- Quase zero detalhe extra

**Sensação:** clean, estético, “menos é mais”  
**Teste:** se remover 1 traço e ainda funcionar, está no caminho

#### E) Pastel Marks
- Olhos fechados em asa (cílios longos)
- **Losango vertical** atravessando cada olho (rosa num lado, azul no outro)
- Estrelinha 4 pontas acima de cada losango
- Nariz = ovalzinho rosa
- Boca `w`
- Blush soft + estrelinhas espalhadas (rosa à esquerda, azul à direita)

**Sensação:** soft angel + harlequin pastel  
**Paleta fixa:** preto + rosa + azul claro (não adicionar 4ª cor)

### 9.3 Exercícios com esses modelos (faça na ordem)

#### Exercício A — Anatomy kit (30 min)
Desenhe isolado, 3x cada:
1. olho Heart Gaze (sem boca)
2. olho fechado em asa
3. boca `w` em 3 tamanhos
4. blush hatch vs oval vs espiral

#### Exercício B — Swap challenge
Pegue a estrutura Ultra Minimal e troque **só 1 coisa** por vez:
1. + corações no blush  
2. + losangos pastel  
3. olhos abertos Heart Gaze  
4. virar Soft Clown (assimétrico)

Objetivo: ver como 1 peça muda o “tipo” do UGC.

#### Exercício C — Coleção de 5
Crie **1 face original por subestilo** (A–E), mesma “série”:
- mesma espessura de linha
- mesma escala de boca `w`
- mesmas margens no canvas
- só muda o kit de olhos/marcas

#### Exercício D — Thumbnail test
Reduza cada face para ~128px. Se o coração/losango/língua sumir, engrosse ou simplifique.

#### Exercício E — Originalidade check
Compare com as refs. Se alguém puder dizer “é a mesma face”, mude:
- curva do cílio
- posição do highlight
- forma do coração/estrela
- densidade do blush

### 9.4 Receita de combinação (gerador Soft Angel)

```
[olho: aberto-heart | fechado-asa | wink-mix]
+ [marca: nenhuma | coração | losango | estrela | losango+estrela]
+ [nariz: nenhum | ponto | oval | bolinha]
+ [boca: w | sorriso+língua | mínima]
+ [blush: hatch | oval | espiral | hatch+corações]
+ [acento: mono-rosa | rosa+azul | só preto+rosa]
```

Exemplos originais:
- aberto-heart + nenhuma marca + sem nariz + w + hatch+corações + mono-rosa → **Heart Gaze**
- fechado-asa + losango rosa/azul + oval + w + blush+estrelas + rosa+azul → **Pastel Marks**
- wink-mix + losango+estrela + bolinha + língua + espiral + rosa+azul → **Soft Clown**

### 9.5 Erros típicos neste módulo

| Erro | Correção |
|------|----------|
| Olhos pequenos demais | aumente ~30% e suba um pouco |
| Muitos efeitos no olho | máx. 1 highlight grande + 2–4 sparkles |
| 4+ cores de acento | no máx. preto + 2 pastéis |
| Soft Clown simétrico | quebre de propósito (wink + marcas diferentes) |
| Ultra Minimal com glitter | remova até sobrar 5–7 formas |
| Entregar em cabeça 3D | volte ao formato tela cheia |

### 9.6 Checklist Soft Angel antes de salvar PNG

- [ ] Fundo branco / transparente, tela cheia
- [ ] Só features 2D (sem cabeça)
- [ ] Boca `w` ou mínima legível
- [ ] Blush coerente com o subestilo
- [ ] Máx. 1 “gimmick” dominante (coração OU losango OU língua)
- [ ] Original (não clone da ref)
- [ ] Funciona em thumbnail

---

## 10. Módulo Expressões & Lanes (nova leva de modelos)

> Os refs desta leva vêm em cabeça 3D — **ignore a cabeça**. Extraia só o desenho 2D e entregue em **tela cheia**.

### 10.1 Três “lanes” de produto

| Lane | Traço | Cor | Quando usar |
|------|-------|-----|-------------|
| **Mono Bold** | linha preta grossa, poucas formas | só preto/cinza | meme, humor, emoção clara |
| **Soft Sparkle** | olhos grandes, glow/heart highlight | preto + rosa soft | fofo, shiny, aesthetic |
| **Sticker Decora** | traço grosso + stickers | preto + rosa + azul + amarelo (controlado) | maximal cute, e-girl vibe |

Regra: **1 lane por face**. Não misture Mono Bold com 8 stickers.

### 10.2 Biblioteca de expressões (DNA)

#### 1) Tired / Unamused
- Olhos ovais claros com pupila pequena + pálpebra grossa horizontal
- Sobrancelhas altas / “cansei”
- Boca mínima curvada pra baixo
- Opcional: olheiras finas + 1 gota de suor

#### 2) XD Laugh
- Olhos em **X** pretos grossos
- Boca grande em V/U aberta
- Língua simples (triângulo/coração outline)
- Quase sem blush (ou linha suave)

#### 3) Soft Cry
- Olhos redondos claros com contorno grosso
- Lágrima colada embaixo de cada olho
- Sobrancelhas curvas pra baixo
- Boca frown mínima

#### 4) Big Heart Eyes (no-mouth ok)
- Olhos **enormes** pretos
- Highlight círculo branco + coração branco
- Glow rosa na borda inferior do olho
- Blush soft + hatch central (boca opcional / ausente)

#### 5) Spiral Hyper (Sticker)
- Olhos com **espiral** preta
- Boca aberta rosa + 1 fang
- Band-aid azul com coração
- Blush airbrush forte
- 3–6 stickers pequenos (estrela, coração, mascote) — não lotar

#### 6) Wink Decora
- 1 olho fechado (curva) + 1 olho oval preto
- Faixa de blush rosa horizontal
- Band-aid no centro
- Boca ondulada + língua
- Stickers assimétricos nas bochechas

#### 7) Joy Squint `> <`
- Olhos fechados em V laterais (`>` `<`)
- Boca aberta rosa com fang
- Blush círculo + 2 hatch dentro

#### 8) Puppy Sparkle Sad
- Olhos ovais pretos inclinados + 2 highlights brancos
- 1 sobrancelha assimétrica
- Boca squiggle + 2 risquinhos de “tremor”

#### 9) Deadpan U-eyes
- Olhos em U / semicírculo preto
- Pálpebra linha fina em cima
- Sem boca (ou quase nada)

#### 10) Blep Closed
- Olhos fechados em arco invertido
- Blush hatch no centro
- Boca com loop/língua pra um lado
- Opcional: 2 marcas de “bigode” curtas

#### 11) Sleepy Cat
- Olhos amendoados semi-fechados
- Sobrancelhas levemente assimétricas
- Nariz smudge rosa bem fraco
- Boca `w`

### 10.3 Exercícios (módulo 10)

#### Exercício F — Lane lock (20 min)
Desenhe a **mesma emoção “sad”** em 3 lanes:
1. Mono Bold Soft Cry  
2. Soft Sparkle Puppy  
3. Sticker Decora (lágrima + 2 stickers só)

#### Exercício G — Expression sheet
Em tela cheia, faça 6 faces Mono Bold:
Tired · XD · Soft Cry · Deadpan · Blep · Sleepy Cat

#### Exercício H — Sticker budget
Crie 1 Spiral Hyper e 1 Wink Decora com **máximo 5 stickers** no total da face. Se passar, apague.

#### Exercício I — Mouthless power
Faça Big Heart Eyes **sem boca**. Se a emoção não ler, o problema está nos olhos/blush — não na boca.

#### Exercício J — Conversão 3D → 2D
Pegue qualquer preview em cabeça Roblox e redesenhe **só as features** em canvas branco 1024×1024, recentrando e engrossando traço para thumbnail.

### 10.4 Gerador rápido (lane + emoção)

```
Lane: [Mono Bold | Soft Sparkle | Sticker Decora]
+ Emoção: [Tired | XD | Cry | HeartEyes | Spiral | Wink | Joy | Puppy | Deadpan | Blep | Sleepy]
+ Boca: [nenhuma | mínima | w | aberta | língua]
+ Extra: [nenhum | lágrima | suor | band-aid | 2–5 stickers]
```

### 10.5 Rubrica extra deste módulo

| Critério | 0 | 1 | 2 |
|----------|---|---|---|
| Lane clara | misturou tudo | quase | óbvia |
| Emoção em 1s | confusa | ok | instantânea |
| Budget de detalhe | poluído | aceitável | limpo |
| Formato tela cheia | veio em cabeça 3D | parcial | só desenho 2D |
| Originalidade | clone | parecido | linguagem própria |

Meta: ≥ 8/10.

### 10.6 Ordem de treino sugerida (hoje)

1. Tired (Mono)  
2. XD Laugh (Mono)  
3. Soft Cry (Mono)  
4. Big Heart Eyes (Soft Sparkle)  
5. Joy Squint (Soft)  
6. Puppy Sparkle Sad (Soft)  
7. Deadpan (Mono)  
8. Blep Closed (Mono)  
9. Wink Decora (Sticker)  
10. Spiral Hyper (Sticker)

---

## 11. Módulo Quality Targets (feedback: o que ficou bom)

### 11.1 Modelos aprovados (referência de qualidade)

| Aprovado | Tipo | Por que funciona |
|----------|------|------------------|
| **treino10-01 Tired** | Mono Bold mood | Olho estruturado (pálpebra + íris + pupila), olheiras, suor, boca mínima — emoção clara sem poluição |
| **treino10-05 Joy Squint** | Soft joy | Formas simples e bold (`>` `<`), boca rosa + fang, blush oval com hatch — thumbnail perfeita |
| **treino10-10 Spiral Hyper** | Sticker Decora | Olhos espiral como âncora, boca forte, band-aid, stickers agrupados em clusters — maximal controlado |
| **Soft Angel Serene / Heart Gaze** | Soft Angel | Traço limpo, blush hatch, highlights/coração — só precisa de polimento fino |

### 11.2 O que evitar (modelos fracos desta leva)

- XD / Deadpan / Blep “vazios” demais (pouca estrutura, parece incompleto)
- Soft Cry genérico sem peso de linha
- Heart Eyes sem boca **e** sem hierarquia (olhos soltos demais)
- Puppy Sad com traço irregular sem intenção
- Wink Decora bagunçado (stickers competindo com olhos/boca)

### 11.3 Regras de qualidade (obrigatórias daqui pra frente)

1. **Âncora forte:** olhos OU boca devem dominar a leitura em 1 segundo  
2. **Espaçamento comercial:** features agrupadas no centro, margem branca generosa, sem “perder” no canvas  
3. **Peso de linha consistente:** traço principal grosso nos olhos/boca; detalhes finos só no blush/acentos  
4. **Paleta disciplinada:** Mono = preto/cinza; Soft = preto+rosa; Sticker = preto+rosa+1–2 acentos, stickers em **clusters** (não espalhados)  
5. **Um gimmick dominante:** suor OU fang OU espiral OU band-aid — não todos ao mesmo tempo sem hierarquia  
6. **Polimento Soft Angel:** cílio em asa limpo, hatch alinhado (2–4 linhas), coração/sparkle discretos, boca `w` ou curva mínima bem centrada  

### 11.4 Treino focado nos tipos bons

#### Tipo TIRED (base: model 1)
Checklist:
- [ ] Pálpebra horizontal grossa
- [ ] Íris cinza clara + pupila pequena
- [ ] 3–4 olheiras finas
- [ ] 1 suor (U) num canto
- [ ] Boca mínima frown
- [ ] Sem stickers / sem cores extras

Variações permitidas: mais/menos olheiras · suor esquerda/direita · sobrancelha mais alta

#### Tipo JOY SQUINT (base: model 5)
Checklist:
- [ ] Olhos `>` `<` grossos e simétricos
- [ ] Boca aberta crescent com fill rosa/coral
- [ ] 1 fang branco pequeno
- [ ] Blush oval grande + 2 hatch por lado
- [ ] Sem nariz / sem stickers

Variações: fang lado oposto · boca mais larga · blush mais alto/baixo

#### Tipo SPIRAL HYPER (base: model 10)
Checklist:
- [ ] Olhos grandes com outline irregular/jagged + espiral
- [ ] Boca wide pink + 1 fang
- [ ] Band-aid azul com coração
- [ ] Blush soft + 1 shimmer simples por lado
- [ ] Stickers só em 2 clusters (esq/dir embaixo), máx. ~6 itens
- [ ] Sobrancelhas angulares fortes

Variações: mascote diferente · estrela/coração swap · fang lado

#### Soft Angel polish (base: Serene + Heart Gaze)
Checklist:
- [ ] Simetria quase perfeita
- [ ] Hatch blush paralelo e curto
- [ ] Highlight branco nítido (não borrado)
- [ ] Coração interno pequeno (se houver)
- [ ] Sem elementos extras soltos

### 11.5 Exercício K — Quality pack

Gere/desenhe **8 faces**:
1. Tired v2  
2. Tired v3 (suor do outro lado)  
3. Joy Squint v2  
4. Joy Squint v3 (boca maior)  
5. Spiral Hyper v2  
6. Spiral Hyper v3 (clusters diferentes)  
7. Soft Angel Serene polished  
8. Soft Angel Heart Gaze polished  

Avalie cada uma com a rubrica §10.5 + regras §11.3.
