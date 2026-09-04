-- =====================================================================
-- Migration 015 — Quantidade consumida no registro de refeição
--
-- O registro já podia apontar para um alimento da tabela nutricional
-- (id_alimento) e guardar os macronutrientes calculados, mas não guardava
-- *quanto* foi consumido. Sem isso o registro não distingue 50 g de 200 g
-- de arroz a não ser pelo texto da descrição, e a nutricionista não
-- consegue conferir a conta que gerou os carboidratos.
--
-- Segura para rodar em banco já existente: coluna opcional, registros
-- antigos ficam com NULL.
-- =====================================================================

BEGIN;

ALTER TABLE registro_refeicao
  ADD COLUMN IF NOT EXISTS quantidade_g NUMERIC(7,2)
  CHECK (quantidade_g IS NULL OR quantidade_g > 0);

COMMIT;
