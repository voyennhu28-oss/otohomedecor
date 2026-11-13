import { imageUploadOptions } from '../../common/utils/file-util/image-upload.const';

export const MAX_IMAGES_PER_UPLOAD = 10;

/** Chỉ nhận ảnh jpg / png / webp, tối đa 5MB mỗi ảnh, 10 ảnh mỗi lần. */
export const IMAGE_UPLOAD_OPTIONS = imageUploadOptions(MAX_IMAGES_PER_UPLOAD);
