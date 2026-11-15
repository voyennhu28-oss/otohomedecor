import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import type { Env } from './common/envs/validate.env';
import { initApp, NEST_APP_OPTIONS } from './init';
import { LoggerModule } from './logger/logger.module';

async function bootstrap() {
  const app = initApp(
    await NestFactory.create<NestExpressApplication>(AppModule, {
      ...NEST_APP_OPTIONS,
      logger: LoggerModule.createLogger(),
    }),
  );
  // Giá trị đã qua validate.env.ts (có sẵn mặc định), không khai báo lại mặc định ở đây
  const config = app.get(ConfigService);
  const port = config.getOrThrow<Env['PORT']>('PORT');
  const host = config.getOrThrow<Env['HOST']>('HOST');
  const prefix = config.getOrThrow<Env['APP_PREFIX']>('APP_PREFIX');
  const protocol =
    config.get<Env['NODE_ENV']>('NODE_ENV') === 'production' ? 'https' : 'http';

  await app.listen(port);
  Logger.log(
    `Service is running at ${protocol}://${host}:${port}${prefix}`,
    config.get<Env['APP_NAME']>('APP_NAME'),
  );
}
void bootstrap();
