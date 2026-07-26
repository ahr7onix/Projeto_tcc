// Conferência rápida do banco local: tabelas esperadas e contagem de linhas.
import pg from 'pg';

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://tcc:tcc@127.0.0.1:5433/tcc',
});
await client.connect();

const { rows: tabelas } = await client.query(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`,
);
console.log('TABELAS: ' + tabelas.map((t) => t.table_name).join(', '));

for (const t of tabelas) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM "${t.table_name}"`,
  );
  console.log('  ' + t.table_name.padEnd(28) + rows[0].n);
}

const { rows: imc } = await client.query(
  `SELECT column_name, is_generated FROM information_schema.columns
    WHERE table_name = 'registro_antropometrico' ORDER BY ordinal_position`,
);
console.log('\nregistro_antropometrico: ' +
  imc.map((c) => c.column_name + (c.is_generated === 'ALWAYS' ? '*' : '')).join(', '));

await client.end();
