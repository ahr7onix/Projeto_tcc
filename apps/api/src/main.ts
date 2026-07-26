import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
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

  const port = Number(config.get<string>('PORT', '3000'));
  // Servidores gerenciados (Render, Railway) só enxergam a aplicação se ela
  // escutar em 0.0.0.0, e não apenas no localhost do container.
  const host = config.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on ${host}:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] fatal:', err);
  process.exit(1);
});
