-- =====================================================================
-- Projeto TCC — Schema do banco de dados (PostgreSQL)
-- Pacientes com diabetes acompanhados por nutricionistas:
-- registros de glicemia, medicamentos, planos alimentares e lembretes.
-- =====================================================================

BEGIN;

-- ---------- Tipos enumerados ----------
CREATE TYPE tipo_usuario       AS ENUM ('paciente', 'nutricionista');
CREATE TYPE genero_tipo        AS ENUM ('feminino', 'masculino', 'outro');
CREATE TYPE tipo_diabetes      AS ENUM ('tipo1', 'tipo2', 'gestacional', 'pre', 'outro');
CREATE TYPE momento_glicemia   AS ENUM ('jejum', 'pre_prandial', 'pos_prandial', 'antes_dormir', 'madrugada', 'aleatorio');
CREATE TYPE tipo_lembrete      AS ENUM ('refeicao', 'glicemia', 'medicamento', 'outro');

-- ---------- Tabela: usuario ----------
CREATE TABLE usuario (
    id_usuario   BIGSERIAL    PRIMARY KEY,
    nome         VARCHAR(120) NOT NULL,
    email        VARCHAR(160) NOT NULL UNIQUE,
    senha        VARCHAR(255) NOT NULL,                  -- hash bcrypt/argon2
    tipo         tipo_usuario NOT NULL,
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Tabela: paciente ----------
CREATE TABLE paciente (
    id_paciente              BIGSERIAL      PRIMARY KEY,
    id_usuario               BIGINT         NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    data_nascimento          DATE,
    genero                   genero_tipo,
    tipo_diabetes            tipo_diabetes,
    restricoes_alergias      TEXT,                         -- texto livre, ex: "lactose, amendoim"
    peso                     NUMERIC(5,2),                 -- kg, ex: 72.50
    altura                   NUMERIC(4,2),                 -- m,  ex: 1.74
    criado_em                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ---------- Tabela: nutricionista ----------
CREATE TABLE nutricionista (
    id_nutricionista BIGSERIAL    PRIMARY KEY,
    id_usuario       BIGINT       NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    crn              VARCHAR(20)  NOT NULL UNIQUE,         -- registro profissional
    especialidade    VARCHAR(120),
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

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

-- ---------- Tabela: medicamento (uso de medicamento) ----------
CREATE TABLE medicamento (
    id_uso            BIGSERIAL    PRIMARY KEY,
    id_paciente       BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    nome_medicamento  VARCHAR(160) NOT NULL,
    dosagem           VARCHAR(80)  NOT NULL,                -- ex: "10 UI", "500 mg"
    frequencia        VARCHAR(80)  NOT NULL,                -- ex: "8 em 8h"
    horario_inicial   TIME         NOT NULL,
    ativo             BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_medicamento_paciente ON medicamento(id_paciente);

-- ---------- Tabela: plano_alimentar ----------
CREATE TABLE plano_alimentar (
    id_plano         BIGSERIAL    PRIMARY KEY,
    id_paciente      BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_nutricionista BIGINT       NOT NULL
        REFERENCES nutricionista(id_nutricionista) ON DELETE RESTRICT,
    data_inicio      DATE         NOT NULL,
    data_fim         DATE,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);
CREATE INDEX idx_plano_paciente ON plano_alimentar(id_paciente);

-- ---------- Tabela: refeicao ----------
CREATE TABLE refeicao (
    id_refeicao   BIGSERIAL    PRIMARY KEY,
    id_plano      BIGINT       NOT NULL
        REFERENCES plano_alimentar(id_plano) ON DELETE CASCADE,
    nome_refeicao VARCHAR(80)  NOT NULL,    -- ex: "café da manhã", "almoço"
    horario       TIME         NOT NULL,
    itens         TEXT         NOT NULL     -- ex: "1 fruta, 2 fatias de pão integral, 1 ovo"
);
CREATE INDEX idx_refeicao_plano ON refeicao(id_plano);

-- ---------- Tabela: lembrete ----------
-- Um lembrete pode estar ligado a uma refeição, a um medicamento, ou ser
-- um lembrete de medir glicemia. As FKs são opcionais e mutuamente
-- exclusivas conforme o tipo_lembrete.
CREATE TABLE lembrete (
    id_lembrete   BIGSERIAL      PRIMARY KEY,
    id_paciente   BIGINT         NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    tipo_lembrete tipo_lembrete  NOT NULL,
    id_refeicao   BIGINT         REFERENCES refeicao(id_refeicao)            ON DELETE CASCADE,
    id_glicemia   BIGINT         REFERENCES registro_glicemia(id_glicemia)   ON DELETE CASCADE,
    id_uso        BIGINT         REFERENCES medicamento(id_uso)              ON DELETE CASCADE,
    descricao     TEXT,
    data_hora     TIMESTAMPTZ    NOT NULL,
    concluido     BOOLEAN        NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    -- Garante que a FK preenchida seja coerente com o tipo do lembrete
    CHECK (
        (tipo_lembrete = 'refeicao'    AND id_refeicao IS NOT NULL AND id_glicemia IS NULL AND id_uso IS NULL) OR
        (tipo_lembrete = 'glicemia'    AND id_glicemia IS NOT NULL AND id_refeicao IS NULL AND id_uso IS NULL) OR
        (tipo_lembrete = 'medicamento' AND id_uso       IS NOT NULL AND id_refeicao IS NULL AND id_glicemia IS NULL) OR
        (tipo_lembrete = 'outro'       AND id_refeicao IS NULL AND id_glicemia IS NULL AND id_uso IS NULL)
    )
);
CREATE INDEX idx_lembrete_paciente_data ON lembrete(id_paciente, data_hora);
CREATE INDEX idx_lembrete_pendente      ON lembrete(id_paciente, concluido) WHERE concluido = FALSE;

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

COMMIT;
