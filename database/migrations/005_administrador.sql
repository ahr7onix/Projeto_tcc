ALTER TYPE tipo_usuario ADD VALUE IF NOT EXISTS 'administrador';

CREATE TABLE IF NOT EXISTS administrador (
    id_admin    BIGSERIAL   PRIMARY KEY,
    id_usuario  BIGINT      NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conteudo_educativo (
    id_conteudo BIGSERIAL    PRIMARY KEY,
    id_autor    BIGINT       NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    titulo      VARCHAR(160) NOT NULL CHECK (length(trim(titulo)) > 0),
    resumo      VARCHAR(300),
    conteudo    TEXT         NOT NULL CHECK (length(trim(conteudo)) > 0),
    categoria   VARCHAR(60)  NOT NULL DEFAULT 'geral',
    publicado   BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conteudo_publicado
    ON conteudo_educativo(publicado, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_conteudo_categoria
    ON conteudo_educativo(categoria) WHERE publicado = TRUE;
