/**
 * Chọn slug chưa bị dùng: "ban-tra" → nếu đã có thì "ban-tra-2", "ban-tra-3"...
 *
 * @param base     slug gốc (đã chuẩn hóa, vd từ StringUtilService.toSlug)
 * @param taken    các slug đã tồn tại bắt đầu bằng `base` (kể cả bản ghi đã xóa)
 * @param reserved slug không được dùng vì trùng đường dẫn tĩnh (vd "featured")
 */
export const pickAvailableSlug = (
  base: string,
  taken: Iterable<string>,
  reserved: readonly string[] = [],
): string => {
  const unavailable = new Set([...taken, ...reserved]);
  if (!unavailable.has(base)) return base;
  let i = 2;
  while (unavailable.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
};
