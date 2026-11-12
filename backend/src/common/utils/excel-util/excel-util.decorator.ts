import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

export const ImportExcel = (isMultiple = false) => {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Upload file import',
      required: true,
      schema: {
        type: 'object',
        properties: {
          file: { type: 'string', format: 'binary' },
        },
      },
    }),
    UseInterceptors(
      isMultiple ? FilesInterceptor('file') : FileInterceptor('file'),
    ),
  );
};
