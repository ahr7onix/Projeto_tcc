import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { RegistrosModule } from './modules/registros/registros.module';
import { SaudeModule } from './modules/saude/saude.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    PacientesModule,
    RegistrosModule,
    PerfilModule,
    SaudeModule,
  ],
})
export class AppModule {}
