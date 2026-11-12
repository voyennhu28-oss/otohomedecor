import { NestFactory } from '@nestjs/core';

import { initApp } from './init';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = initApp(await NestFactory.create(AppModule));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
