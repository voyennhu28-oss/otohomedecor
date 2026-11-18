import { SetMetadata } from '@nestjs/common';

export const SKIP_FORMAT_RESPONSE = 'skipFormatResponse';

export const SkipFormatResponse = () => SetMetadata(SKIP_FORMAT_RESPONSE, true);
