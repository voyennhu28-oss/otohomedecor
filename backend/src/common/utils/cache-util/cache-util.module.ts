import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheEnvs } from './cache-util.const';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl = parseInt(
          configService.get<string>(CacheEnvs.CACHE_INTERNAL_TTL)!,
        );
        return {
          ttl,
        };
      },
    }),
  ],
})
export class CacheUtilModule {}
