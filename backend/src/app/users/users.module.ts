import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService], // auth dùng để tìm user khi đăng nhập
})
export class UsersModule {}
