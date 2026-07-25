CREATE TABLE IF NOT EXISTS push_token (
    id_token     BIGSERIAL    PRIMARY KEY,
    id_usuario   BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token        VARCHAR(255) NOT NULL UNIQUE,
    plataforma   VARCHAR(20),
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    usado_em     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_token_usuario ON push_token(id_usuario);
