import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { CatchEverythingFilter } from '../catch-everything/catch-everything.filter';
import { ZodExceptionFilter } from '../catch-everything/zod-exception/zod-exception.filter';
import { validate } from '../common/envs/validate.env';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuthGuard } from '../common/guards/auth.guard';
import { FormatResponseInterceptor } from '../common/interceptors/format-response/format-response.interceptor';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RateLimitModule } from '../common/security/rate-limit/rate-limit.module';
import { ApiUtilModule } from '../common/utils/api-util/api-util.module';
import { AddressesModule } from './addresses/addresses.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CartsModule } from './carts/carts.module';
import { CategoriesModule } from './categories/categories.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CollectionsModule } from './collections/collections.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductImagesModule } from './product-images/product-images.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ShippingZonesModule } from './shipping-zones/shipping-zones.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    RateLimitModule,
    ApiUtilModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    CollectionsModule,
    ProductsModule,
    ProductVariantsModule,
    ProductImagesModule,
    AddressesModule,
    CartsModule,
    ShippingZonesModule,
    PromotionsModule,
    OrdersModule,
    CheckoutModule,
    ScheduleModule.forRoot(),
    PaymentsModule,
    ReviewsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ZodExceptionFilter,
    { provide: APP_FILTER, useClass: CatchEverythingFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: FormatResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}
