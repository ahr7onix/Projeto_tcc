# Diagramas do sistema — NutriCare

Diagramas em Mermaid, renderizáveis no GitHub ou em https://mermaid.live
para exportar como imagem e inserir na monografia.

---

## 1. Casos de uso

```mermaid
flowchart LR
    Paciente(("Paciente"))
    Nutri(("Nutricionista"))
    Admin(("Administrador"))

    subgraph Sistema["Sistema NutriCare"]
        UC01["Autenticar usuário"]
        UC02["Registrar glicemia"]
        UC03["Registrar refeição"]
        UC04["Registrar peso e medidas"]
        UC05["Consultar plano alimentar"]
        UC06["Visualizar histórico"]
        UC07["Vincular paciente"]
        UC08["Acompanhar pacientes"]
        UC09["Criar plano alimentar"]
        UC10["Emitir relatórios"]
        UC11["Visualizar alertas"]
        UC12["Trocar mensagens"]
        UC13["Gerenciar conteúdos"]
        UC14["Gerenciar usuários"]
        UC15["Consultar conteúdos"]
    end

    Paciente --- UC01
    Paciente --- UC02
    Paciente --- UC03
    Paciente --- UC04
    Paciente --- UC05
    Paciente --- UC06
    Paciente --- UC12
    Paciente --- UC15

    Nutri --- UC01
    Nutri --- UC07
    Nutri --- UC08
    Nutri --- UC09
    Nutri --- UC10
    Nutri --- UC11
    Nutri --- UC12
    Nutri --- UC13

    Admin --- UC01
    Admin --- UC13
    Admin --- UC14
```

---

## 2. Diagrama de classes

```mermaid
classDiagram
    class Usuario {
        +Long idUsuario
        +String nome
        +String email
        +String senha
        +TipoUsuario tipo
        +autenticar()
    }

    class Paciente {
        +Long idPaciente
        +Date dataNascimento
        +TipoDiabetes tipoDiabetes
        +Decimal peso
        +Decimal altura
        +String restricoesAlergias
        +calcularIMC()
    }

    class Nutricionista {
        +Long idNutricionista
        +String crn
        +String especialidade
        +Boolean perfilCompleto
    }

    class Administrador {
        +Long idAdmin
    }

    class NutricionistaPaciente {
        +Long idVinculo
        +Boolean ativo
        +DateTime criadoEm
        +DateTime encerradoEm
    }

    class PlanoAlimentar {
        +Long idPlano
        +Date dataInicio
        +Date dataFim
        +estaAtivo()
    }

    class Refeicao {
        +Long idRefeicao
        +String nomeRefeicao
        +Time horario
        +String itens
    }

    class RegistroGlicemia {
        +Long idGlicemia
        +Decimal valor
        +MomentoGlicemia momento
        +DateTime dataHora
        +String observacao
        +classificar()
    }

    class RegistroRefeicao {
        +Long idRegistro
        +String descricao
        +String tipoRefeicao
        +Decimal carboidratos
        +DateTime dataHora
    }

    class Medicamento {
        +Long idUso
        +String nomeMedicamento
        +String dosagem
        +String frequencia
    }

    class Mensagem {
        +Long idMensagem
        +String conteudo
        +DateTime lidaEm
        +DateTime criadoEm
    }

    class ConteudoEducativo {
        +Long idConteudo
        +String titulo
        +String resumo
        +String conteudo
        +String categoria
        +Boolean publicado
    }

    class Lembrete {
        +Long idLembrete
        +TipoLembrete tipo
        +DateTime dataHora
        +Boolean concluido
    }

    Usuario <|-- Paciente
    Usuario <|-- Nutricionista
    Usuario <|-- Administrador

    Nutricionista "1" -- "*" NutricionistaPaciente
    Paciente "1" -- "*" NutricionistaPaciente

    Nutricionista "1" -- "*" PlanoAlimentar : elabora
    Paciente "1" -- "*" PlanoAlimentar : recebe
    PlanoAlimentar "1" *-- "*" Refeicao

    Paciente "1" -- "*" RegistroGlicemia
    Paciente "1" -- "*" RegistroRefeicao
    Paciente "1" -- "*" Medicamento
    Paciente "1" -- "*" Lembrete

    NutricionistaPaciente "1" -- "*" Mensagem
    Usuario "1" -- "*" Mensagem : envia
    Usuario "1" -- "*" ConteudoEducativo : publica
```

---

## 3. Modelo entidade-relacionamento

```mermaid
erDiagram
    USUARIO ||--o| PACIENTE : possui
    USUARIO ||--o| NUTRICIONISTA : possui
    USUARIO ||--o| ADMINISTRADOR : possui
    USUARIO ||--o{ REFRESH_TOKEN : gera
    USUARIO ||--o{ PUSH_TOKEN : registra
    USUARIO ||--o{ MENSAGEM : envia
    USUARIO ||--o{ CONTEUDO_EDUCATIVO : publica

    NUTRICIONISTA ||--o{ NUTRICIONISTA_PACIENTE : acompanha
    PACIENTE ||--o{ NUTRICIONISTA_PACIENTE : acompanhado_por
    NUTRICIONISTA_PACIENTE ||--o{ MENSAGEM : contextualiza

    PACIENTE ||--o{ REGISTRO_GLICEMIA : registra
    PACIENTE ||--o{ REGISTRO_REFEICAO : registra
    PACIENTE ||--o{ MEDICAMENTO : utiliza
    PACIENTE ||--o{ LEMBRETE : recebe
    PACIENTE ||--o{ PLANO_ALIMENTAR : recebe
    NUTRICIONISTA ||--o{ PLANO_ALIMENTAR : elabora
    PLANO_ALIMENTAR ||--o{ REFEICAO : contem

    USUARIO {
        bigserial id_usuario PK
        varchar nome
        varchar email UK
        varchar senha
        enum tipo
        timestamptz criado_em
    }

    PACIENTE {
        bigserial id_paciente PK
        bigint id_usuario FK
        date data_nascimento
        enum tipo_diabetes
        numeric peso
        numeric altura
        text restricoes_alergias
    }

    NUTRICIONISTA {
        bigserial id_nutricionista PK
        bigint id_usuario FK
        varchar crn UK
        boolean perfil_completo
        varchar especialidade
    }

    NUTRICIONISTA_PACIENTE {
        bigserial id_vinculo PK
        bigint id_nutricionista FK
        bigint id_paciente FK
        boolean ativo
        timestamptz criado_em
        timestamptz encerrado_em
    }

    PLANO_ALIMENTAR {
        bigserial id_plano PK
        bigint id_paciente FK
        bigint id_nutricionista FK
        date data_inicio
        date data_fim
    }

    REFEICAO {
        bigserial id_refeicao PK
        bigint id_plano FK
        varchar nome_refeicao
        time horario
        text itens
    }

    REGISTRO_GLICEMIA {
        bigserial id_glicemia PK
        bigint id_paciente FK
        numeric valor
        enum momento
        timestamptz data_hora
        text observacao
    }

    REGISTRO_REFEICAO {
        bigserial id_registro PK
        bigint id_paciente FK
        text descricao
        varchar tipo_refeicao
        numeric carboidratos
        timestamptz data_hora
    }

    MENSAGEM {
        bigserial id_mensagem PK
        bigint id_vinculo FK
        bigint id_remetente FK
        text conteudo
        timestamptz lida_em
    }

    CONTEUDO_EDUCATIVO {
        bigserial id_conteudo PK
        bigint id_autor FK
        varchar titulo
        text conteudo
        varchar categoria
        boolean publicado
    }
```

---

## 4. Diagrama de sequência — Criar plano alimentar

```mermaid
sequenceDiagram
    actor N as Nutricionista
    participant W as Painel Web
    participant API as API NestJS
    participant G as RolesGuard
    participant V as VinculosService
    participant DB as PostgreSQL

    N->>W: Preenche formulário do plano
    W->>W: Valida campos obrigatórios
    W->>API: POST /planos (JWT)
    API->>G: Verifica perfil
    alt Não é nutricionista
        G-->>W: 403 Acesso negado
    else É nutricionista
        G->>API: Autorizado
        API->>V: garantirVinculo(nutri, paciente)
        V->>DB: SELECT vínculo ativo
        alt Sem vínculo
            V-->>W: 400 Paciente não vinculado
        else Com vínculo
            API->>DB: BEGIN
            API->>DB: INSERT plano_alimentar
            API->>DB: INSERT refeicoes
            API->>DB: COMMIT
            DB-->>API: Plano criado
            API-->>W: 201 + plano completo
            W-->>N: Exibe plano na listagem
        end
    end
```

---

## 5. Diagrama de sequência — Registro de glicemia com alerta

```mermaid
sequenceDiagram
    actor P as Paciente
    participant M as App Mobile
    participant API as API NestJS
    participant C as Classificador
    participant DB as PostgreSQL
    participant EX as Expo Push
    actor N as Nutricionista

    P->>M: Informa valor e momento
    M->>API: POST /registros/glicemia
    API->>DB: INSERT registro_glicemia
    API->>C: avaliarGlicemia(valor, momento)
    C-->>API: classificação + severidade
    alt Severidade crítica
        API->>DB: SELECT nutricionistas vinculados
        API->>EX: Envia push
        EX-->>N: Notificação de alerta
    end
    API-->>M: 201 + avaliação
    M-->>P: Exibe alerta com faixa de referência
```

---

## 6. Diagrama de containers

```mermaid
flowchart TB
    subgraph Usuarios["Usuários"]
        P["Paciente"]
        N["Nutricionista"]
        A["Administrador"]
    end

    subgraph Cliente["Camada de apresentação"]
        MOB["App Mobile<br/>React Native + Expo"]
        WEB["Painel Web<br/>React + Vite"]
    end

    subgraph Servidor["Camada de aplicação"]
        API["API REST<br/>NestJS + TypeScript"]
        AUTH["Autenticação<br/>JWT + bcrypt"]
        GUARD["Guards<br/>JwtAuthGuard + RolesGuard"]
    end

    subgraph Dados["Camada de dados"]
        DB[("PostgreSQL 16")]
    end

    subgraph Externos["Serviços externos"]
        GOOGLE["Google OAuth"]
        EXPO["Expo Push Notifications"]
    end

    P --> MOB
    N --> WEB
    A --> WEB
    MOB -->|HTTPS/JSON| API
    WEB -->|HTTPS/JSON| API
    API --> AUTH
    API --> GUARD
    API -->|SQL parametrizado| DB
    AUTH -.-> GOOGLE
    API -.-> EXPO
    EXPO -.-> MOB
```

---

## 7. Diagrama de componentes da API

```mermaid
flowchart LR
    subgraph API["API NestJS"]
        direction TB
        AUTH["AuthModule"]
        PAC["PacientesModule"]
        VIN["VinculosModule"]
        PLAN["PlanosModule"]
        REG["RegistrosModule"]
        ALE["AlertasModule"]
        REL["RelatoriosModule"]
        MSG["MensagensModule"]
        CON["ConteudosModule"]
        ADM["AdminModule"]
        PUSH["PushModule"]
        SAU["SaudeModule"]
        PER["PerfilModule"]
        GLI["glicemia.ts<br/>(classificação)"]
        DBM["DatabaseModule<br/>(pool pg)"]
    end

    PLAN --> VIN
    PAC --> VIN
    REL --> VIN
    REL --> GLI
    ALE --> GLI
    REG --> GLI
    REG --> PUSH
    MSG --> PUSH

    AUTH --> DBM
    PAC --> DBM
    VIN --> DBM
    PLAN --> DBM
    REG --> DBM
    ALE --> DBM
    REL --> DBM
    MSG --> DBM
    CON --> DBM
    ADM --> DBM
    PUSH --> DBM
    SAU --> DBM
    PER --> DBM
```
