/**
 * Chuyển đổi giữa sản phẩm và dòng Excel. Mỗi dòng = 1 variant;
 * các dòng cùng `slug` (hoặc cùng `name` nếu bỏ trống slug) là variant của cùng 1 sản phẩm.
 * Các field của product chỉ đọc ở dòng ĐẦU TIÊN của nhóm.
 *
 * File chỉ có hàm thuần (không gọi DB) để dễ đọc và dễ test.
 */

/** Thứ tự cột trong file Excel. Header = startCase(tên cột), vd "variantName" → "Variant Name". */
export const PRODUCT_EXCEL_COLUMNS = [
  'name',
  'slug',
  'categorySlug',
  'status',
  'shortDescription',
  'rooms',
  'styles',
  'materials',
  'tags',
  'requiresAssembly',
  'assemblyFee',
  'allowBackorder',
  'leadTimeDays',
  'warrantyMonths',
  'isFeatured',
  'sku',
  'variantName',
  'options',
  'price',
  'compareAtPrice',
  'stock',
  'weightKg',
  'lengthCm',
  'widthCm',
  'heightCm',
  'variantActive',
] as const;

type ExcelColumn = (typeof PRODUCT_EXCEL_COLUMNS)[number];
export type ExcelRow = Partial<Record<ExcelColumn, unknown>>;

// ───────────── Export: product → dòng Excel ─────────────

interface ProductForExport {
  name: string;
  slug: string;
  status: string;
  shortDescription: string | null;
  rooms: string[];
  styles: string[];
  materials: string[];
  tags: string[];
  requiresAssembly: boolean;
  assemblyFee: number;
  allowBackorder: boolean;
  leadTimeDays: number;
  warrantyMonths: number;
  isFeatured: boolean;
  category: { slug: string };
  variants: {
    sku: string;
    name: string;
    options: { name: string; value: string }[];
    price: number;
    compareAtPrice: number | null;
    stock: number;
    weightKg: number;
    dimensions: { lengthCm: number; widthCm: number; heightCm: number } | null;
    isActive: boolean;
  }[];
}

export const toExcelRows = (products: ProductForExport[]): ExcelRow[] =>
  products.flatMap((p) =>
    p.variants.map((v) => ({
      name: p.name,
      slug: p.slug,
      categorySlug: p.category.slug,
      status: p.status,
      shortDescription: p.shortDescription ?? '',
      rooms: p.rooms.join(', '),
      styles: p.styles.join(', '),
      materials: p.materials.join(', '),
      tags: p.tags.join(', '),
      requiresAssembly: p.requiresAssembly,
      assemblyFee: p.assemblyFee,
      allowBackorder: p.allowBackorder,
      leadTimeDays: p.leadTimeDays,
      warrantyMonths: p.warrantyMonths,
      isFeatured: p.isFeatured,
      sku: v.sku,
      variantName: v.name,
      options: v.options.map((o) => `${o.name}: ${o.value}`).join('; '),
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? '',
      stock: v.stock,
      weightKg: v.weightKg,
      lengthCm: v.dimensions?.lengthCm ?? '',
      widthCm: v.dimensions?.widthCm ?? '',
      heightCm: v.dimensions?.heightCm ?? '',
      variantActive: v.isActive,
    })),
  );

// ───────────── Import: đọc giá trị từng ô ─────────────
// Ô trống → undefined (để Zod dùng giá trị mặc định / báo thiếu).

export const cellText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
};

/** "abc" → NaN, để Zod báo lỗi "Expected number". */
export const cellNumber = (value: unknown): number | undefined => {
  const text = cellText(value);
  return text === undefined ? undefined : Number(text);
};

/** TRUE / true / 1 / x / yes / có → true; ô có giá trị khác → false. */
export const cellBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const text = cellText(value);
  return text === undefined ? undefined : /^(true|1|x|yes|có)$/i.test(text);
};

/** "oak, rattan" → ["oak", "rattan"] */
export const cellList = (value: unknown): string[] | undefined =>
  cellText(value)
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** "Màu: Xám; Kích thước: 3 chỗ" → [{ name: "Màu", value: "Xám" }, { name: "Kích thước", value: "3 chỗ" }] */
export const cellOptions = (value: unknown) =>
  cellText(value)
    ?.split(';')
    .map((part) => {
      const [name, ...rest] = part.split(':');
      return { name: name.trim(), value: rest.join(':').trim() };
    })
    .filter((o) => o.name && o.value);

// ───────────── Import: nhóm dòng thành sản phẩm ─────────────

export interface ProductRowGroup {
  /** Số dòng trong Excel (dòng 1 là header) để báo lỗi. */
  rowNumbers: number[];
  rows: ExcelRow[];
}

/** Nhóm các dòng cùng slug (hoặc cùng name) thành 1 sản phẩm. Dòng không có name lẫn slug bị trả về riêng. */
export const groupRowsByProduct = (rows: ExcelRow[]) => {
  const groups = new Map<string, ProductRowGroup>();
  const rowsWithoutProduct: number[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const key = cellText(row.slug) ?? cellText(row.name);
    if (!key) {
      rowsWithoutProduct.push(rowNumber);
      return;
    }
    const group = groups.get(key) ?? { rowNumbers: [], rows: [] };
    group.rowNumbers.push(rowNumber);
    group.rows.push(row);
    groups.set(key, group);
  });

  return { groups: [...groups.values()], rowsWithoutProduct };
};

/**
 * Dựng dữ liệu tạo sản phẩm (chưa validate) từ 1 nhóm dòng.
 * Kết quả đưa qua CreateProductDto.schema để kiểm tra như khi gọi API.
 */
export const toCreateProductInput = (group: ProductRowGroup, categoryID: string | undefined) => {
  const [first] = group.rows;
  return {
    name: cellText(first.name),
    slug: cellText(first.slug),
    categoryID,
    status: cellText(first.status),
    shortDescription: cellText(first.shortDescription),
    rooms: cellList(first.rooms),
    styles: cellList(first.styles),
    materials: cellList(first.materials),
    tags: cellList(first.tags),
    requiresAssembly: cellBoolean(first.requiresAssembly),
    assemblyFee: cellNumber(first.assemblyFee),
    allowBackorder: cellBoolean(first.allowBackorder),
    leadTimeDays: cellNumber(first.leadTimeDays),
    warrantyMonths: cellNumber(first.warrantyMonths),
    isFeatured: cellBoolean(first.isFeatured),
    variants: group.rows.map((row) => {
      const [lengthCm, widthCm, heightCm] = [row.lengthCm, row.widthCm, row.heightCm].map(cellNumber);
      const hasDimensions = [lengthCm, widthCm, heightCm].some((n) => n !== undefined);
      return {
        sku: cellText(row.sku),
        name: cellText(row.variantName),
        options: cellOptions(row.options),
        price: cellNumber(row.price),
        compareAtPrice: cellNumber(row.compareAtPrice),
        stock: cellNumber(row.stock),
        weightKg: cellNumber(row.weightKg),
        dimensions: hasDimensions ? { lengthCm, widthCm, heightCm } : undefined,
        isActive: cellBoolean(row.variantActive),
      };
    }),
  };
};
