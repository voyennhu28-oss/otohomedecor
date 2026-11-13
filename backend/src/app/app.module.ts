import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { CatchEverythingFilter } from '../catch-everything/catch-everything.filter';
import { ZodExceptionFilter } from '../catch-everything/zod-exception/zod-exception.filter';
import { validate } from '../common/envs/validate.env';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuthGuard } from '../common/guards/auth.guard';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RateLimitModule } from '../common/security/rate-limit/rate-limit.module';
import { ApiUtilModule } from '../common/utils/api-util/api-util.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductImagesModule } from './product-images/product-images.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // nạp .env vào process.env; thiếu / sai biến bắt buộc thì dừng ngay lúc khởi động
    ConfigModule.forRoot({ isGlobal: true, validate }),
    RateLimitModule,
    ApiUtilModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    ProductVariantsModule,
    ProductImagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ZodExceptionFilter, // CatchEverythingFilter dùng để định dạng lỗi Zod
    { provide: APP_FILTER, useClass: CatchEverythingFilter }, // định dạng mọi lỗi, map lỗi Prisma
    { provide: APP_PIPE, useClass: ZodValidationPipe }, // validate mọi DTO tạo bằng createZodDto
    // Global guard chạy theo thứ tự khai báo:
    // ThrottlerGuard chặn spam trước → AuthGuard gắn req.user → AdminGuard đọc req.user
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}
