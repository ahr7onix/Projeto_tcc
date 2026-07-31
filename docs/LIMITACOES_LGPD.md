# Limitações de conformidade — LGPD

Documento de registro das limitações conhecidas do NutriCare no tratamento de
dados pessoais sensíveis. Serve de base para a seção de **Limitações do
trabalho** da monografia e para a defesa na banca.

Referência legal: **Lei nº 13.709/2018 (LGPD)**, em especial os artigos 5º, 9º,
11 e 18. Nenhum parecer jurídico foi obtido; a análise abaixo é dos autores do
trabalho.

---

## 1. Vínculo entre nutricionista e paciente sem consentimento

### O que o sistema faz hoje

O nutricionista cria o vínculo sozinho, informando o id do paciente:

```
POST /vinculos   { "pacienteId": "..." }
```

`VinculosService.vincular` ([vinculos.service.ts:120](../apps/api/src/modules/vinculos/vinculos.service.ts#L120))
confere se o nutricionista existe, se o paciente existe e se já não há vínculo
ativo — e insere. **Não há nenhuma etapa de aprovação do paciente.** A tabela
`nutricionista_paciente` só tem a coluna `ativo`, que distingue vínculo vigente
de vínculo encerrado, não vínculo aceito de vínculo pendente.

A partir do vínculo ativo, o nutricionista passa a ler glicemias, peso e
medidas, registros alimentares, registros emocionais, planos e relatórios do
paciente, e a trocar mensagens com ele. O paciente é notificado apenas
indiretamente: o nutricionista aparece nas telas do app.

O paciente também **não tem como recusar ou encerrar o vínculo pelo app** —
`DELETE /vinculos/:pacienteId` é restrito ao papel `nutricionista`
([vinculos.controller.ts:22](../apps/api/src/modules/vinculos/vinculos.controller.ts#L22)).

### Por que isso é uma limitação

Dado de saúde é **dado pessoal sensível** (art. 5º, II). O art. 11 admite o
tratamento em duas situações relevantes aqui:

- **inciso I** — consentimento do titular, de forma **específica e destacada**,
  para finalidades específicas;
- **inciso II, alínea "f"** — tutela da saúde, em procedimento realizado por
  profissionais de saúde ou serviços de saúde.

Um serviço de acompanhamento nutricional se apoia na alínea "f", mas o que a
dispensa de consentimento cobre é o tratamento **dentro de um atendimento que
já existe**. O sistema, hoje, não guarda nenhuma evidência de que o atendimento
foi acordado com o paciente: qualquer nutricionista cadastrado alcança qualquer
paciente cadastrado. Falta o registro do aceite — que é justamente o que
demonstraria conformidade, tanto pelo inciso I quanto pela alínea "f".

Some-se a isso o art. 9º (o titular tem direito a saber com quem seus dados são
compartilhados) e o art. 18 (direitos de acesso, oposição e eliminação): sem
tela de aceite e sem botão de encerrar, o paciente não exerce oposição pelo
próprio aplicativo.

### Risco prático

Baixo no ambiente do TCC, **desde que a regra abaixo seja mantida**, e alto em
uso real:

> O ambiente publicado (Render) contém **somente dados fictícios**. Nenhum dado
> de paciente real foi ou deve ser cadastrado enquanto o consentimento não
> estiver implementado.

Em uso real com pacientes da ADJ Birigui, a falha permitiria que um profissional
visse o histórico clínico de alguém que nunca o autorizou — exposição de dado
sensível, com o agravante de ser silenciosa.

### Correção proposta (trabalho futuro)

Transformar o vínculo em um convite com aceite:

1. Coluna `status` em `nutricionista_paciente`
   (`pendente` / `aceito` / `recusado`), com `criado_em`, `respondido_em` e o
   índice único de vínculo ativo passando a considerar o status.
2. `POST /vinculos` cria o vínculo em `pendente` e dispara notificação push ao
   paciente.
3. Endpoints novos no app do paciente: listar convites, `aceitar`, `recusar` e
   encerrar vínculo já aceito.
4. `existeVinculo` e `garantirVinculo` passam a exigir `status = 'aceito'`.
   Como **todo acesso a dado de paciente já passa por esses dois métodos**
   ([vinculos.service.ts:34](../apps/api/src/modules/vinculos/vinculos.service.ts#L34)),
   a mudança fecha o acesso no sistema inteiro em um só ponto — planos,
   relatórios, mensagens, alertas e registros incluídos.
5. Texto de consentimento específico e destacado na tela de aceite, informando
   quais dados o nutricionista passará a ver, e registro da data do aceite.

O custo estimado é pequeno justamente porque a autorização já está centralizada.
A opção por não implementar agora foi de escopo e prazo, não de dificuldade
técnica.

---

## 2. CRN aceito sem validação

### O que o sistema faz hoje

No cadastro, o CRN é texto livre e **opcional** (migration `004`), sem conferência
de formato ou de existência do registro
([cadastro.dto.ts](../apps/api/src/modules/auth/dto/cadastro.dto.ts)). Qualquer
pessoa pode se cadastrar como nutricionista.

### Por que isso é uma limitação

O art. 11, II, "f" condiciona a dispensa de consentimento a que o tratamento
seja feito **por profissionais de saúde**. Sem validar o registro profissional,
o sistema não consegue sustentar essa condição — e a falha se combina com a do
item 1: conta falsa de nutricionista + vínculo sem aceite = acesso a dados de
saúde de terceiros.

### Correção proposta

Não existe API pública do CFN/CRN para consulta automatizada, então a mitigação
realista é **aprovação manual pelo administrador**: o cadastro de nutricionista
nasce inativo e o administrador confere o registro na consulta pública do
conselho antes de liberar. O painel de administrador já existe no sistema; falta
condicionar o login do nutricionista à liberação.

---

## 3. Outras observações de tratamento de dados

- **Retenção.** Não há política de expurgo. Registros de glicemia, alimentação e
  emocional ficam indefinidamente. O art. 16 pede eliminação após o fim da
  finalidade; um `DELETE` de conta com remoção em cascata cobriria o caso
  (as chaves estrangeiras já usam `ON DELETE CASCADE`).
- **Exportação.** O relatório em CSV
  ([relatorios.service.ts](../apps/api/src/modules/relatorios/relatorios.service.ts))
  atende parcialmente o direito de portabilidade (art. 18, V), mas é gerado pelo
  nutricionista ou pelo paciente sobre um período — não é uma exportação
  completa da conta.
- **Registro de acessos.** Não há log de quem leu o quê. Auditoria de acesso a
  dado sensível é boa prática e ajudaria a demonstrar conformidade.
- **Ambiente publicado.** Somente dados fictícios, conforme registrado acima. A
  string de conexão do banco é tratada como senha e não circula em documento
  compartilhado.

---

## Como isso entra na monografia

Sugestão de encaixe, na seção de limitações:

> O NutriCare implementa o vínculo entre nutricionista e paciente como uma ação
> unilateral do profissional. Embora o tratamento de dados de saúde por
> profissional de saúde encontre amparo no art. 11, II, "f", da Lei nº
> 13.709/2018, o sistema não registra o aceite do paciente, o que impede
> demonstrar que o acompanhamento foi por ele autorizado. Pelo mesmo motivo, e
> por não haver validação do registro profissional (CRN), o ambiente publicado
> foi operado exclusivamente com dados fictícios. O aceite do vínculo pelo
> paciente é apontado como trabalho futuro, com implementação concentrada no
> serviço de vínculos, por onde já passam todas as autorizações de acesso a
> dados de paciente.
