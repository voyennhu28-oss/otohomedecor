import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { NOT_DELETED, PrismaService } from '../../../common/prisma/prisma.service';
import { ExcelUtilService } from '../../../common/utils/excel-util/excel-util.service';
import { CategoriesService } from '../../categories/categories.service';
import { CreateProductDto } from '../dto/product.dto';
import { ProductsService } from '../products.service';
import {
  cellText,
  ExcelRow,
  groupRowsByProduct,
  PRODUCT_EXCEL_COLUMNS,
  toCreateProductInput,
  toExcelRows,
} from './product-excel.mapper';

const SHEET_NAME = 'Products';
const MAX_IMPORT_ROWS = 2000;

export interface ImportError {
  rows: number[];
  product?: string;
  messages: string[];
}

@Injectable()
export class ProductsExcelService {
  private readonly logger = new Logger(ProductsExcelService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly excelUtilService: ExcelUtilService,
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  /** Xuất sản phẩm (theo ids, hoặc tất cả) ra Excel, mỗi variant 1 dòng. */
  async export(ids?: string[]) {
    const products = await this.prismaService.extended.product.findMany({
      where: ids?.length ? { id: { in: ids } } : {},
      orderBy: { createdAt: 'asc' },
      include: {
        category: { select: { slug: true } },
        variants: { where: NOT_DELETED, orderBy: { createdAt: 'asc' } },
      },
    });

    return this.excelUtilService.generateExcel({
      worksheets: [
        {
          sheetName: SHEET_NAME,
          data: toExcelRows(products),
          fieldsExtend: [...PRODUCT_EXCEL_COLUMNS], // không có dữ liệu vẫn có header (làm file mẫu)
        },
      ],
    });
  }

  /**
   * Nhập sản phẩm MỚI từ Excel. Mỗi sản phẩm được validate và tạo giống hệt
   * POST /admin/products (qua ProductsService.create). Sản phẩm lỗi được bỏ qua
   * và báo lại số dòng, các sản phẩm khác vẫn được tạo.
   */
  async import(file: { path: string } | undefined) {
    if (!file) throw new BadRequestException('Chưa chọn file Excel');
    try {
      const sheets = (await this.excelUtilService.read(file)) as Record<string, ExcelRow[]>;
      const rows = sheets[SHEET_NAME] ?? Object.values(sheets)[0] ?? [];
      if (!rows.length) throw new BadRequestException('File không có dữ liệu');
      if (rows.length > MAX_IMPORT_ROWS) {
        throw new BadRequestException(`Tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần import`);
      }
      return await this.importRows(rows);
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  private async importRows(rows: ExcelRow[]) {
    const { groups, rowsWithoutProduct } = groupRowsByProduct(rows);
    const errors: ImportError[] = [];
    const created: { name: string; slug: string }[] = [];

    if (rowsWithoutProduct.length) {
      errors.push({ rows: rowsWithoutProduct, messages: ['Thiếu cả "Name" lẫn "Slug"'] });
    }

    const categorySlugs = groups
      .map((g) => cellText(g.rows[0].categorySlug))
      .filter((slug): slug is string => slug !== undefined);
    const categoryIDs = await this.categoriesService.findIDsBySlugs([...new Set(categorySlugs)]);

    // Tạo lần lượt từng sản phẩm (không song song) để slug tự sinh không đụng nhau
    for (const group of groups) {
      const productName = cellText(group.rows[0].name);
      const categorySlug = cellText(group.rows[0].categorySlug);
      const categoryID = categorySlug ? categoryIDs.get(categorySlug) : undefined;
      if (!categoryID) {
        errors.push({
          rows: group.rowNumbers,
          product: productName,
          messages: [categorySlug ? `Không tìm thấy danh mục "${categorySlug}"` : 'Thiếu "Category Slug"'],
        });
        continue;
      }

      const parsed = CreateProductDto.schema.safeParse(toCreateProductInput(group, categoryID));
      if (!parsed.success) {
        errors.push({
          rows: group.rowNumbers,
          product: productName,
          messages: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
        continue;
      }

      try {
        const product = await this.productsService.create(parsed.data);
        created.push({ name: product.name, slug: product.slug });
      } catch (error) {
        if (!(error instanceof HttpException)) {
          this.logger.error(`Import sản phẩm "${productName}" lỗi`, (error as Error).stack);
        }
        errors.push({
          rows: group.rowNumbers,
          product: productName,
          messages: [error instanceof HttpException ? error.message : 'Lỗi hệ thống khi tạo sản phẩm'],
        });
      }
    }

    return { totalRows: rows.length, created, errors };
  }
}
