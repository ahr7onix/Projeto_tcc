import type { Pool } from 'pg';

type Executor = { query: Pool['query'] };

/**
 * Diz se o cadastro complementar do usuário já foi preenchido.
 *
 * O app do paciente escolhe entre o onboarding e a home a partir deste campo,
 * então ele precisa vir do banco: enquanto a API não devolvia nada, todo
 * paciente caía no onboarding em todo login, mesmo com os dados salvos.
 *
 * O nutricionista tem a coluna `perfil_completo`; o paciente não tem coluna
 * equivalente, então o valor é derivado dos mesmos campos que a tela de
 * onboarding preenche. O administrador não tem cadastro complementar.
 */
export async function perfilEstaCompleto(
  db: Executor,
  idUsuario: string,
  tipo: string,
): Promise<boolean> {
  if (tipo === 'paciente') {
    const result = await db.query<{ completo: boolean }>(
      `SELECT (data_nascimento IS NOT NULL
           AND genero          IS NOT NULL
           AND tipo_diabetes   IS NOT NULL
           AND peso            IS NOT NULL
           AND altura          IS NOT NULL) AS completo
       FROM paciente
       WHERE id_usuario = $1`,
      [idUsuario],
    );
    return result.rows[0]?.completo ?? false;
  }

  if (tipo === 'nutricionista') {
    const result = await db.query<{ perfil_completo: boolean }>(
      'SELECT perfil_completo FROM nutricionista WHERE id_usuario = $1',
      [idUsuario],
    );
    return result.rows[0]?.perfil_completo ?? false;
  }

  return true;
}
