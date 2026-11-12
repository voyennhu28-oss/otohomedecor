import { Module } from '@nestjs/common';
import { MailUtilService } from './mail-util.service';

@Module({
  providers: [MailUtilService],
  exports: [MailUtilService],
})
export class MailUtilModule {}
