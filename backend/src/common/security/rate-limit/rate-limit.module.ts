import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RateLimitEnvs, THROTTLE_DEFAULT } from './rate-limit.const';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get(RateLimitEnvs.THROTTLE_TTL) ?? THROTTLE_DEFAULT.ttl),
          limit: Number(
            config.get(RateLimitEnvs.THROTTLE_LIMIT) ?? THROTTLE_DEFAULT.limit,
          ),
        },
      ],
    }),
  ],
})
export class RateLimitModule {}
