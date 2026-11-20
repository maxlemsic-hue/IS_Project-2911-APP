import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const defaults =
    'http://localhost:3000,http://localhost:4200,http://localhost:4201';
  const origins = config
    .get<string>(
      'CORS_ORIGINS',
      config.get('NODE_ENV') === 'production' ? '' : defaults,
    )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.some((o) => o === '*' || !/^https?:\/\//.test(o)))
    throw new Error('CORS_ORIGINS requires explicit HTTP(S) origins');
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(Number(config.get('PORT', 3001)));
}
void bootstrap();
