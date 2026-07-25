import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AlertasModule } from './modules/alertas/alertas.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConteudosModule } from './modules/conteudos/conteudos.module';
import { MensagensModule } from './modules/mensagens/mensagens.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { PlanosModule } from './modules/planos/planos.module';
import { PushModule } from './modules/push/push.module';
import { RegistrosModule } from './modules/registros/registros.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { SaudeModule } from './modules/saude/saude.module';
import { VinculosModule } from './modules/vinculos/vinculos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    PacientesModule,
    RegistrosModule,
    PerfilModule,
    SaudeModule,
    PlanosModule,
    VinculosModule,
    AlertasModule,
    RelatoriosModule,
    MensagensModule,
    ConteudosModule,
    AdminModule,
    PushModule,
  ],
})
export class AppModule {}
