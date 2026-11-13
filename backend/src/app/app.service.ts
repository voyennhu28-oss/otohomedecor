import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prismaService: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  /** Health check cho nền tảng deploy: app chạy + kết nối được MongoDB. Lỗi DB → 503. */
  async health() {
    try {
      await this.prismaService.$runCommandRaw({ ping: 1 });
    } catch (error) {
      this.logger.error('Health check: không kết nối được database', (error as Error)?.stack);
      throw new ServiceUnavailableException('Database không phản hồi');
    }
    return { status: 'ok', database: 'up', uptimeSeconds: Math.round(process.uptime()) };
  }
}
