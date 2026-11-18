import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DateUtilModule } from '../utils/date-util/date-util.module';

@Global()
@Module({
  imports: [DateUtilModule],
  providers: [PrismaService],
  exports: [PrismaService, DateUtilModule],
})
export class PrismaModule {}
