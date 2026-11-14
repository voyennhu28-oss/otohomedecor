import { cleanupOpenApiDoc } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication, NestApplicationOptions } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { applyMiddlewares } from './common/middlewares/common.middleware';
import { parseOrigins } from './common/middlewares/csrf.middleware';

const removeFieldsAndRelations = (document: any) => {
  const otherFields = ['id', 'userID'];
  const auditFields = new Set([
    ...otherFields,
    'createdAt',
    'updatedAt',
    'createdBy',
    'deletedAt',
  ]);

  const schemas = document?.components?.schemas;
  if (!schemas) return document;

  for (const schema of Object.values<any>(schemas)) {
    const props = schema.properties;
    if (!props) continue;

    const newProps: Record<string, any> = {};
    for (const [propName, prop] of Object.entries<any>(props)) {
      if (auditFields.has(propName) || propName === 'data') continue;

      const isRelation = prop?.type === 'object';
      if (!isRelation) {
        newProps[propName] = prop;
        continue;
      }

      if (!propName.endsWith('s')) {
        newProps[`${propName}ID`] = { type: 'string' };
      }
    }

    schema.properties = newProps;

    auditFields.forEach((k) => delete schema.properties[k]);

    const schemaRequired = schema.required;
    if (Array.isArray(schemaRequired)) {
      schema.required = schemaRequired.filter(
        (field) => !auditFields.has(field) && field !== 'data',
      );
    }
  }

  return document;
};

const initOpenAPI = (app: INestApplication) => {
  const { APP_NAME, APP_PREFIX = '' } = process.env;
  let openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(`${APP_NAME} API`)
      .setDescription(`${APP_NAME} API description`)
      .setVersion('1.0.0')
      .build(),
  );

  openApiDoc = removeFieldsAndRelations(openApiDoc);
  SwaggerModule.setup(APP_PREFIX, app, cleanupOpenApiDoc(openApiDoc));
};

/**
 * - bodyParser: false → tắt parser mặc định (có urlencoded); `applyMiddlewares` chỉ bật lại parser JSON
 * - rawBody: true → giữ body gốc ở `req.rawBody` để kiểm tra chữ ký HMAC của webhook SePay
 */
const NEST_APP_OPTIONS = { bodyParser: false, rawBody: true } satisfies NestApplicationOptions;

const initApp = (app: NestExpressApplication) => {
  const { APP_PREFIX = '/api', FE_URL = 'http://localhost:3000', TRUST_PROXY = '0' } = process.env;
  // Sau reverse proxy (Render, Railway, Nginx): tin X-Forwarded-For của N proxy gần nhất để req.ip
  // là IP thật của khách (rate limit theo IP). KHÔNG bật khi không có proxy: client sẽ giả được IP.
  const proxyHops = Number(TRUST_PROXY);
  if (proxyHops > 0) app.set('trust proxy', proxyHops);
  // FE_URL có thể chứa nhiều địa chỉ, cách nhau bằng dấu phẩy
  const allowedOrigins = parseOrigins(FE_URL);
  app.setGlobalPrefix(APP_PREFIX);
  // Auth dùng cookie nên phải bật credentials, và khi đó origin KHÔNG được là '*'.
  app.enableCors({ origin: allowedOrigins, credentials: true });
  applyMiddlewares(app, allowedOrigins);
  initOpenAPI(app);
  app.enableShutdownHooks();
  return app;
};
export { initApp, NEST_APP_OPTIONS };
