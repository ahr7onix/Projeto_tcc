-- Migração 001: tabela de registros simples de refeição (log diário do paciente)
CREATE TABLE IF NOT EXISTS registro_refeicao (
    id_registro   BIGSERIAL    PRIMARY KEY,
    id_paciente   BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    descricao     TEXT         NOT NULL,
    tipo_refeicao VARCHAR(40)  NOT NULL,   -- cafe, almoco, lanche, jantar, ceia
    carboidratos  NUMERIC(6,1),            -- g, opcional
    observacao    TEXT,
    data_hora     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_refeicao_paciente_data
    ON registro_refeicao(id_paciente, data_hora DESC);
