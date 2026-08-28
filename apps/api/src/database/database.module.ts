import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

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
        return new Pool({
          connectionString,
          max: 10,
          ssl: resolverSsl(config, connectionString),
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor() {}
  async onModuleDestroy() {}
}
