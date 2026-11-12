import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { IDDto } from '../../common/dto/param.dto';
import { ExportProductsDto } from './dto/export-products.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { AdminProductListQueryDto } from './dto/product-query.dto';
import { EXCEL_UPLOAD_OPTIONS, XLSX_MIME_TYPE } from './excel/products-excel.const';
import { ProductsExcelService } from './excel/products-excel.service';
import { ProductsService } from './products.service';

@ApiTags('Admin / Products')
@AdminOnly()
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsExcelService: ProductsExcelService,
  ) {}

  @Get()
  findList(@Query() query: AdminProductListQueryDto) {
    return this.productsService.findAdminList(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IDDto) {
    return this.productsService.findAdminByID(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param() { id }: IDDto, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IDDto) {
    return this.productsService.remove(id);
  }

  /** Tải file Excel. Body { ids } để chỉ xuất một số sản phẩm; bỏ trống = xuất tất cả. */
  @Post('export')
  @HttpCode(200)
  async exportExcel(@Body() { ids }: ExportProductsDto) {
    const workbook = await this.productsExcelService.export(ids);
    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '_');
    return new StreamableFile(Buffer.from(buffer), {
      type: XLSX_MIME_TYPE,
      disposition: `attachment; filename="products_${date}.xlsx"`,
    });
  }

  /** multipart/form-data, field "file" (.xlsx). Cùng định dạng với file export. */
  @Post('import')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', EXCEL_UPLOAD_OPTIONS))
  importExcel(@UploadedFile() file: { path: string } | undefined) {
    return this.productsExcelService.import(file);
  }
}
