-- Cria a tabela `mensagem` nos bancos que nasceram sem ela.
--
-- Por que existe: o schema.sql nao tinha esta tabela, e o preparar-banco.mjs
-- marca todas as migrations como aplicadas quando cria o banco pelo schema.sql.
-- Resultado: em todo banco novo a 003_mensagem.sql nunca rodava, a tabela nao
-- existia e qualquer chamada a /mensagens (inclusive o contador de nao lidas da
-- tela inicial) respondia 500.
--
-- O schema.sql ja foi corrigido, entao bancos novos criam a tabela direto e
-- nunca chegam a rodar este arquivo. Aqui e so para os bancos que ja existem.
-- E o mesmo conteudo da 003, com IF NOT EXISTS: quem ja tem a tabela nao muda.

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

-- Mesma historia da 012: o indice de agendamento de conteudo tambem so existia
-- na migration, nunca no schema.sql. Recria onde faltar.
CREATE INDEX IF NOT EXISTS idx_conteudo_agendamento
  ON conteudo_educativo(publicado, agendado_em);
