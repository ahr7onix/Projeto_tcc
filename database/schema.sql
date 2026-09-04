-- =====================================================================
-- Projeto TCC — Schema do banco de dados (PostgreSQL)
-- Pacientes com diabetes acompanhados por nutricionistas:
-- registros de glicemia, medicamentos, planos alimentares e lembretes.
-- =====================================================================

BEGIN;

-- ---------- Tipos enumerados ----------
CREATE TYPE tipo_usuario       AS ENUM ('paciente', 'nutricionista', 'administrador');
CREATE TYPE genero_tipo        AS ENUM ('feminino', 'masculino', 'outro');
CREATE TYPE tipo_diabetes      AS ENUM ('tipo1', 'tipo2', 'gestacional', 'pre', 'outro');
CREATE TYPE momento_glicemia   AS ENUM ('jejum', 'pre_prandial', 'pos_prandial', 'antes_dormir', 'madrugada', 'aleatorio');
CREATE TYPE tipo_lembrete      AS ENUM ('refeicao', 'glicemia', 'medicamento', 'outro');
CREATE TYPE estado_emocional   AS ENUM ('muito_bem', 'bem', 'neutro', 'mal', 'muito_mal');
CREATE TYPE nivel_atividade    AS ENUM ('sedentario', 'leve', 'moderado', 'intenso', 'muito_intenso');

-- ---------- Tabela: usuario ----------
CREATE TABLE usuario (
    id_usuario   BIGSERIAL    PRIMARY KEY,
    nome         VARCHAR(120) NOT NULL,
    email        VARCHAR(160) NOT NULL UNIQUE,
    senha        VARCHAR(255) NOT NULL,                  -- hash bcrypt/argon2
    tipo         tipo_usuario NOT NULL,
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    desativado_em TIMESTAMPTZ                            -- NULL = conta ativa (soft delete)
);

CREATE INDEX idx_usuario_ativo ON usuario(id_usuario) WHERE desativado_em IS NULL;

-- ---------- Tabela: paciente ----------
CREATE TABLE paciente (
    id_paciente              BIGSERIAL      PRIMARY KEY,
    id_usuario               BIGINT         NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    data_nascimento          DATE,
    genero                   genero_tipo,
    tipo_diabetes            tipo_diabetes,
    restricoes_alergias      TEXT,                         -- texto livre, ex: "lactose, amendoim"
    peso                     NUMERIC(5,2),                 -- kg, ex: 72.50 (última medição)
    altura                   NUMERIC(4,2),                 -- m,  ex: 1.74
    nivel_atividade          nivel_atividade,              -- entra no cálculo do VET
    criado_em                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ---------- Tabela: nutricionista ----------
CREATE TABLE nutricionista (
    id_nutricionista BIGSERIAL    PRIMARY KEY,
    id_usuario       BIGINT       NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    crn              VARCHAR(20)  UNIQUE,                  -- registro profissional, preenchido no onboarding
    perfil_completo  BOOLEAN      NOT NULL DEFAULT FALSE,
    especialidade    VARCHAR(120),
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- Tabela: nutricionista_paciente ----------
-- Vínculo profissional. Um paciente pode ser acompanhado por mais de um
-- nutricionista ao longo do tempo; apenas um vínculo ativo por par.
CREATE TABLE nutricionista_paciente (
    id_vinculo       BIGSERIAL   PRIMARY KEY,
    id_nutricionista BIGINT      NOT NULL
        REFERENCES nutricionista(id_nutricionista) ON DELETE CASCADE,
    id_paciente      BIGINT      NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    ativo            BOOLEAN     NOT NULL DEFAULT TRUE,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    encerrado_em     TIMESTAMPTZ,
    CHECK (encerrado_em IS NULL OR encerrado_em >= criado_em)
);
CREATE UNIQUE INDEX idx_vinculo_ativo_unico
    ON nutricionista_paciente(id_nutricionista, id_paciente) WHERE ativo = TRUE;
CREATE INDEX idx_vinculo_nutricionista
    ON nutricionista_paciente(id_nutricionista) WHERE ativo = TRUE;
CREATE INDEX idx_vinculo_paciente
    ON nutricionista_paciente(id_paciente) WHERE ativo = TRUE;

-- ---------- Tabela: mensagem ----------
-- Conversa entre nutricionista e paciente, presa ao vinculo entre os dois.
-- Faltava aqui: como o preparar-banco.mjs marca as migrations como aplicadas
-- quando cria o banco pelo schema.sql, um banco novo nascia sem esta tabela e
-- todo /mensagens respondia 500. Espelha migrations/003_mensagem.sql.
CREATE TABLE mensagem (
    id_mensagem   BIGSERIAL   PRIMARY KEY,
    id_vinculo    BIGINT      NOT NULL
        REFERENCES nutricionista_paciente(id_vinculo) ON DELETE CASCADE,
    id_remetente  BIGINT      NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    conteudo      TEXT        NOT NULL CHECK (length(trim(conteudo)) > 0),
    lida_em       TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mensagem_vinculo
    ON mensagem(id_vinculo, criado_em DESC);
CREATE INDEX idx_mensagem_nao_lida
    ON mensagem(id_vinculo, id_remetente) WHERE lida_em IS NULL;

-- ---------- Tabela: administrador ----------
CREATE TABLE administrador (
    id_admin    BIGSERIAL   PRIMARY KEY,
    id_usuario  BIGINT      NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Tabela: conteudo_educativo ----------
CREATE TABLE conteudo_educativo (
    id_conteudo   BIGSERIAL    PRIMARY KEY,
    id_autor      BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    titulo        VARCHAR(160) NOT NULL CHECK (length(trim(titulo)) > 0),
    resumo        VARCHAR(300),
    conteudo      TEXT         NOT NULL CHECK (length(trim(conteudo)) > 0),
    categoria     VARCHAR(60)  NOT NULL DEFAULT 'geral',
    publicado     BOOLEAN      NOT NULL DEFAULT FALSE,
    -- O nome da restricao e o mesmo da migration 012 de proposito: e assim que
    -- o verificar-schema.mjs reconhece as duas como a mesma coisa.
    publico       VARCHAR(30)  NOT NULL DEFAULT 'todos'
        CONSTRAINT conteudo_publico_check
        CHECK (publico IN ('todos', 'pacientes_diabetes', 'adultos')),
    agendado_em   TIMESTAMPTZ,
    imagem_capa   TEXT,
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conteudo_publicado ON conteudo_educativo(publicado, criado_em DESC);
CREATE INDEX idx_conteudo_categoria ON conteudo_educativo(categoria) WHERE publicado = TRUE;
CREATE INDEX idx_conteudo_agendamento ON conteudo_educativo(publicado, agendado_em);

-- ---------- Tabela: push_token ----------
CREATE TABLE push_token (
    id_usuario   BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_token     BIGSERIAL    PRIMARY KEY,
    token        VARCHAR(255) NOT NULL UNIQUE,
    plataforma   VARCHAR(20),
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    usado_em     TIMESTAMPTZ
);
CREATE INDEX idx_push_token_usuario ON push_token(id_usuario);

-- ---------- Tabela: alimento ----------
-- Tabela nutricional de referência (TACO, IBGE ou cadastro manual).
-- Os valores são sempre relativos a `porcao_g` gramas — padrão 100 g.
CREATE TABLE alimento (
    id_alimento      BIGSERIAL     PRIMARY KEY,
    nome             VARCHAR(160)  NOT NULL CHECK (length(trim(nome)) > 0),
    grupo            VARCHAR(60)   NOT NULL DEFAULT 'outros',
    medida_caseira   VARCHAR(80),                    -- ex: "1 fatia média"
    medida_caseira_g NUMERIC(7,2),                   -- quantos gramas tem essa medida
    porcao_g         NUMERIC(7,2)  NOT NULL DEFAULT 100 CHECK (porcao_g > 0),
    kcal             NUMERIC(7,2)  NOT NULL CHECK (kcal >= 0),
    carboidratos_g   NUMERIC(7,2)  NOT NULL CHECK (carboidratos_g >= 0),
    proteinas_g      NUMERIC(7,2)  NOT NULL CHECK (proteinas_g >= 0),
    lipidios_g       NUMERIC(7,2)  NOT NULL CHECK (lipidios_g >= 0),
    fibras_g         NUMERIC(7,2)  CHECK (fibras_g IS NULL OR fibras_g >= 0),
    indice_glicemico SMALLINT      CHECK (indice_glicemico IS NULL
                                          OR indice_glicemico BETWEEN 0 AND 150),
    fonte            VARCHAR(80)   NOT NULL DEFAULT 'manual',
    id_autor         BIGINT        REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    ativo            BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_alimento_nome_fonte ON alimento (lower(trim(nome)), fonte);
CREATE INDEX idx_alimento_grupo ON alimento (grupo) WHERE ativo = TRUE;

-- ---------- Tabela: receita ----------
CREATE TABLE receita (
    id_receita          BIGSERIAL    PRIMARY KEY,
    id_autor            BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    titulo              VARCHAR(160) NOT NULL CHECK (length(trim(titulo)) > 0),
    resumo              VARCHAR(300),
    ingredientes        TEXT         NOT NULL CHECK (length(trim(ingredientes)) > 0),
    modo_preparo        TEXT         NOT NULL CHECK (length(trim(modo_preparo)) > 0),
    porcoes             SMALLINT     CHECK (porcoes IS NULL OR porcoes > 0),
    tempo_preparo_min   SMALLINT     CHECK (tempo_preparo_min IS NULL OR tempo_preparo_min > 0),
    kcal_porcao         NUMERIC(7,2),
    carboidratos_porcao NUMERIC(7,2),
    proteinas_porcao    NUMERIC(7,2),
    lipidios_porcao     NUMERIC(7,2),
    categoria           VARCHAR(60)  NOT NULL DEFAULT 'geral',
    publicado           BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_receita_publicada ON receita(publicado, criado_em DESC);

-- ---------- Tabela: notificacao ----------
-- O push_token guarda para onde enviar; esta tabela guarda o que foi enviado.
CREATE TABLE notificacao (
    id_notificacao BIGSERIAL    PRIMARY KEY,
    id_usuario     BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo           VARCHAR(40)  NOT NULL,   -- alerta_glicemia, lembrete, conteudo, sistema
    titulo         VARCHAR(160) NOT NULL,
    mensagem       TEXT         NOT NULL,
    lida           BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notificacao_usuario  ON notificacao(id_usuario, criado_em DESC);
CREATE INDEX idx_notificacao_nao_lida ON notificacao(id_usuario) WHERE lida = FALSE;

-- ---------- Tabela: refresh_token ----------
-- Sessões ativas para rotação de access tokens (login mobile).
-- Armazenamos apenas o hash SHA-256 do token; o valor cru fica só no client.
CREATE TABLE refresh_token (
    id_token       BIGSERIAL    PRIMARY KEY,
    id_usuario     BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash     CHAR(64)     NOT NULL UNIQUE,             -- SHA-256 em hex
    user_agent     VARCHAR(255),                              -- opcional: identifica device
    ip_origem      INET,                                      -- opcional: IP de emissão
    expira_em      TIMESTAMPTZ  NOT NULL,
    revogado_em    TIMESTAMPTZ,                               -- preenchido em logout / rotação
    substituto_id  BIGINT       REFERENCES refresh_token(id_token) ON DELETE SET NULL,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_token_usuario ON refresh_token(id_usuario);
CREATE INDEX idx_refresh_token_ativos  ON refresh_token(id_usuario, expira_em)
    WHERE revogado_em IS NULL;

-- ---------- Tabela: registro_glicemia ----------
CREATE TABLE registro_glicemia (
    id_glicemia  BIGSERIAL          PRIMARY KEY,
    id_paciente  BIGINT             NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    valor        NUMERIC(5,1)       NOT NULL CHECK (valor > 0 AND valor < 1000),  -- mg/dL
    data_hora    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    momento      momento_glicemia   NOT NULL,
    observacao   TEXT
);
CREATE INDEX idx_glicemia_paciente_data ON registro_glicemia(id_paciente, data_hora DESC);

-- ---------- Tabela: registro_refeicao (log diário de refeições) ----------
CREATE TABLE registro_refeicao (
    id_registro   BIGSERIAL    PRIMARY KEY,
    id_paciente   BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    descricao     TEXT         NOT NULL,
    tipo_refeicao VARCHAR(40)  NOT NULL,   -- cafe, almoco, lanche, jantar, ceia
    carboidratos  NUMERIC(6,1),
    proteinas     NUMERIC(6,1),
    lipidios      NUMERIC(6,1),
    kcal          NUMERIC(7,1),
    id_alimento   BIGINT       REFERENCES alimento(id_alimento) ON DELETE SET NULL,
    observacao    TEXT,
    data_hora     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reg_refeicao_paciente_data ON registro_refeicao(id_paciente, data_hora DESC);

-- ---------- Tabela: registro_antropometrico ----------
-- Histórico de medidas. O IMC é coluna gerada, então nunca fica
-- dessincronizado de peso e altura.
CREATE TABLE registro_antropometrico (
    id_antropometria BIGSERIAL    PRIMARY KEY,
    id_paciente      BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_autor         BIGINT       REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    data_medicao     DATE         NOT NULL DEFAULT CURRENT_DATE,
    peso             NUMERIC(5,2) CHECK (peso IS NULL OR (peso > 0 AND peso < 400)),
    altura           NUMERIC(4,2) CHECK (altura IS NULL OR (altura > 0.5 AND altura < 2.6)),
    imc              NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN peso IS NOT NULL AND altura IS NOT NULL AND altura > 0
             THEN round(peso / (altura * altura), 2) END
    ) STORED,
    circ_cintura     NUMERIC(5,1) CHECK (circ_cintura     IS NULL OR circ_cintura     > 0),
    circ_quadril     NUMERIC(5,1) CHECK (circ_quadril     IS NULL OR circ_quadril     > 0),
    circ_braco       NUMERIC(5,1) CHECK (circ_braco       IS NULL OR circ_braco       > 0),
    circ_panturrilha NUMERIC(5,1) CHECK (circ_panturrilha IS NULL OR circ_panturrilha > 0),
    circ_pescoco     NUMERIC(5,1) CHECK (circ_pescoco     IS NULL OR circ_pescoco     > 0),
    observacao       TEXT,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (peso IS NOT NULL OR altura IS NOT NULL OR circ_cintura IS NOT NULL
           OR circ_quadril IS NOT NULL OR circ_braco IS NOT NULL
           OR circ_panturrilha IS NOT NULL OR circ_pescoco IS NOT NULL)
);
CREATE INDEX idx_antropometria_paciente
    ON registro_antropometrico(id_paciente, data_medicao DESC);

-- ---------- Tabela: registro_emocional ----------
-- Escala de 5 pontos + fatores em texto livre. O formato definitivo cabe à
-- equipe de Nutrição validar.
CREATE TABLE registro_emocional (
    id_emocional BIGSERIAL        PRIMARY KEY,
    id_paciente  BIGINT           NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    data_hora    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    estado       estado_emocional NOT NULL,
    intensidade  SMALLINT         CHECK (intensidade IS NULL
                                         OR intensidade BETWEEN 1 AND 5),
    fatores      TEXT,                       -- ex: "noite mal dormida, trabalho"
    observacao   TEXT
);
CREATE INDEX idx_emocional_paciente_data
    ON registro_emocional(id_paciente, data_hora DESC);

-- ---------- Tabela: medicamento (uso de medicamento) ----------
CREATE TABLE medicamento (
    id_uso            BIGSERIAL    PRIMARY KEY,
    id_paciente       BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    nome_medicamento  VARCHAR(160) NOT NULL,
    dosagem           VARCHAR(80)  NOT NULL,                -- ex: "10 UI", "500 mg"
    frequencia        VARCHAR(80)  NOT NULL,                -- ex: "8 em 8h"
    horario_inicial   TIME         NOT NULL,
    observacoes       TEXT,
    ativo             BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_medicamento_paciente ON medicamento(id_paciente);

-- ---------- Tabela: restricao_alimentar ----------
-- Lista estruturada de restrições/alergias do paciente (adicionar, editar e
-- remover itens individualmente). Complementa (não substitui) o campo livre
-- paciente.restricoes_alergias, usado em relatórios e na visão da nutricionista.
CREATE TABLE restricao_alimentar (
    id_restricao BIGSERIAL    PRIMARY KEY,
    id_paciente  BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    descricao    VARCHAR(160) NOT NULL CHECK (length(trim(descricao)) > 0),
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_restricao_paciente ON restricao_alimentar(id_paciente);

-- ---------- Tabela: anotacao_paciente ----------
-- Informações complementares registradas pelo profissional no acompanhamento.
CREATE TABLE anotacao_paciente (
    id_anotacao BIGSERIAL PRIMARY KEY,
    id_paciente BIGINT NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_autor BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('limitacao', 'restricao', 'observacao', 'recomendacao', 'complementar')),
    texto TEXT NOT NULL CHECK (length(trim(texto)) >= 2),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_anotacao_paciente_criado ON anotacao_paciente(id_paciente, criado_em DESC);

-- ---------- Tabela: plano_alimentar ----------
CREATE TABLE plano_alimentar (
    id_plano         BIGSERIAL    PRIMARY KEY,
    id_paciente      BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_nutricionista BIGINT       NOT NULL
        REFERENCES nutricionista(id_nutricionista) ON DELETE RESTRICT,
    data_inicio      DATE         NOT NULL,
    data_fim         DATE,
    -- Necessidade energética e distribuição de macronutrientes.
    -- Ficam gravados no plano porque variam por paciente e por conduta.
    vet_kcal          NUMERIC(7,1),
    formula_vet       VARCHAR(40),          -- mifflin_st_jeor, harris_benedict, manual
    fator_atividade   NUMERIC(3,2),
    perc_carboidratos NUMERIC(4,1),
    perc_proteinas    NUMERIC(4,1),
    perc_lipidios     NUMERIC(4,1),
    observacoes       TEXT,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    CONSTRAINT chk_plano_macros_100 CHECK (
        (perc_carboidratos IS NULL AND perc_proteinas IS NULL AND perc_lipidios IS NULL)
        OR (perc_carboidratos IS NOT NULL AND perc_proteinas IS NOT NULL
            AND perc_lipidios IS NOT NULL
            AND round(perc_carboidratos + perc_proteinas + perc_lipidios) = 100)
    )
);
CREATE INDEX idx_plano_paciente ON plano_alimentar(id_paciente);

-- ---------- Tabela: refeicao ----------
CREATE TABLE refeicao (
    id_refeicao   BIGSERIAL    PRIMARY KEY,
    id_plano      BIGINT       NOT NULL
        REFERENCES plano_alimentar(id_plano) ON DELETE CASCADE,
    nome_refeicao VARCHAR(80)  NOT NULL,    -- ex: "café da manhã", "almoço"
    horario       TIME         NOT NULL,
    itens         TEXT                      -- descrição legível: "1 fruta, 1 ovo"
);
CREATE INDEX idx_refeicao_plano ON refeicao(id_plano);

-- ---------- Tabela: refeicao_item ----------
-- Itens estruturados da refeição prescrita. São eles que permitem somar
-- calorias e macronutrientes; `refeicao.itens` continua como texto legível.
CREATE TABLE refeicao_item (
    id_item      BIGSERIAL     PRIMARY KEY,
    id_refeicao  BIGINT        NOT NULL
        REFERENCES refeicao(id_refeicao) ON DELETE CASCADE,
    id_alimento  BIGINT        REFERENCES alimento(id_alimento) ON DELETE RESTRICT,
    descricao    VARCHAR(160),              -- usado quando não vem da tabela
    quantidade_g NUMERIC(7,2)  NOT NULL CHECK (quantidade_g > 0),
    CHECK (id_alimento IS NOT NULL OR descricao IS NOT NULL)
);
CREATE INDEX idx_refeicao_item_refeicao ON refeicao_item(id_refeicao);

-- ---------- Tabela: lembrete ----------
-- Um lembrete pode ser avulso (`data_hora`) ou recorrente (`hora` +
-- `dias_semana`). As FKs para refeição, glicemia e medicamento são
-- opcionais: servem para ligar o lembrete a algo já cadastrado, e o
-- lembrete de medir glicemia por definição não aponta para medição alguma.
CREATE TABLE lembrete (
    id_lembrete   BIGSERIAL      PRIMARY KEY,
    id_paciente   BIGINT         NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    tipo_lembrete tipo_lembrete  NOT NULL,
    id_refeicao   BIGINT         REFERENCES refeicao(id_refeicao)            ON DELETE CASCADE,
    id_glicemia   BIGINT         REFERENCES registro_glicemia(id_glicemia)   ON DELETE CASCADE,
    id_uso        BIGINT         REFERENCES medicamento(id_uso)              ON DELETE CASCADE,
    titulo        VARCHAR(120),
    descricao     TEXT,
    data_hora     TIMESTAMPTZ,                     -- lembrete avulso
    hora          TIME,                            -- lembrete recorrente
    dias_semana   SMALLINT[],                      -- 0 = domingo ... 6 = sábado
    recorrente    BOOLEAN        NOT NULL DEFAULT FALSE,
    ativo         BOOLEAN        NOT NULL DEFAULT TRUE,
    concluido     BOOLEAN        NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    -- A FK preenchida precisa ser coerente com o tipo do lembrete
    CONSTRAINT chk_lembrete_vinculo CHECK (
        (tipo_lembrete = 'refeicao'    AND id_glicemia IS NULL AND id_uso IS NULL) OR
        (tipo_lembrete = 'glicemia'    AND id_refeicao IS NULL AND id_uso IS NULL) OR
        (tipo_lembrete = 'medicamento' AND id_refeicao IS NULL AND id_glicemia IS NULL) OR
        (tipo_lembrete = 'outro'       AND id_refeicao IS NULL AND id_glicemia IS NULL
                                       AND id_uso IS NULL)
    ),
    CONSTRAINT chk_lembrete_quando CHECK (
        (recorrente = TRUE  AND hora      IS NOT NULL) OR
        (recorrente = FALSE AND data_hora IS NOT NULL)
    )
);
CREATE INDEX idx_lembrete_paciente_data ON lembrete(id_paciente, data_hora);
CREATE INDEX idx_lembrete_pendente      ON lembrete(id_paciente, concluido) WHERE concluido = FALSE;
CREATE INDEX idx_lembrete_ativo         ON lembrete(id_paciente, hora)
    WHERE ativo = TRUE AND recorrente = TRUE;

-- ---------- Trigger para manter atualizado_em ----------
CREATE OR REPLACE FUNCTION trg_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usuario_set_atualizado_em
    BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

CREATE TRIGGER paciente_set_atualizado_em
    BEFORE UPDATE ON paciente
    FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

CREATE TRIGGER nutricionista_set_atualizado_em
    BEFORE UPDATE ON nutricionista
    FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

CREATE TRIGGER alimento_set_atualizado_em
    BEFORE UPDATE ON alimento
    FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

CREATE TRIGGER receita_set_atualizado_em
    BEFORE UPDATE ON receita
    FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

-- ---------- Tabela: senha_reset_token ----------
CREATE TABLE senha_reset_token (
    id_token     BIGSERIAL    PRIMARY KEY,
    id_usuario   BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash   CHAR(64)     NOT NULL UNIQUE,
    expira_em    TIMESTAMPTZ  NOT NULL,
    usado_em     TIMESTAMPTZ,
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_senha_reset_usuario
    ON senha_reset_token(id_usuario);
CREATE INDEX idx_senha_reset_validos
    ON senha_reset_token(token_hash)
    WHERE usado_em IS NULL;

COMMIT;
