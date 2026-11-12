import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminGuard } from '../common/guards/admin.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guard chạy theo thứ tự khai báo: ThrottlerGuard → AuthGuard → AdminGuard.
    // Khi thêm ThrottlerGuard / AuthGuard, đặt chúng TRƯỚC AdminGuard
    // (AdminGuard cần `req.user` do AuthGuard gắn vào).
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}
