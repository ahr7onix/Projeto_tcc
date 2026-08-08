-- Token de redefinição de senha (esqueci-senha).
-- Um usuário pode ter vários tokens; só o não usado e ainda válido vale.

CREATE TABLE IF NOT EXISTS senha_reset_token (
    id_token     BIGSERIAL    PRIMARY KEY,
    id_usuario   BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash   CHAR(64)     NOT NULL UNIQUE,           -- sha256 hex do token bruto
    expira_em    TIMESTAMPTZ  NOT NULL,
    usado_em     TIMESTAMPTZ,
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_senha_reset_usuario
    ON senha_reset_token(id_usuario);

CREATE INDEX IF NOT EXISTS idx_senha_reset_validos
    ON senha_reset_token(token_hash)
    WHERE usado_em IS NULL;
