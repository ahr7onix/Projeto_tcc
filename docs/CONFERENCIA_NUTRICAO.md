# Conferência técnica — curso de Nutrição

Este documento reúne **todos os parâmetros de conteúdo nutricional e clínico**
que o NutriCare usa, para conferência por professor ou aluno do curso de
Nutrição. Nada aqui é decisão de programação: são valores que o sistema aplica e
que precisam de validação profissional antes de qualquer uso com paciente real.

**Como usar:** marque cada linha com ✔ (confere) ou anote o valor correto na
coluna de observação. Não é preciso instalar nada — todos os valores estão neste
documento. No fim há o campo de assinatura.

> **Situação atual:** os valores de alimentos estão gravados no sistema com a
> fonte marcada como `exemplo`, e essa marcação aparece na tela. O ambiente
> publicado opera **somente com dados fictícios** enquanto esta conferência não
> for feita.

---

## 1. Faixas de referência de glicemia

O sistema classifica cada medição do paciente em cinco categorias e usa essa
classificação em três lugares: no retorno imediato ao registrar a medição, nos
alertas ao nutricionista e nos relatórios (percentual de tempo na faixa).

### 1.1 Limites fixos (valem em qualquer momento do dia)

| Situação | Regra aplicada | Classificação | Confere? |
|---|---|---|---|
| Hipoglicemia grave | valor **< 54** mg/dL | `hipoglicemia_grave` (crítico) | |
| Hipoglicemia | valor **< 70** mg/dL | `hipoglicemia` (atenção) | |
| Hiperglicemia grave | valor **> 250** mg/dL | `hiperglicemia_grave` (crítico) | |

### 1.2 Faixa-alvo por momento da medição

Fora desses intervalos (e dentro dos limites fixos acima), a medição é
classificada como `hiperglicemia` (acima do máximo) ou `hipoglicemia` (abaixo do
mínimo), ambas com severidade "atenção".

| Momento | Rótulo na tela | Mínimo | Máximo | Confere? / correção |
|---|---|---|---|---|
| `jejum` | Jejum | 70 | 180 | |
| `pre_prandial` | Pré-refeição | 70 | 180 | |
| `pos_prandial` | Pós-refeição | 70 | 180 | |
| `antes_dormir` | Antes de dormir | 90 | 150 | |
| `madrugada` | Madrugada | 70 | 140 | |
| `aleatorio` | Aleatório | 70 | 180 | |

**Ponto que pedimos atenção especial:** o piso da faixa também classifica. Uma
medição de **78 mg/dL antes de dormir** é apresentada como *hipoglicemia*,
porque o alvo desse momento começa em 90. A mesma medição em jejum é *normal*.
A intenção foi dar margem contra hipoglicemia noturna — confirmem se essa
conduta é adequada ou se o piso de 90 deve valer só como orientação visual, sem
gerar alerta.

**Também precisa de definição:** as faixas são iguais para todos os pacientes.
Não há distinção por tipo de diabetes (tipo 1, tipo 2, gestacional), por idade
ou por gestação. Se for necessário diferenciar, indiquem quais grupos e quais
faixas.

### 1.3 Mensagens exibidas ao paciente

| Classificação | Texto que o paciente lê | Confere? / correção |
|---|---|---|
| `hipoglicemia_grave` | "Hipoglicemia grave. Procure atendimento e comunique seu nutricionista." | |
| `hipoglicemia` | "Glicemia abaixo do esperado para este momento." | |
| `normal` | "Glicemia dentro da faixa de referência." | |
| `hiperglicemia` | "Glicemia acima do esperado para este momento." | |
| `hiperglicemia_grave` | "Hiperglicemia grave. Procure atendimento e comunique seu nutricionista." | |

---

## 2. Tabela de alimentos de exemplo (36 itens)

Todos os valores são **por 100 g** do alimento na forma indicada no nome. A
coluna "medida caseira" informa a quantos gramas equivale a medida citada — é o
que aparece no app quando o paciente monta a refeição.

Os valores foram levantados a partir de tabelas de composição de uso comum, mas
**não foram transcritos de uma fonte única nem conferidos item a item**. É
exatamente isso que pedimos: apontar os que estão errados, ou indicar qual
tabela oficial (TACO, IBGE/POF, USDA ou outra) deve ser adotada como fonte.

### Cereais, pães e tubérculos

| # | Alimento | Medida caseira | g | kcal | Carb (g) | Prot (g) | Lip (g) | Fibras (g) | Confere? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Arroz branco cozido | 1 colher de servir | 60 | 128 | 28,1 | 2,5 | 0,2 | 1,6 | |
| 2 | Arroz integral cozido | 1 colher de servir | 60 | 124 | 25,8 | 2,6 | 1,0 | 2,7 | |
| 3 | Macarrão cozido | 1 pegador | 80 | 158 | 30,9 | 5,8 | 1,3 | 1,8 | |
| 4 | Pão francês | 1 unidade | 50 | 300 | 58,6 | 8,0 | 3,1 | 2,3 | |
| 5 | Pão de forma integral | 1 fatia | 25 | 253 | 49,9 | 9,4 | 3,7 | 6,9 | |
| 6 | Aveia em flocos | 1 colher de sopa | 15 | 394 | 66,6 | 13,9 | 8,5 | 9,1 | |
| 7 | Tapioca (goma hidratada) | 1 unidade média | 60 | 240 | 60,0 | 0,2 | 0,1 | 0,5 | |
| 8 | Batata cozida | 1 unidade média | 90 | 52 | 11,9 | 1,2 | 0,1 | 1,3 | |
| 9 | Batata doce cozida | 1 pedaço médio | 80 | 77 | 18,4 | 0,6 | 0,1 | 2,2 | |
| 10 | Mandioca cozida | 1 pedaço médio | 80 | 125 | 30,1 | 0,6 | 0,3 | 1,6 | |

### Leguminosas

| # | Alimento | Medida caseira | g | kcal | Carb (g) | Prot (g) | Lip (g) | Fibras (g) | Confere? |
|---|---|---|---|---|---|---|---|---|---|
| 11 | Feijão carioca cozido | 1 concha média | 80 | 76 | 13,6 | 4,8 | 0,5 | 8,5 | |
| 12 | Feijão preto cozido | 1 concha média | 80 | 77 | 14,0 | 4,5 | 0,5 | 8,4 | |
| 13 | Lentilha cozida | 1 concha média | 80 | 93 | 16,3 | 6,3 | 0,5 | 7,9 | |
| 14 | Grão-de-bico cozido | 1 concha média | 80 | 130 | 21,2 | 8,4 | 2,1 | 7,6 | |

### Carnes, pescados e ovos

| # | Alimento | Medida caseira | g | kcal | Carb (g) | Prot (g) | Lip (g) | Fibras (g) | Confere? |
|---|---|---|---|---|---|---|---|---|---|
| 15 | Peito de frango grelhado | 1 filé médio | 100 | 159 | 0,0 | 32,0 | 2,5 | 0,0 | |
| 16 | Patinho bovino grelhado | 1 bife médio | 100 | 219 | 0,0 | 35,9 | 7,3 | 0,0 | |
| 17 | Filé de tilápia grelhado | 1 filé médio | 100 | 96 | 0,0 | 20,0 | 1,7 | 0,0 | |
| 18 | Ovo de galinha cozido | 1 unidade | 50 | 146 | 0,6 | 13,3 | 9,5 | 0,0 | |

### Leite e derivados

| # | Alimento | Medida caseira | g | kcal | Carb (g) | Prot (g) | Lip (g) | Fibras (g) | Confere? |
|---|---|---|---|---|---|---|---|---|---|
| 19 | Leite integral | 1 copo | 200 | 61 | 4,7 | 3,2 | 3,3 | 0,0 | |
| 20 | Leite desnatado | 1 copo | 200 | 35 | 4,9 | 3,4 | 0,2 | 0,0 | |
| 21 | Iogurte natural integral | 1 pote | 170 | 61 | 4,7 | 3,5 | 3,3 | 0,0 | |
| 22 | Queijo minas frescal | 1 fatia | 30 | 264 | 3,2 | 17,4 | 20,2 | 0,0 | |

### Frutas

| # | Alimento | Medida caseira | g | kcal | Carb (g) | Prot (g) | Lip (g) | Fibras (g) | Confere? |
|---|---|---|---|---|---|---|---|---|---|
| 23 | Banana prata | 1 unidade média | 70 | 98 | 26,0 | 1,3 | 0,1 | 2,0 | |
| 24 | Maçã com casca | 1 unidade média | 130 | 56 | 15,2 | 0,3 | 0,0 | 1,3 | |
| 25 | Mamão papaia | 1 fatia média | 100 | 40 | 10,4 | 0,5 | 0,1 | 1,8 | |
| 26 | Laranja pera | 1 unidade média | 130 | 37 | 8,9 | 1,0 | 0,1 | 0,8 | |
| 27 | Melancia | 1 fatia média | 200 | 33 | 8,1 | 0,9 | 0,0 | 0,1 | |
| 28 | Abacate | 1 colher de sopa | 30 | 96 | 6,0 | 1,2 | 8,4 | 6,3 | |

### Hortaliças

| # | Alimento | Medida caseira | g | kcal | Carb (g) | Prot (g) | Lip (g) | Fibras (g) | Confere? |
|---|---|---|---|---|---|---|---|---|---|
| 29 | Alface crespa crua | 1 prato de sobremesa | 40 | 15 | 2,9 | 1,4 | 0,2 | 1,8 | |
| 30 | Tomate cru | 1 unidade média | 90 | 15 | 3,1 | 1,1 | 0,2 | 1,2 | |
| 31 | Cenoura crua | 1 unidade média | 70 | 34 | 7,7 | 1,3 | 0,2 | 3,2 | |
| 32 | Brócolis cozido | 1 colher de sopa | 25 | 25 | 4,4 | 2,1 | 0,5 | 3,4 | |
| 33 | Abóbora cozida | 1 colher de sopa | 30 | 48 | 12,0 | 0,9 | 0,1 | 2,5 | |

### Óleos, oleaginosas e açúcares

| # | Alimento | Medida caseira | g | kcal | Carb (g) | Prot (g) | Lip (g) | Fibras (g) | Confere? |
|---|---|---|---|---|---|---|---|---|---|
| 34 | Azeite de oliva | 1 colher de sopa | 8 | 884 | 0,0 | 0,0 | 100,0 | 0,0 | |
| 35 | Castanha-do-pará | 1 unidade | 5 | 643 | 15,1 | 14,5 | 63,5 | 7,9 | |
| 36 | Açúcar refinado | 1 colher de chá | 5 | 387 | 99,5 | 0,0 | 0,0 | 0,0 | |

### Perguntas abertas sobre esta tabela

1. **Fonte a adotar.** Qual tabela oficial deve substituir estes valores?
   Cada alimento guarda a própria fonte, e o rótulo aparece na tela — então dá
   para conviver com mais de uma tabela e ir substituindo. O que falta é a
   definição de qual adotar.
2. **Índice glicêmico.** O sistema tem campo para índice glicêmico de cada
   alimento, hoje vazio. Faz sentido preenchê-lo para o público com diabetes?
   Se sim, com qual referência?
3. **Cobertura.** Faltam alimentos de uso frequente pelos pacientes da ADJ
   Birigui? Indiquem quais incluir.
4. **Medidas caseiras.** As equivalências em gramas (ex.: 1 concha média =
   80 g) conferem com a prática do atendimento?

---

## 3. Fórmulas de cálculo

Estas fórmulas geram a **sugestão** apresentada ao nutricionista na tela de
plano alimentar. A prescrição continua sendo dele — o sistema não fecha nada
sozinho.

### 3.1 Taxa metabólica basal

| Fórmula | Expressão usada | Confere? |
|---|---|---|
| Mifflin-St Jeor (padrão) | 10 × peso(kg) + 6,25 × altura(cm) − 5 × idade **+ 5** (masculino) / **− 161** (feminino) | |
| Harris-Benedict revisada | M: 88,362 + 13,397×peso + 4,799×altura(cm) − 5,677×idade · F: 447,593 + 9,247×peso + 3,098×altura(cm) − 4,330×idade | |

O padrão do sistema é Mifflin-St Jeor. **Confirmem se é a escolha adequada** —
ou se para o público com diabetes há outra recomendação.

### 3.2 Fatores de atividade física

O gasto energético total é a TMB multiplicada por:

| Nível | Rótulo exibido | Fator | Confere? |
|---|---|---|---|
| `sedentario` | Sedentário (sem exercício regular) | 1,20 | |
| `leve` | Leve (1 a 3 dias por semana) | 1,375 | |
| `moderado` | Moderado (3 a 5 dias por semana) | 1,55 | |
| `intenso` | Intenso (6 a 7 dias por semana) | 1,725 | |
| `muito_intenso` | Muito intenso (treino pesado ou trabalho físico) | 1,90 | |

### 3.3 Macronutrientes

| Item | Valor no sistema | Confere? |
|---|---|---|
| Carboidratos | 4 kcal/g | |
| Proteínas | 4 kcal/g | |
| Lipídios | 9 kcal/g | |
| Distribuição sugerida na tela | 50% carboidratos · 20% proteínas · 30% lipídios | |

A distribuição é apenas o ponto de partida do formulário e é editável pelo
nutricionista; o sistema só exige que os três percentuais somem 100.
**Confirmem se 50/20/30 é um ponto de partida adequado** para o público
atendido, ou indiquem outro.

### 3.4 IMC

IMC = peso(kg) ÷ altura(m)², apresentado com duas casas decimais.

| Faixa | Classificação exibida | Confere? |
|---|---|---|
| < 18,5 | Baixo peso | |
| 18,5 a 24,9 | Eutrofia (peso adequado) | |
| 25,0 a 29,9 | Sobrepeso | |
| 30,0 a 34,9 | Obesidade grau I | |
| 35,0 a 39,9 | Obesidade grau II | |
| ≥ 40,0 | Obesidade grau III | |

Os pontos de corte adotados são os da OMS para **adultos**. O sistema aplica a
mesma tabela independentemente da idade — **idosos e menores de 19 anos ficam
classificados por critério que não é o deles**. Precisamos saber se isso deve
ser corrigido antes do uso real e, em caso positivo, quais referências usar.

---

## 4. Resultado da conferência

| Bloco | Situação | Observações |
|---|---|---|
| 1. Faixas de glicemia | ☐ aprovado ☐ aprovado com correções ☐ refazer | |
| 2. Tabela de 36 alimentos | ☐ aprovado ☐ aprovado com correções ☐ refazer | |
| 3.1 Fórmulas de TMB | ☐ aprovado ☐ aprovado com correções ☐ refazer | |
| 3.2 Fatores de atividade | ☐ aprovado ☐ aprovado com correções ☐ refazer | |
| 3.3 Macronutrientes | ☐ aprovado ☐ aprovado com correções ☐ refazer | |
| 3.4 IMC | ☐ aprovado ☐ aprovado com correções ☐ refazer | |

**Correções e observações gerais:**

_______________________________________________________________________

_______________________________________________________________________

_______________________________________________________________________

**Conferido por:** ______________________________________________

**CRN nº:** ____________________  **Instituição/curso:** _______________________

**Data:** ____ / ____ / ________   **Assinatura:** ______________________________

---

## Onde cada valor fica no sistema (para quem for aplicar as correções)

| Bloco | Arquivo |
|---|---|
| Faixas e limites de glicemia, mensagens | `apps/api/src/common/glicemia/glicemia.ts` |
| Tabela de alimentos | `database/seeds_alimentos.sql`, ou pelo cadastro de alimentos do sistema, informando a fonte correta |
| TMB, fatores de atividade, macros, IMC | `apps/api/src/common/nutricao/nutricao.ts` |

Cada bloco tem um único ponto de definição no código e é consumido por todas as
telas a partir dele — corrigir um valor aqui corrige o sistema inteiro, sem
risco de uma tela ficar divergente da outra. Os testes automatizados
(`glicemia.spec.ts`, `nutricao.spec.ts`) travam esses números: se um valor for
alterado sem atualizar o teste correspondente, a suíte acusa.
