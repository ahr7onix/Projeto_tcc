-- =====================================================================
-- Migration 009 — Restrições alimentares como lista estruturada
--
-- Até aqui, restrições/alergias do paciente eram um único campo de texto
-- livre (paciente.restricoes_alergias). Esta migration adiciona uma tabela
-- para permitir adicionar, editar e remover restrições individualmente,
-- sem remover o campo livre (que continua usado em relatórios e na visão
-- da nutricionista).
--
-- Segura para rodar em banco já existente.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS restricao_alimentar (
    id_restricao BIGSERIAL    PRIMARY KEY,
    id_paciente  BIGINT       NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    descricao    VARCHAR(160) NOT NULL CHECK (length(trim(descricao)) > 0),
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restricao_paciente
    ON restricao_alimentar(id_paciente);

COMMIT;
