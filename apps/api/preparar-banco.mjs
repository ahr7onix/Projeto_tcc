// Prepara o banco de dados para uso — pode ser executado quantas vezes for
// preciso, que ele só aplica o que ainda falta.
//
//   node preparar-banco.mjs                (a partir de apps/api)
//   node apps/api/preparar-banco.mjs       (a partir da raiz do projeto)
//
// Variáveis usadas:
//   DATABASE_URL   endereço do banco (obrigatória)
//   DATABASE_SSL   igual à da API: vazio decide sozinho, "no-verify" aceita
//                  certificado próprio do provedor
//   SEED_DEMO      "true" carrega os usuários e registros fictícios de
//                  demonstração (Dra. Camila, João, Maria)
//
// Por que este arquivo existe: o schema.sql cria tudo de uma vez e não tem
// "IF NOT EXISTS" em lugar nenhum, então rodá-lo duas vezes dá erro. Aqui a
// gente anota numa tabela de controle o que já foi aplicado.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(AQUI, '..', '..', 'database');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERRO: falta a variável DATABASE_URL.');
  process.exit(1);
}

function resolverSsl() {
  const modo = (process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (['false', '0', 'off'].includes(modo)) return false;
  if (['true', '1', 'on'].includes(modo)) return { rejectUnauthorized: true };
  const local = /@(localhost|127\.0\.0\.1|\[::1\]|db|postgres)[:/]/.test(connectionString);
  return local ? false : { rejectUnauthorized: true };
}

const client = new pg.Client({ connectionString, ssl: resolverSsl() });

function ler(...partes) {
  return readFileSync(join(DB_DIR, ...partes), 'utf8');
}

async function jaAplicado(nome) {
  const r = await client.query('SELECT 1 FROM migracao_aplicada WHERE nome = $1', [nome]);
  return r.rowCount > 0;
}

async function registrar(nome) {
  await client.query(
    'INSERT INTO migracao_aplicada (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING',
    [nome],
  );
}

/** Aplica o arquivo só se ele ainda não tiver sido aplicado. */
async function aplicarUmaVez(nome, caminhoRelativo) {
  if (await jaAplicado(nome)) {
    console.log(`  pular   ${nome} (já aplicado)`);
    return;
  }
  await client.query(ler(...caminhoRelativo));
  await registrar(nome);
  console.log(`  aplicar ${nome}`);
}

async function main() {
  await client.connect();
  console.log('Conectado ao banco.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS migracao_aplicada (
      nome         TEXT PRIMARY KEY,
      aplicada_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrations = existsSync(join(DB_DIR, 'migrations'))
    ? readdirSync(join(DB_DIR, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
    : [];

  const bancoJaTemTabelas = (
    await client.query("SELECT to_regclass('public.usuario') AS t")
  ).rows[0].t !== null;

  if (!bancoJaTemTabelas) {
    console.log('Banco vazio — criando a estrutura a partir do schema.sql.');
    await client.query(ler('schema.sql'));
    await registrar('schema.sql');
    // O schema.sql já nasce com tudo o que as migrations fazem, então elas
    // ficam marcadas como aplicadas sem rodar de novo.
    for (const m of migrations) await registrar(`migrations/${m}`);
    console.log(`  estrutura criada (${migrations.length} migrations marcadas)`);
  } else {
    if (!(await jaAplicado('schema.sql'))) {
      // Banco criado por outro caminho (docker-compose, psql na mão).
      // Não dá para saber quais migrations já rodaram, então só registramos a
      // estrutura e seguimos — nada é reaplicado por cima.
      await registrar('schema.sql');
      for (const m of migrations) await registrar(`migrations/${m}`);
      console.log('Banco já existia — controle de migrations inicializado sem alterar nada.');
    }
    console.log('Estrutura já existe — aplicando apenas o que estiver pendente.');
    for (const m of migrations) {
      await aplicarUmaVez(`migrations/${m}`, ['migrations', m]);
    }
  }

  console.log('Dados iniciais:');
  // O seed do admin tem ON CONFLICT, então pode rodar sempre sem duplicar.
  await client.query(ler('seeds_admin.sql'));
  console.log('  ok      seeds_admin.sql (administrador inicial)');

  await aplicarUmaVez('seeds_alimentos.sql', ['seeds_alimentos.sql']);

  if ((process.env.SEED_DEMO ?? '').trim().toLowerCase() === 'true') {
    await aplicarUmaVez('seeds.sql', ['seeds.sql']);
  } else {
    console.log('  pular   seeds.sql (defina SEED_DEMO=true para carregar os dados fictícios)');
  }

  console.log('\nBanco pronto.');
}

main()
  .catch((erro) => {
    console.error('\nERRO ao preparar o banco:', erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
