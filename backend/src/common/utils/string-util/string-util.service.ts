import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { kebabCase } from 'es-toolkit/compat';

@Injectable()
export class StringUtilService {
  async hash(value: string) {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(value, salt);
  }

  async compare(value: string, valueHashed: string) {
    return await bcrypt.compare(value, valueHashed);
  }

  random(length = 6): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  removeSpace(value: string) {
    return value.replace(/\s+/g, '_');
  }

  toSlug(text: string): string {
    return kebabCase(
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd'),
    );
  }
}
