// Utilitário de desenvolvimento: aplica arquivos .sql no banco local.
// Existe porque nem toda máquina do time tem o psql.exe instalado.
//   node aplicar-sql.mjs ../../database/migrations/007_briefing_nutricao.sql
import { readFileSync } from 'node:fs';
import pg from 'pg';

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) {
  console.error('uso: node aplicar-sql.mjs <arquivo.sql> [outro.sql ...]');
  process.exit(1);
}

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://tcc:tcc@127.0.0.1:5433/tcc',
});

await client.connect();
for (const arquivo of arquivos) {
  try {
    await client.query(readFileSync(arquivo, 'utf8'));
    console.log('OK   ' + arquivo);
  } catch (erro) {
    console.error('ERRO ' + arquivo + ': ' + erro.message);
    process.exitCode = 1;
    break;
  }
}
await client.end();
