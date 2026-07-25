CREATE TABLE IF NOT EXISTS nutricionista_paciente (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_vinculo_ativo_unico
    ON nutricionista_paciente(id_nutricionista, id_paciente)
    WHERE ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_vinculo_nutricionista
    ON nutricionista_paciente(id_nutricionista) WHERE ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_vinculo_paciente
    ON nutricionista_paciente(id_paciente) WHERE ativo = TRUE;

INSERT INTO nutricionista_paciente (id_nutricionista, id_paciente)
SELECT DISTINCT pa.id_nutricionista, pa.id_paciente
FROM plano_alimentar pa
ON CONFLICT DO NOTHING;
