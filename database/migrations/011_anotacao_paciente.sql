-- Migration 011 — informações complementares registradas pelo nutricionista
CREATE TABLE IF NOT EXISTS anotacao_paciente (
    id_anotacao BIGSERIAL PRIMARY KEY,
    id_paciente BIGINT NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_autor BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('limitacao', 'restricao', 'observacao', 'recomendacao', 'complementar')),
    texto TEXT NOT NULL CHECK (length(trim(texto)) >= 2),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente_criado
    ON anotacao_paciente(id_paciente, criado_em DESC);
