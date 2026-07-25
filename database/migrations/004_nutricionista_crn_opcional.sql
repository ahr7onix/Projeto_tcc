ALTER TABLE nutricionista ALTER COLUMN crn DROP NOT NULL;

ALTER TABLE nutricionista ADD COLUMN IF NOT EXISTS perfil_completo BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE nutricionista SET perfil_completo = TRUE WHERE crn IS NOT NULL;

INSERT INTO nutricionista (id_usuario, crn, perfil_completo)
SELECT u.id_usuario, NULL, FALSE
  FROM usuario u
 WHERE u.tipo = 'nutricionista'
   AND NOT EXISTS (SELECT 1 FROM nutricionista n WHERE n.id_usuario = u.id_usuario);
