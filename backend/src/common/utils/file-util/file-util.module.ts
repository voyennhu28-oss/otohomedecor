import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'path';
import { mkdirSync } from 'fs';
import { StringUtilService } from '../string-util/string-util.service';
import { DateUtilService } from '../date-util/date-util.service';
import { StringUtilModule } from '../string-util/string-util.module';
import { DateUtilModule } from '../date-util/date-util.module';
import { FileUtilService } from './file-util.service';
import { FileStrategy } from './base/file.strategy';
import { CloudinaryStrategy } from './cloudinary/cloudinary.strategy';
import { FileEnvs, UPLOADS_GROUP_FILE } from './file-util.const';

@Global()
@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [StringUtilModule, DateUtilModule],
      inject: [ConfigService, StringUtilService, DateUtilService],
      useFactory: (
        configService: ConfigService,
        stringUtilService: StringUtilService,
        dateUtilService: DateUtilService,
      ) => ({
        storage: diskStorage({
          destination: (_req, file, cb) => {
            const ext = extname(file.originalname).toLowerCase();
            let destination = configService.get<string>(
              FileEnvs.MULTER_DESTINATION_FILE,
            )!;
            for (const [folder, extensions] of Object.entries(
              UPLOADS_GROUP_FILE,
            )) {
              if (extensions.includes(ext)) {
                destination = join(destination, folder);
              }
            }
            mkdirSync(destination, { recursive: true });
            cb(null, destination);
          },
          filename: (_req, file, callback) => {
            const extFile = extname(file.originalname);
            const fileName = stringUtilService.removeSpace(
              basename(file.originalname, extFile),
            );
            const currentDate = dateUtilService
              .getCurrentDate('en-CA', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour12: false,
              })
              .replaceAll('-', '_');
            callback(
              null,
              `${fileName}_${stringUtilService.random()}_${currentDate}${extFile}`,
            );
          },
        }),
      }),
    }),
  ],
  providers: [
    FileUtilService,
    {
      provide: FileStrategy,
      useClass: CloudinaryStrategy,
    },
  ],
  exports: [MulterModule, FileStrategy],
})
export class FileUtilModule {}
