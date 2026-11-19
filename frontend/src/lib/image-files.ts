export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateImageFiles(files: File[], maxFiles: number) {
  if (files.length > maxFiles) {
    return `Tối đa ${maxFiles} ảnh mỗi lần tải lên`;
  }
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return `"${file.name}" không phải ảnh jpg / png / webp`;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return `"${file.name}" lớn hơn 5MB`;
    }
  }
  return null;
}
