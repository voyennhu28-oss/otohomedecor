import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { initApp, NEST_APP_OPTIONS } from './init';
import { LoggerModule } from './logger/logger.module';

async function bootstrap() {
  const app = initApp(
    await NestFactory.create<NestExpressApplication>(AppModule, {
      ...NEST_APP_OPTIONS,
      logger: LoggerModule.createLogger(),
    }),
  );
  const {
    PORT = 5000,
    HOST = 'localhost',
    APP_PREFIX = '/api',
    APP_NAME = 'home_decor',
    NODE_ENV = 'development',
  } = process.env;

  await app.listen(PORT);
  const protocol = NODE_ENV === 'production' ? 'https' : 'http';
  Logger.log(
    `Service is running at ${protocol}://${HOST}:${PORT}${APP_PREFIX}`,
    APP_NAME,
  );
}
void bootstrap();
