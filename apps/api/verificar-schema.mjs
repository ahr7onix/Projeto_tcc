// Verifica se o schema.sql esta em dia com as migrations.
//
//   node verificar-schema.mjs                 (a partir de apps/api)
//   node apps/api/verificar-schema.mjs        (a partir da raiz do projeto)
//   npm run db:verificar                      (script da raiz)
//
// Variaveis usadas:
//   DATABASE_URL   endereco de um servidor PostgreSQL onde da para criar
//                  bancos descartaveis. O nome do banco na URL e ignorado.
//                  Padrao: o postgres do docker-compose deste repositorio.
//   DATABASE_SSL   igual a da API: vazio decide sozinho, "no-verify" aceita
//                  certificado proprio do provedor
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A estrutura do banco tem duas fontes de verdade que precisam ser mantidas
// em sincronia a mao:
//
//   database/schema.sql        o retrato completo, aplicado em banco vazio
//   database/migrations/*.sql  os deltas, aplicados em banco que ja existe
//
// Nada no repositorio obrigava as duas a concordarem, e elas ja divergiram em
// producao: a tabela `mensagem` entrou so na migration 003 e nunca no
// schema.sql. Todo banco novo nascia sem ela e qualquer chamada a /mensagens
// respondia 500 — inclusive o contador de nao lidas da tela inicial. A
// migration 014 existe unicamente para remendar isso, repetindo a 003 palavra
// por palavra. Nada impedia a proxima divergencia.
//
// COMO A VERIFICACAO FUNCIONA
//
// Cria dois bancos descartaveis no mesmo servidor e compara a estrutura:
//
//   banco A   so o schema.sql                  (o que o retrato promete)
//   banco B   schema.sql + todas as migrations (o que o preparar-banco.mjs
//                                               produz num banco novo)
//
// Como as migrations sao idempotentes e so acrescentam, B nunca perde nada de
// A. Entao qualquer diferenca significa uma coisa so: o schema.sql esta atras
// das migrations. E exatamente a classe de bug da `mensagem`, pega antes do
// merge em vez de em producao.
//
// A comparacao le os catalogos do proprio PostgreSQL (pg_constraint,
// pg_indexes, format_type), e nao o texto dos arquivos .sql. O banco ja
// normaliza tudo — `VARCHAR(160)` e `character varying(160)` viram a mesma
// coisa —, entao diferenca de escrita entre os dois arquivos nao vira alarme
// falso, e mudanca real e pega mesmo escrita de outro jeito.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(AQUI, '..', '..', 'database');

const URL_SERVIDOR =
  process.env.DATABASE_URL ?? 'postgres://tcc:tcc@127.0.0.1:5433/tcc';

// Sufixo com o pid: duas execucoes ao mesmo tempo (dois jobs de CI, duas
// pessoas na mesma maquina) nao brigam pelo mesmo nome de banco.
const SUFIXO = `${process.pid}_${Date.now().toString(36)}`;
const BANCO_A = `drift_schema_${SUFIXO}`;
const BANCO_B = `drift_migrations_${SUFIXO}`;

/** Troca o nome do banco na URL, preservando usuario, senha, host e opcoes. */
function urlDoBanco(nome) {
  const url = new URL(URL_SERVIDOR);
  url.pathname = `/${nome}`;
  return url.toString();
}

// Mesmos modos do database.module.ts e do preparar-banco.mjs.
function resolverSsl() {
  const modo = (process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (['true', '1', 'on'].includes(modo)) return { rejectUnauthorized: true };
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (['false', '0', 'off'].includes(modo)) return false;
  const local = /@(localhost|127\.0\.0\.1|\[::1\]|db|postgres)[:/]/.test(URL_SERVIDOR);
  return local ? false : { rejectUnauthorized: true };
}

function ler(...partes) {
  return readFileSync(join(DB_DIR, ...partes), 'utf8');
}

function listarMigrations() {
  const dir = join(DB_DIR, 'migrations');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function conectar(nomeDoBanco) {
  const client = new pg.Client({
    connectionString: urlDoBanco(nomeDoBanco),
    ssl: resolverSsl(),
  });
  await client.connect();
  return client;
}

// ---------------------------------------------------------------------------
// Leitura da estrutura
// ---------------------------------------------------------------------------

/**
 * As colunas saem ordenadas por NOME, e nao por posicao na tabela.
 *
 * A ordem fisica difere entre os dois caminhos por construcao: o schema.sql
 * declara as colunas juntas, e um `ALTER TABLE ADD COLUMN` sempre gruda a
 * coluna no fim. As duas tabelas sao equivalentes; comparar por posicao
 * acusaria diferenca em toda tabela que qualquer migration tenha tocado.
 */
const CONSULTAS = {
  'tipo enum': `
    SELECT t.typname AS chave,
           string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS definicao
      FROM pg_type t
      JOIN pg_enum e      ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
     GROUP BY t.typname`,

  coluna: `
    SELECT c.relname || '.' || a.attname AS chave,
           format_type(a.atttypid, a.atttypmod)
             || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END
             || COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')
             || CASE WHEN a.attgenerated = 's' THEN ' GENERATED' ELSE '' END
             || CASE WHEN a.attidentity <> '' THEN ' IDENTITY' ELSE '' END
             AS definicao
      FROM pg_attribute a
      JOIN pg_class c        ON c.oid = a.attrelid
      JOIN pg_namespace n    ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND a.attnum > 0
       AND NOT a.attisdropped`,

  // pg_get_constraintdef devolve o texto canonico do proprio banco, entao
  // chave primaria, unique, foreign key (com ON DELETE) e check saem todas
  // aqui, ja normalizadas.
  restricao: `
    SELECT c.relname || '.' || con.conname AS chave,
           pg_get_constraintdef(con.oid) AS definicao
      FROM pg_constraint con
      JOIN pg_class c     ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'`,

  indice: `
    SELECT tablename || '.' || indexname AS chave,
           indexdef AS definicao
      FROM pg_indexes
     WHERE schemaname = 'public'`,
};

/** Devolve { coluna: Map(chave -> definicao), ... } para um banco. */
async function lerEstrutura(client) {
  const estrutura = {};
  for (const [especie, sql] of Object.entries(CONSULTAS)) {
    const { rows } = await client.query(sql);
    estrutura[especie] = new Map(rows.map((r) => [r.chave, r.definicao]));
  }
  return estrutura;
}

// ---------------------------------------------------------------------------
// Comparacao
// ---------------------------------------------------------------------------

/** Compara as duas estruturas e devolve a lista de divergencias. */
function comparar(estruturaA, estruturaB) {
  const divergencias = [];

  for (const especie of Object.keys(CONSULTAS)) {
    const a = estruturaA[especie];
    const b = estruturaB[especie];

    for (const [chave, definicaoB] of b) {
      if (!a.has(chave)) {
        divergencias.push({ especie, chave, tipo: 'faltando', definicaoB });
      } else if (a.get(chave) !== definicaoB) {
        divergencias.push({
          especie,
          chave,
          tipo: 'diferente',
          definicaoA: a.get(chave),
          definicaoB,
        });
      }
    }

    // O caso oposto nao deveria acontecer — as migrations so acrescentam —,
    // mas se acontecer e porque alguma delas apaga o que o schema.sql cria, e
    // isso precisa aparecer em vez de passar batido.
    for (const chave of a.keys()) {
      if (!b.has(chave)) {
        divergencias.push({
          especie,
          chave,
          tipo: 'sobrando',
          definicaoA: a.get(chave),
        });
      }
    }
  }

  return divergencias;
}

function relatar(divergencias) {
  const atrasadas = divergencias.filter((d) => d.tipo !== 'sobrando');
  const sobrando = divergencias.filter((d) => d.tipo === 'sobrando');

  if (atrasadas.length > 0) {
    console.error('\nO schema.sql esta atras das migrations:\n');
    for (const d of atrasadas) {
      console.error(`  [${d.especie}] ${d.chave}`);
      if (d.tipo === 'faltando') {
        console.error(`      so existe depois das migrations: ${d.definicaoB}`);
      } else {
        console.error(`      no schema.sql:         ${d.definicaoA}`);
        console.error(`      depois das migrations: ${d.definicaoB}`);
      }
    }
  }

  if (sobrando.length > 0) {
    console.error('\nAlguma migration apaga o que o schema.sql cria:\n');
    for (const d of sobrando) {
      console.error(`  [${d.especie}] ${d.chave}`);
      console.error(`      so existe no schema.sql: ${d.definicaoA}`);
    }
  }

  console.error(
    '\nBanco novo e banco antigo nao ficam com a mesma estrutura.\n' +
      'Leve para o database/schema.sql o que as migrations acrescentam — e\n' +
      'mantenha a migration onde esta: os bancos que ja existem dependem dela.\n',
  );
}

// ---------------------------------------------------------------------------

async function main() {
  const migrations = listarMigrations();

  const admin = await conectar('postgres');
  let codigoDeSaida = 0;

  try {
    // Sem template0 o banco novo herda o que estiver no template1 da maquina,
    // e a comparacao passaria a depender do ambiente de quem roda.
    await admin.query(`CREATE DATABASE ${BANCO_A} TEMPLATE template0`);
    await admin.query(`CREATE DATABASE ${BANCO_B} TEMPLATE template0`);

    const a = await conectar(BANCO_A);
    const b = await conectar(BANCO_B);

    try {
      console.log('Banco A: schema.sql');
      await a.query(ler('schema.sql'));

      console.log(`Banco B: schema.sql + ${migrations.length} migrations`);
      await b.query(ler('schema.sql'));
      for (const m of migrations) {
        await b.query(ler('migrations', m));
      }

      const divergencias = comparar(await lerEstrutura(a), await lerEstrutura(b));

      if (divergencias.length === 0) {
        console.log('\nOK: o schema.sql produz a mesma estrutura das migrations.');
      } else {
        relatar(divergencias);
        codigoDeSaida = 1;
      }
    } finally {
      await a.end().catch(() => {});
      await b.end().catch(() => {});
    }
  } finally {
    // Derruba as sessoes que sobraram antes do DROP: o Postgres recusa apagar
    // um banco que ainda tem conexao aberta, e o proprio pg pode demorar a
    // fechar a dele.
    for (const banco of [BANCO_A, BANCO_B]) {
      await admin
        .query(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()`,
          [banco],
        )
        .catch(() => {});
      await admin.query(`DROP DATABASE IF EXISTS ${banco}`).catch((erro) => {
        console.error(`aviso: nao consegui apagar ${banco}: ${erro.message}`);
      });
    }
    await admin.end().catch(() => {});
  }

  process.exitCode = codigoDeSaida;
}

main().catch((erro) => {
  console.error('\nERRO ao verificar o schema:', erro.message);
  process.exitCode = 1;
});
