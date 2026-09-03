import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpLoggerMiddleware } from './common/logging/http-logger.middleware';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnotacoesModule } from './modules/anotacoes/anotacoes.module';
import { AlertasModule } from './modules/alertas/alertas.module';
import { AlimentosModule } from './modules/alimentos/alimentos.module';
import { AntropometriaModule } from './modules/antropometria/antropometria.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConteudosModule } from './modules/conteudos/conteudos.module';
import { EmocionalModule } from './modules/emocional/emocional.module';
import { HealthModule } from './modules/health/health.module';
import { LembretesModule } from './modules/lembretes/lembretes.module';
import { MedicamentosModule } from './modules/medicamentos/medicamentos.module';
import { MensagensModule } from './modules/mensagens/mensagens.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { NutricionalModule } from './modules/nutricional/nutricional.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { PlanosModule } from './modules/planos/planos.module';
import { PushModule } from './modules/push/push.module';
import { ReceitasModule } from './modules/receitas/receitas.module';
import { RegistrosModule } from './modules/registros/registros.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { RestricoesModule } from './modules/restricoes/restricoes.module';
import { SaudeModule } from './modules/saude/saude.module';
import { StatusModule } from './modules/status/status.module';
import { VinculosModule } from './modules/vinculos/vinculos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MonitoringModule,
    HealthModule,
    StatusModule,
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
    AnotacoesModule,
    PushModule,
    // Módulos do briefing de nutrição (migration 007)
    AlimentosModule,
    ReceitasModule,
    AntropometriaModule,
    EmocionalModule,
    LembretesModule,
    MedicamentosModule,
    NutricionalModule,
    NotificacoesModule,
    RestricoesModule,
  ],
  providers: [HttpLoggerMiddleware],
})
export class AppModule implements NestModule {
  /**
   * Uma linha de log por requisição, para toda rota. Em middleware, e não em
   * interceptor, porque assim também caem no log as respostas que nunca chegam
   * a um controller — 404 e falha de validação, entre elas.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
