import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { logger } from '../common/logging/logger.service';

export const PG_POOL = 'PG_POOL';

type ConfigSsl = false | { rejectUnauthorized: boolean };

/**
 * Bancos gerenciados (Neon, Render, Supabase) só aceitam conexão criptografada.
 * O PostgreSQL local de desenvolvimento não tem certificado e recusa SSL.
 *
 * DATABASE_SSL aceita:
 *   vazio       -> decide sozinho: liga fora de localhost
 *   true / 1    -> liga com verificação do certificado
 *   no-verify   -> liga sem verificar o certificado (provedores com certificado próprio)
 *   false / 0   -> desliga
 */
function resolverSsl(config: ConfigService, connectionString: string): ConfigSsl {
  const modo = (config.get<string>('DATABASE_SSL') ?? '').trim().toLowerCase();

  if (modo === 'true' || modo === '1' || modo === 'on') {
    return { rejectUnauthorized: true };
  }

  // Render, Heroku e afins servem certificado proprio: exigir a verificacao da
  // cadeia derruba a conexao antes do primeiro SELECT.
  if (modo === 'no-verify') {
    return { rejectUnauthorized: false };
  }

  if (modo === 'false' || modo === '0' || modo === 'off') {
    return false;
  }

  const local = /@(localhost|127\.0\.0\.1|\[::1\]|db|postgres)[:/]/.test(connectionString);
  return local ? false : { rejectUnauthorized: true };
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL not set');
        }
        const pool = new Pool({
          connectionString,
          max: 10,
          ssl: resolverSsl(config, connectionString),
        });

        /**
         * Sem este listener o processo inteiro morre.
         *
         * Quando o Postgres encerra uma conexao que estava ociosa no pool
         * (restart do banco, failover, manutencao do provedor, um
         * `pg_terminate_backend`), o `pg` emite `error` no pool. `error` sem
         * ouvinte e um evento especial do Node: vira excecao nao tratada e
         * derruba a API. Reproduzido: derrubar as conexoes ociosas matava o
         * processo, e nenhuma requisicao voltava mais.
         *
         * Aqui so registramos: o `pg` ja descarta o cliente quebrado sozinho e
         * a proxima requisicao abre uma conexao nova. Nao ha erro escondido —
         * a falha continua aparecendo no log em nivel ERROR.
         */
        pool.on('error', (erro) => {
          logger.escrever('ERROR', 'postgres: conexao ociosa caiu, o pool vai reabrir', {
            tipo: (erro as Error)?.name ?? 'Error',
            // `mensagem` esta na lista de redacao (conteudo de chat), entao o
            // texto do erro do Postgres sairia como [REDACTED] e o log nao
            // serviria para nada. `causa` passa limpo.
            causa: (erro as Error)?.message,
          });
        });

        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Fecha as conexoes do pool no encerramento. Sem isto o processo do Node
   * ficava preso com sockets abertos ate o gerenciador matar por timeout, e o
   * Postgres so liberava as sessoes depois.
   *
   * Depende de `app.enableShutdownHooks()` no main.ts.
   */
  async onModuleDestroy() {
    await this.pool.end();
  }
}
