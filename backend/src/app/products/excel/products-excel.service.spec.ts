import { BadRequestException, ConflictException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ExcelUtilService } from '../../../common/utils/excel-util/excel-util.service';
import { CategoriesService } from '../../categories/categories.service';
import { ProductsService } from '../products.service';
import { PRODUCT_EXCEL_COLUMNS } from './product-excel.mapper';
import { ProductsExcelService } from './products-excel.service';

jest.mock('node:fs/promises', () => ({ unlink: jest.fn().mockResolvedValue(undefined) }));

const CATEGORY_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const row = (name: string, sku: string, extra: Record<string, unknown> = {}) => ({
  name, categorySlug: 'sofa', sku, variantName: sku, price: 1_000_000, ...extra,
});

describe('ProductsExcelService', () => {
  let service: ProductsExcelService;
  let excel: { read: jest.Mock; generateExcel: jest.Mock };
  let products: { create: jest.Mock };
  let productFindMany: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    productFindMany = jest.fn().mockResolvedValue([]);
    excel = { read: jest.fn(), generateExcel: jest.fn().mockReturnValue('workbook') };
    products = {
      create: jest.fn(({ name, slug }) => Promise.resolve({ name, slug: slug ?? name.toLowerCase() })),
    };
    const categories = {
      findIDsBySlugs: jest.fn().mockResolvedValue(new Map([['sofa', CATEGORY_ID]])),
    };
    service = new ProductsExcelService(
      { extended: { product: { findMany: productFindMany } } } as unknown as PrismaService,
      excel as unknown as ExcelUtilService,
      products as unknown as ProductsService,
      categories as unknown as CategoriesService,
    );
  });

  describe('import', () => {
    const file = { path: 'uploads/excels/products.xlsx' };

    it('tạo từng sản phẩm, gom variant theo tên; báo lỗi theo số dòng; luôn xóa file tạm', async () => {
      excel.read.mockResolvedValue({
        Products: [
          row('Sofa A', 'A1'), //                               dòng 2
          row('Sofa A', 'A2'), //                               dòng 3
          row('Đèn B', 'B1', { categorySlug: 'khong-co' }), //  dòng 4: sai danh mục
          row('Kệ C', 'C1', { price: 'abc' }), //               dòng 5: sai giá
          row('Gương D', 'D1'), //                              dòng 6: SKU trùng DB
        ],
      });
      products.create.mockImplementation(({ name }) =>
        name === 'Gương D'
          ? Promise.reject(new ConflictException('SKU đã tồn tại: D1'))
          : Promise.resolve({ name, slug: 'sofa-a' }),
      );

      const result = await service.import(file);

      expect(products.create).toHaveBeenCalledTimes(2); // Sofa A + Gương D
      expect(products.create.mock.calls[0][0].variants.map((v: { sku: string }) => v.sku)).toEqual(['A1', 'A2']);
      expect(result.totalRows).toBe(5);
      expect(result.created).toEqual([{ name: 'Sofa A', slug: 'sofa-a' }]);
      expect(result.errors).toEqual([
        { rows: [4], product: 'Đèn B', messages: ['Không tìm thấy danh mục "khong-co"'] },
        { rows: [5], product: 'Kệ C', messages: [expect.stringContaining('variants.0.price')] },
        { rows: [6], product: 'Gương D', messages: ['SKU đã tồn tại: D1'] },
      ]);
      expect(fs.unlink).toHaveBeenCalledWith(file.path);
    });

    it('file rỗng → 400, vẫn xóa file tạm', async () => {
      excel.read.mockResolvedValue({ Products: [] });
      await expect(service.import(file)).rejects.toBeInstanceOf(BadRequestException);
      expect(fs.unlink).toHaveBeenCalledWith(file.path);
    });

    it('không có file → 400', async () => {
      await expect(service.import(undefined)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('export', () => {
    it('mỗi variant 1 dòng; không có sản phẩm vẫn có header', async () => {
      await service.export();
      const [{ worksheets }] = excel.generateExcel.mock.calls[0];
      expect(worksheets[0]).toEqual({
        sheetName: 'Products',
        data: [],
        fieldsExtend: [...PRODUCT_EXCEL_COLUMNS],
      });
    });

    it('lọc theo ids nếu có', async () => {
      await service.export([CATEGORY_ID]);
      expect(productFindMany.mock.calls[0][0].where).toEqual({ id: { in: [CATEGORY_ID] } });
    });
  });
});
