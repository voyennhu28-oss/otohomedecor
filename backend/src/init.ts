import { cleanupOpenApiDoc } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication, VersioningType } from '@nestjs/common';
// import { applyMiddlewares } from './common/middlewares/common.middleware';

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

const initApp = (app: INestApplication) => {
  const { APP_PREFIX = '/api', FE_URL } = process.env;
  app.setGlobalPrefix(APP_PREFIX);
  app.enableCors({
    origin: FE_URL ? FE_URL : ['*'],
  });
  // app.enableVersioning({
  //   type: VersioningType.HEADER,
  //   header: 'x-api-version',
  //   defaultVersion: '1',
  // });
  //   applyMiddlewares(app);
  initOpenAPI(app);
  app.enableShutdownHooks();
  return app;
};
export { initApp };
