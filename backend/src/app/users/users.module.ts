import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AdminUsersController } from './admin-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ProductsModule], // wishlist đọc thông tin sản phẩm qua ProductsService
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService], // auth dùng để tìm user khi đăng nhập
})
export class UsersModule {}
