# NutriCare — Situação do projeto

**Para:** equipe de Nutrição / ADJ Birigui
**De:** Natan Lourenço e Silva, Isac Buzelli dos Santos, Henrique Payá Ferreira
**Data:** 27 de outubro de 2026 (substitui a versão de 26 de julho)

O NutriCare é um sistema de apoio ao controle nutricional do diabetes, formado por
duas partes que conversam entre si:

- um **aplicativo de celular**, usado pelo paciente;
- um **painel na internet**, usado pelo nutricionista e pela administração.

Este documento diz, sem rodeios, o que já funciona, o que ainda falta e o que
precisamos de vocês para concluir.

---

## 1. Em resumo

**Os dez requisitos do briefing de vocês têm hoje tela, servidor e banco de
dados.** Em julho, só um estava completo.

O que falta agora não é programação. São duas coisas:

1. **as definições clínicas que cabem a vocês** — a tabela nutricional oficial e a
   conferência das faixas de glicemia, das fórmulas e da distribuição de
   macronutrientes (seção 4);
2. **colocar o ambiente de demonstração no ar de novo** e testar tudo num celular
   de verdade (seção 7).

Até a conferência da seção 4, o sistema continua sendo usado **só com dados
fictícios**.

---

## 2. O que já funciona hoje

Tudo o que está nesta lista foi usado do começo ao fim e conferido.

**No aplicativo do paciente**

- Cadastro e entrada por e-mail e senha
- Registro de glicemia por momento do dia, com resposta imediata dizendo se a
  medição está dentro, abaixo ou acima do esperado para aquele momento
- Registro de refeições, com a contagem de carboidratos calculada a partir da
  tabela de alimentos
- Consulta da tabela de alimentos
- Registro de peso, medidas e circunferências, com IMC calculado
- Registro do humor, mostrado ao lado da glicemia do mesmo dia
- Lembretes programados pelo paciente (medir a glicemia, tomar o remédio)
- Gráficos de evolução da glicemia e do peso
- Leitura do plano alimentar, das receitas e dos materiais educativos
- Conversa com a nutricionista
- **Convite de acompanhamento**: o paciente vê quem quer acompanhá-lo, o que essa
  pessoa vai poder ver, e aceita ou recusa. Pode encerrar o acompanhamento quando
  quiser, em Perfil

**No painel do nutricionista**

- Lista dos seus pacientes — só quem aceitou o convite
- Convite de paciente pelo e-mail e **cadastro de paciente** que ainda não tem
  conta (o paciente recebe o link para criar a senha no próprio e-mail)
- Ficha do paciente com histórico, gráficos e calendário de glicemia
- Montagem de plano alimentar, com cálculo de necessidade energética e de
  macronutrientes
- **Importação da tabela de alimentos** por planilha (CSV), já reconhecendo o
  formato da TACO
- Publicação de receitas e materiais educativos
- Alertas de medições fora da faixa e relatórios em planilha e PDF
- Conversa com o paciente

**Na administração**

- Análise do grupo atendido: tipo de diabetes, faixa etária, controle glicêmico e
  quem parou de registrar
- **Aprovação de nutricionistas**: quem se cadastra sozinho só entra no painel
  depois que a administração confere o CRN
- Cadastro de nutricionistas e gestão de usuários

---

## 3. Requisito por requisito

| Nº | Requisito do briefing | Situação |
|---|---|---|
| RF01 | Importação da tabela de alimentos | **Atendido.** Falta a tabela oficial que vocês indicarem |
| RF02 | Cálculo da necessidade energética diária | **Atendido.** Aguarda a conferência da fórmula |
| RF03 | Distribuição de macronutrientes | **Atendido.** Aguarda a conferência dos percentuais |
| RF04 | Peso, altura, IMC e circunferências, com histórico | **Atendido** |
| RF05 | Registro e histórico de glicemia | **Atendido.** Aguarda a conferência das faixas |
| RF06 | Registro emocional | **Atendido** (escala de cinco pontos). Confirmar o formato |
| RF07 | Alertas e lembretes | **Atendido.** Falta testar a notificação num celular de verdade |
| RF08 | Gráficos dos indicadores | **Atendido** |
| RF09 | Receitas e orientações | **Atendido** |
| RF10 | Controle de acesso por perfil | **Atendido**, agora com consentimento do paciente e aprovação do nutricionista |

**RF01 — Tabela de alimentos.** O sistema importa uma tabela inteira de uma vez:
basta salvar a planilha como CSV. O painel mostra uma prévia e as linhas com
problema antes de gravar. Os 36 alimentos carregados hoje são **exemplos com
valores aproximados**, marcados assim na tela. Assim que vocês disserem qual
tabela usar, a importação leva minutos.

**RF02, RF03 e RF05 — Cálculos e faixas.** As fórmulas e faixas estão em uso, mas
são referências gerais. Cada valor fica num lugar só do sistema, e corrigir um
corrige todas as telas.

**RF06 — Registro emocional.** Escala de cinco pontos (de "muito mal" a "muito
bem") com fatores em texto livre. Se outro formato servir melhor ao atendimento
de vocês, dá para mudar.

---

## 4. O que precisamos de vocês

1. **Qual tabela nutricional usar** (TACO, TBCA, IBGE ou outra). Se vier em
   planilha, a importação já está pronta.
2. **Conferência da fórmula de necessidade energética** (hoje Mifflin-St Jeor, com
   Harris-Benedict como alternativa) e dos fatores de atividade.
3. **Conferência da distribuição de macronutrientes** — hoje o ponto de partida é
   50% carboidratos, 20% proteínas e 30% lipídios, editável pela nutricionista.
4. **Conferência das faixas de glicemia.** Os alvos mudam conforme o tipo de
   diabetes, a idade e a condição de cada pessoa. **Elas precisam ser validadas
   antes de qualquer uso com paciente real.**
5. **Confirmação do formato do registro emocional** (seção 3).

Tudo isso está reunido, com campo para assinatura, em
[CONFERENCIA_NUTRICAO.md](CONFERENCIA_NUTRICAO.md). Receitas e materiais
educativos a nutricionista publica direto pelo painel, sem depender de nós.

---

## 5. Cuidados com os dados dos pacientes

Os dois pontos de LGPD que estavam abertos em julho foram resolvidos:

1. **Consentimento no vínculo.** O nutricionista só vê os dados de saúde de um
   paciente depois que o paciente aceita o convite pelo aplicativo — e o paciente
   pode encerrar o acompanhamento quando quiser.
2. **Conferência do registro profissional.** Quem se cadastra como nutricionista
   só entra no painel depois que a administração confere o CRN e aprova.

Também corrigimos duas falhas de segurança encontradas nesta etapa:

- o cadastro de um paciente o vinculava automaticamente a **todos** os
  nutricionistas do sistema, que passavam a ver os dados dele;
- o servidor publicado podia devolver, para quem pedisse "esqueci a senha" com o
  e-mail de outra pessoa, o link para trocar a senha dela.

E passou a existir um limite de tentativas de login, contra quem tenta adivinhar
senhas.

**Continua valendo:** sem a conferência da seção 4, nada de paciente real.

---

## 6. Trabalho feito nesta etapa

- Importação da tabela de alimentos por planilha, e busca que entende os nomes da
  TACO ("Arroz, integral, cozido")
- Convite e consentimento do paciente no acompanhamento
- Cadastro de paciente pelo nutricionista, com o link de senha só no e-mail do
  paciente
- Aprovação e cadastro de nutricionistas pela administração
- Limite de tentativas de login e as correções de segurança da seção 5
- Gráficos, lembretes, contagem de carboidratos e humor ao lado da glicemia, que
  em julho ainda faltavam

---

## 7. Próximos passos

1. **Ambiente de demonstração.** O banco de dados gratuito do servidor expirou e
   precisa ser recriado num provedor sem prazo. É também quando o envio de e-mail
   passa a funcionar de verdade — sem ele, o link de criar senha não chega a
   ninguém.
2. **Teste num celular de verdade**: lembretes no horário, aviso de glicemia fora
   da faixa, entrada com a conta Google.
3. **Versão para instalar no Android**, para a demonstração não depender do Expo.
4. **A conferência de vocês (seção 4)** — o único item que libera o uso com
   paciente real.

---

## 8. Conclusão

O sistema **cumpre o escopo do briefing** e está pronto para ser demonstrado
assim que o ambiente voltar ao ar. O que separa a demonstração do uso real são as
definições clínicas da seção 4, que só a equipe de Nutrição pode dar.

Ficamos à disposição para apresentar o sistema funcionando.

---

*Documentação técnica, para quem for dar continuidade ao sistema:
`docs/O_QUE_FOI_FEITO.md`, `docs/REVISAO_CODIGO.md` e `README.md`.*
