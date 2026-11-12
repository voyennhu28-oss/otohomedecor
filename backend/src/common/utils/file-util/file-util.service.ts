import { Injectable } from '@nestjs/common';
import { FileStrategy } from './base/file.strategy';
import { File } from '../excel-util/dto/excel-util.interface';
import { join } from 'path';

@Injectable()
export class FileUtilService {
  constructor(private strategy: FileStrategy) {}

  removeFileExtension(fileName: string) {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex >= 0 ? fileName.slice(0, lastDotIndex) : fileName;
  }

  async uploadImage<R>(file: File) {
    const fileDestination = join(process.cwd(), file.path);
    const fileName = this.removeFileExtension(file.originalname);
    const data: R = await this.strategy.upload(fileName, fileDestination);
    return data;
  }

  async removeImage<R>(file: File) {
    const fileName = this.removeFileExtension(file.originalname);
    const data: R = await this.strategy.remove(fileName);
    return data;
  }
}
