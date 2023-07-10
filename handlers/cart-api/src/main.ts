import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { Express } from 'express';
import { AppModule } from './app.module';

// const port = process.env.PORT || 4000;

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors({
//     origin: (req, callback) => callback(null, true),
//   });
//   app.use(helmet());

//   await app.listen(port);
// }
// bootstrap().then(() => {
//   console.log('App is running on %s port', port);
// });

export async function createApp(
  expressApp: Express,
): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  console.log(
    'Env variables from lambda main: ',
    process.env.DB_DATABASE,
    process.env,
  );

  app.enableCors({
    origin: (req, callback) => callback(null, true),
  });
  app.use(helmet());

  return app;
}
