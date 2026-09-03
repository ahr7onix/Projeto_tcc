import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/logging/all-exceptions.filter';
import { logger } from './common/logging/logger.service';
import { HealthService } from './modules/health/health.service';

async function bootstrap() {
  // O logger da aplicação é também o do Nest: avisos do framework e da API
  // saem no mesmo formato e vão para o mesmo arquivo.
  const app = await NestFactory.create(AppModule, { cors: false, logger });
  const config = app.get(ConfigService);

  // CORS_ORIGIN aceita uma lista separada por vírgula, porque em produção o
  // painel web e o app ficam em endereços diferentes da API.
  // `*` junto com `credentials: true` é recusado pelos navegadores; nesse caso
  // usamos `true`, que devolve a própria origem de quem chamou.
  const origens = (config.get<string>('CORS_ORIGIN', '*') ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origens.length === 0 || origens.includes('*') ? true : origens,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Última barreira: nenhum erro inesperado chega ao cliente com stack trace.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Sem isto o Nest ignora SIGTERM/SIGINT e nenhum `onModuleDestroy` /
  // `onApplicationShutdown` roda: o pool do Postgres ficava com as conexões
  // abertas e a fila do monitoramento perdia o último lote no deploy.
  app.enableShutdownHooks();

  const port = Number(config.get<string>('PORT', '3000'));
  // Servidores gerenciados (Render, Railway) só enxergam a aplicação se ela
  // escutar em 0.0.0.0, e não apenas no localhost do container.
  const host = config.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);

  const banco = await app.get(HealthService).verificarBanco();
  const endereco = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;

  logger.escrever('INFO', '[NutriCare API] ✓ API iniciada');
  logger.escrever(
    banco === 'connected' ? 'INFO' : 'ERROR',
    `[NutriCare API] ${banco === 'connected' ? '✓ Database conectado' : '✗ Database indisponível'}`,
  );
  logger.escrever('INFO', '[NutriCare API] ✓ Realtime iniciado (SSE /mensagens/stream)');
  logger.escrever('INFO', '[NutriCare API] ✓ Rotas carregadas');
  logger.escrever('INFO', `[NutriCare API] API .... ${endereco}`);
  logger.escrever('INFO', `[NutriCare API] Health . ${endereco}/health`);
}

bootstrap().catch((err) => {
  logger.escrever('FATAL', `Falha ao iniciar a API: ${(err as Error)?.name ?? 'Error'}`);
  if (logger.desenvolvimento) {
    logger.escrever('DEBUG', String((err as Error)?.stack ?? err));
  }
  process.exit(1);
});
