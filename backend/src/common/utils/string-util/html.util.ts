const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape để chèn chuỗi vào HTML (nội dung thẻ hoặc giá trị thuộc tính có dấu nháy). */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);

/**
 * Tagged template dựng HTML an toàn: MỌI giá trị chèn vào đều được escape.
 * Dùng cho mọi email có dữ liệu người dùng nhập (tên, địa chỉ, ghi chú đơn...).
 *
 *   safeHtml`<p>Chào ${user.fullName}</p>`
 */
export const safeHtml = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((html, part, i) => html + escapeHtml(values[i - 1]) + part);
