import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rejectNonJsonBody, verifyOrigin } from './csrf.middleware';

export const applyMiddlewares = (
  app: NestExpressApplication,
  allowedOrigins: string[],
) => {
  app.use(
    helmet(),
    cookieParser(),
    verifyOrigin(allowedOrigins),
    rejectNonJsonBody,
  );
  app.useBodyParser('json');
};
