ALTER TABLE conteudo_educativo
  ADD COLUMN IF NOT EXISTS publico VARCHAR(30) NOT NULL DEFAULT 'todos',
  ADD COLUMN IF NOT EXISTS agendado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS imagem_capa TEXT;

ALTER TABLE conteudo_educativo
  DROP CONSTRAINT IF EXISTS conteudo_publico_check;

ALTER TABLE conteudo_educativo
  ADD CONSTRAINT conteudo_publico_check
  CHECK (publico IN ('todos', 'pacientes_diabetes', 'adultos'));

CREATE INDEX IF NOT EXISTS idx_conteudo_agendamento
  ON conteudo_educativo(publicado, agendado_em);
