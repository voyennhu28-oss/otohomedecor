const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** HTML đã an toàn (dựng bằng `safeHtml`), chèn vào template khác KHÔNG bị escape lại. */
export class RawHtml {
  constructor(readonly html: string) {}
}

/** Đánh dấu đoạn HTML đã an toàn. CHỈ dùng cho kết quả của `safeHtml`, không bao giờ cho dữ liệu người dùng. */
export const raw = (html: string) => new RawHtml(html);

/** Escape để chèn chuỗi vào HTML (nội dung thẻ hoặc giá trị thuộc tính có dấu nháy). */
export const escapeHtml = (value: unknown): string => {
  if (value instanceof RawHtml) return value.html;
  if (Array.isArray(value)) return value.map(escapeHtml).join('');
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
};

/**
 * Tagged template dựng HTML an toàn: MỌI giá trị chèn vào đều được escape, trừ `RawHtml`
 * (đoạn đã dựng bằng safeHtml). Mảng được nối lại. Dùng cho mọi email có dữ liệu người dùng nhập.
 *
 *   safeHtml`<p>Chào ${user.fullName}</p>`
 *   safeHtml`<table>${items.map((i) => raw(safeHtml`<tr><td>${i.name}</td></tr>`))}</table>`
 */
export const safeHtml = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((html, part, i) => html + escapeHtml(values[i - 1]) + part);
