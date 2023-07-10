import { Module } from '@nestjs/common';

import { PostgresModule } from 'nest-postgres';

import { AppController } from './app.controller';

import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    AuthModule,
    CartModule,
    OrderModule,
    PostgresModule.forRoot({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      user: process.env.DB_USERNAME,
      port: +process.env.DB_PORT,
  }),
  ],
  controllers: [
    AppController,
  ],
  providers: [],
})
export class AppModule {}
