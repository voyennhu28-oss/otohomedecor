import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DateUtilModule } from '../utils/date-util/date-util.module';
import { DateUtilService } from '../utils/date-util/date-util.service';
import { StringUtilModule } from '../utils/string-util/string-util.module';

@Global()
@Module({
  imports: [DateUtilModule, StringUtilModule],
  controllers: [],
  providers: [PrismaService, DateUtilService],
  exports: [PrismaService, DateUtilService],
})
export class PrismaModule {}
