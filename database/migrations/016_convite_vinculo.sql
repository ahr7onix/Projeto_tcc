-- =====================================================================
-- Migration 016 — Convite de vínculo com aceite do paciente
--
-- O nutricionista não cria mais o vínculo sozinho: envia um convite e o
-- paciente aceita ou recusa. O vínculo (nutricionista_paciente) só nasce no
-- aceite. Idempotente: segura para rodar em banco que já existe.
-- =====================================================================
CREATE TABLE IF NOT EXISTS convite_vinculo (
    id_convite       BIGSERIAL   PRIMARY KEY,
    id_nutricionista BIGINT      NOT NULL
        REFERENCES nutricionista(id_nutricionista) ON DELETE CASCADE,
    id_paciente      BIGINT      NOT NULL
        REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    status           VARCHAR(12) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'aceito', 'recusado', 'cancelado')),
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    respondido_em    TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_convite_pendente_unico
    ON convite_vinculo(id_nutricionista, id_paciente) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_convite_paciente
    ON convite_vinculo(id_paciente) WHERE status = 'pendente';
