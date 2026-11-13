import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** GET /api/health: Render / Railway / Docker gọi định kỳ, nên public và không giới hạn tần suất. */
  @Public()
  @SkipThrottle()
  @Get('health')
  health() {
    return this.appService.health();
  }
}
