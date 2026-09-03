# NutriCare — Situação do projeto

**Para:** equipe de Nutrição / ADJ Birigui
**De:** Natan Lourenço e Silva, Isac Buzelli dos Santos, Henrique Payá Ferreira
**Data:** 26 de julho de 2026

O NutriCare é um sistema de apoio ao controle nutricional do diabetes, formado por
duas partes que conversam entre si:

- um **aplicativo de celular**, usado pelo paciente;
- um **painel na internet**, usado pelo nutricionista e pela administração.

Este documento diz, sem rodeios, o que já funciona, o que ainda falta e o que
precisamos de vocês para concluir.

---

## 1. Em resumo

O sistema **está no ar e funcionando**. Um paciente consegue se cadastrar,
registrar suas medições e refeições, ver seu histórico, receber avisos e conversar
com a nutricionista. A nutricionista consegue entrar no painel, acompanhar seus
pacientes, montar plano alimentar, ver alertas e emitir relatórios.

Ao conferir esse resultado contra os dez requisitos do briefing de vocês,
encontramos o seguinte:

| | Quantos |
|---|---|
| Requisitos totalmente atendidos | 1 |
| Requisitos parcialmente atendidos | 4 |
| Requisitos ainda não atendidos | 5 |

**A parte de acompanhamento da glicemia é a mais madura do sistema.** As lacunas
estão concentradas em dois blocos: os **cálculos nutricionais** (tabela de
alimentos, necessidade energética, macronutrientes) e a **visualização em
gráficos**.

Parte dessas lacunas depende de definições clínicas que, pelo próprio briefing,
cabem à equipe de Nutrição — e que ainda não chegaram. A outra parte é lacuna
nossa, e está registrada aqui sem atenuação.

---

## 2. O que já funciona hoje

Tudo o que está nesta lista foi instalado, usado do começo ao fim e conferido.

**No aplicativo do paciente**

- Cadastro e entrada por e-mail e senha, ou pela conta Google
- Registro de glicemia informando o momento do dia — jejum, antes e depois da
  refeição, antes de dormir, madrugada
- Resposta imediata dizendo se a medição está dentro, abaixo ou acima da faixa
  esperada para aquele momento
- Registro de refeições
- Histórico de tudo o que foi registrado
- Aviso no celular quando uma medição sai da faixa
- Leitura do plano alimentar montado pela nutricionista
- Leitura dos materiais educativos publicados pela nutricionista
- Conversa com a nutricionista

**No painel do nutricionista**

- Lista dos seus pacientes, com vínculo próprio — cada nutricionista enxerga
  apenas quem está sob seus cuidados
- Ficha do paciente com o histórico de medições e refeições
- Montagem e edição de plano alimentar
- Painel de alertas com as medições fora da faixa
- Relatórios do paciente, exportáveis em planilha e em PDF
- Publicação de materiais educativos
- Conversa com o paciente

**Na administração**

- Números gerais do sistema (quantidade de pacientes, nutricionistas, vínculos,
  medições no período)
- Gestão de usuários

---

## 3. O que ainda falta, requisito por requisito

| Nº | Requisito do briefing | Situação |
|---|---|---|
| RF01 | Tabela de alimentos com valores nutricionais | Em construção |
| RF02 | Cálculo da necessidade energética diária | Aguarda definição clínica |
| RF03 | Distribuição de macronutrientes no plano | Aguarda definição clínica |
| RF04 | Peso, altura, IMC e circunferências, com histórico | Em construção |
| RF05 | Registro e histórico de glicemia com gráfico | Falta o gráfico |
| RF06 | Registro emocional do paciente | Aguarda definição clínica |
| RF07 | Alertas e lembretes configuráveis | Alertas prontos, lembretes em construção |
| RF08 | Visualização dos indicadores em gráficos | Em construção |
| RF09 | Repositório de receitas e orientações | Orientações prontas, receitas em construção |
| RF10 | Controle de acesso por perfil | **Atendido** |

**Explicando cada um em linguagem simples:**

**RF01 — Tabela de alimentos.** Hoje o paciente descreve a refeição por escrito e
informa a quantidade de carboidratos de cabeça, sem consultar nada. Já preparamos
o sistema para guardar uma tabela nutricional completa e carregamos 36 alimentos
comuns como exemplo, mas **esses valores são aproximados e não servem para uso
clínico** — precisam ser substituídos pela tabela oficial que vocês indicarem.

**RF02 — Necessidade energética.** O cálculo não existe ainda. Ele depende da
fórmula e dos parâmetros que vocês vão definir.

**RF03 — Macronutrientes.** O plano alimentar hoje guarda as refeições como texto
("1 fruta, 2 fatias de pão integral, 1 ovo"), sem somar carboidratos, proteínas e
gorduras. Depende dos dois itens acima.

**RF04 — Medidas corporais.** Peso, altura e IMC já existem, mas **o sistema
guardava apenas o valor mais recente**, apagando o anterior — o que impedia
acompanhar a evolução. Isso foi corrigido: agora cada medição fica registrada com
data, e as medições que já existiam foram preservadas. As circunferências
(cintura, quadril, braço, panturrilha, pescoço) já têm lugar no sistema e falta a
tela para preenchê-las.

**RF05 — Glicemia.** É a parte mais completa do sistema: registro por momento do
dia, histórico, classificação automática e faixas de referência configuradas.
**Falta apenas o gráfico de evolução** — hoje os dados aparecem em lista.

**RF06 — Registro emocional.** O lugar para guardar já existe. Falta a tela, e
falta vocês definirem o formato: uma escala de humor, um campo livre, ou os dois.

**RF07 — Alertas e lembretes.** Os alertas automáticos funcionam: medição fora da
faixa avisa o paciente no celular e a nutricionista no painel. **Os lembretes
programados pelo paciente ainda não funcionam** — não há como marcar "medir a
glicemia às 7h todos os dias". A estrutura foi construída; falta a tela.

**RF08 — Gráficos.** Nenhum gráfico existe ainda, nem no aplicativo nem no painel.
Os números aparecem em listas. Este item não depende de ninguém — é lacuna nossa.

**RF09 — Receitas.** Os materiais educativos funcionam de verdade: a nutricionista
publica pelo painel e o paciente lê no aplicativo. **As receitas, não** — a tela
existe no aplicativo, mas mostra três exemplos fixos que vieram gravados dentro do
programa. A nutricionista ainda não tem como publicar uma receita de verdade. A
estrutura para isso já foi construída.

**RF10 — Controle de acesso.** Atendido. Paciente, nutricionista e administrador
têm acessos separados, e cada nutricionista enxerga apenas os seus pacientes.

---

## 4. O que precisamos de vocês

Estes cinco pontos são o que está travando o restante. Quanto antes chegarem,
antes conseguimos entregar.

1. **Qual tabela nutricional usar** (TACO, IBGE ou outra) e em que formato vocês
   conseguem nos enviar. Sem isso, os valores do sistema continuam sendo exemplos.
2. **Qual fórmula usar para a necessidade energética diária** e quais fatores de
   atividade aplicar.
3. **Como distribuir os macronutrientes** — as porcentagens de carboidrato,
   proteína e gordura, e se elas mudam conforme o caso.
4. **Conferência das faixas de glicemia que já estão no sistema.** Hoje usamos
   referências gerais. Como os alvos mudam conforme o tipo de diabetes, a idade e
   a condição de cada pessoa, **elas precisam ser validadas por vocês antes de
   qualquer uso com paciente real.**
5. **Como registrar o estado emocional** — que escala ou formato faz sentido no
   acompanhamento de vocês.

E, para as receitas: quando houver conteúdo pronto, a nutricionista já poderá
publicá-lo direto pelo painel, sem depender de nós.

---

## 5. Cuidados com os dados dos pacientes

Dado de saúde é dado sensível e a LGPD trata disso de forma específica. Dois
pontos precisam ser resolvidos **antes de qualquer uso com pacientes reais**:

1. **Consentimento no vínculo.** Hoje a nutricionista se vincula a um paciente e
   passa a ver os dados de saúde dele sem que o paciente autorize. Isso precisa
   virar um pedido que o paciente aceita.
2. **Conferência do registro profissional.** O CRN é digitado livremente e não é
   verificado junto ao conselho — não existe consulta pública automatizada. Por
   ora, a solução é a aprovação manual de cada nutricionista pela administração.

Durante os testes, encontramos e corrigimos uma falha grave nesse mesmo tema:
**qualquer usuário conseguia ver os dados de saúde de todos os pacientes.** Foi
corrigida e conferida. Registramos aqui por transparência.

---

## 6. Trabalho já feito nesta etapa

Nesta rodada, reorganizamos a base do sistema para que tudo o que falta possa ser
construído em cima dela. Ficou pronto:

- O lugar para a tabela de alimentos, já com 36 itens de exemplo carregados
- O histórico de medidas corporais, com IMC calculado automaticamente e as
  medições antigas preservadas
- O espaço para as circunferências
- O espaço para o registro emocional
- O espaço para as receitas publicadas pela nutricionista
- Os lembretes programáveis, com dia da semana e horário
- Os campos para necessidade energética e distribuição de macronutrientes no plano

Também corrigimos um erro de modelagem: o sistema exigia que um lembrete de
glicemia apontasse para uma medição já existente — o que é impossível, já que o
lembrete serve justamente para a medição que **ainda não aconteceu**.

O que vem a seguir são as telas: consulta de alimentos, medidas corporais,
registro emocional, lembretes, receitas e os gráficos.

---

## 7. Ordem de entrega prevista

1. Telas de alimentos, medidas corporais, registro emocional e lembretes
2. Gráficos de evolução da glicemia e do peso
3. Publicação de receitas pela nutricionista
4. Cálculos de necessidade energética e macronutrientes — **assim que as fórmulas
   chegarem**
5. Consentimento do paciente no vínculo

Os itens 1, 2, 3 e 5 não dependem de definição clínica e já estão em andamento.

**Concluído fora desta lista, num pacote focado em segurança e usabilidade do
app do paciente**: alerta de hipo/hiperglicemia (banner + notificação local)
com base na última leitura registrada, correção do teto de referência de
glicemia para 180 mg/dL, edição completa de restrições alimentares e
medicamentos pelo próprio paciente, histórico com classificação visível em
cada registro, e modo de interface simplificada para pacientes com 55 anos ou
mais. O que ficou de fora desse pacote (push periódico via servidor e o modo
simplificado nas demais telas) está listado na seção "Fase 2 (planejado)" do
README.

---

## 8. Conclusão

O sistema está **funcional e apresentável**, com o acompanhamento glicêmico bem
resolvido, mas **ainda não cumpre o escopo mínimo do briefing**. As lacunas estão
mapeadas uma a uma neste documento, a base para resolvê-las já foi construída, e
metade delas depende de definições que só a equipe de Nutrição pode dar.

Ficamos à disposição para apresentar o sistema funcionando e discutir os pontos da
seção 4.

---

*Documentação técnica, para quem for dar continuidade ao sistema:
`docs/O_QUE_FOI_FEITO.md`, `docs/REVISAO_CODIGO.md` e `README.md`.*
