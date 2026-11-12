import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { FileStrategy } from '../base/file.strategy';
import { Injectable } from '@nestjs/common';
import { CloudinaryEnvs } from './cloudinary.const';

@Injectable()
export class CloudinaryStrategy extends FileStrategy {
  constructor(private configService: ConfigService) {
    super();
    cloudinary.config({
      cloud_name: this.configService.get(CloudinaryEnvs.CLOUDINARY_NAME),
      api_key: this.configService.get(CloudinaryEnvs.CLOUDINARY_API_KEY),
      api_secret: this.configService.get(CloudinaryEnvs.CLOUDINARY_API_SECRET),
    });
  }

  async upload(fileName: string, fileStorageDestination: string) {
    const data = await cloudinary.uploader.upload(fileStorageDestination, {
      public_id: fileName,
    });
    return data;
  }

  async remove(fileName: string) {
    const data = await cloudinary.uploader.destroy(fileName);
    return data;
  }
}
