import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DateUtilModule } from '../utils/date-util/date-util.module';

@Global()
@Module({
  // Re-export DateUtilModule (ExcelResponseInterceptor cần DateUtilService ở mọi module),
  // không khai báo lại DateUtilService trong providers: tránh tạo thêm 1 instance thứ hai.
  imports: [DateUtilModule],
  providers: [PrismaService],
  exports: [PrismaService, DateUtilModule],
})
export class PrismaModule {}
