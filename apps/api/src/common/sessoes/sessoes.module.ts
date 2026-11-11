import { Global, Module } from '@nestjs/common';
import { SessoesService } from './sessoes.service';

/** Global porque o `JwtAuthGuard`, que depende dele, é usado em quase todo módulo. */
@Global()
@Module({
  providers: [SessoesService],
  exports: [SessoesService],
})
export class SessoesModule {}
