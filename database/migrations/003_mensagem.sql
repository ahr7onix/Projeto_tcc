CREATE TABLE IF NOT EXISTS mensagem (
    id_mensagem   BIGSERIAL   PRIMARY KEY,
    id_vinculo    BIGINT      NOT NULL
        REFERENCES nutricionista_paciente(id_vinculo) ON DELETE CASCADE,
    id_remetente  BIGINT      NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    conteudo      TEXT        NOT NULL CHECK (length(trim(conteudo)) > 0),
    lida_em       TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagem_vinculo
    ON mensagem(id_vinculo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_mensagem_nao_lida
    ON mensagem(id_vinculo, id_remetente) WHERE lida_em IS NULL;
