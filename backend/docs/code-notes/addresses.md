# Module `addresses` (src/app/addresses)

## `src/app/addresses/addresses.controller.ts`

- **AddressesController**: Sổ địa chỉ của người đang đăng nhập. userID luôn lấy từ token.

## `src/app/addresses/addresses.module.ts`

- **AddressesModule › exports** (`exports: [AddressesService],`): checkout lấy địa chỉ giao hàng của user

## `src/app/addresses/addresses.service.spec.ts`

- **describe('AddressesService') › describe('update / setDefault / remove') › it('remove địa chỉ mặc định → địa chỉ mới nhất còn lại thành mặc định')** (`.mockResolvedValueOnce({ id: 'a1', isDefault: true })`): địa chỉ bị xóa
- **describe('AddressesService') › describe('update / setDefault / remove') › it('remove địa chỉ mặc định → địa chỉ mới nhất còn lại thành mặc định')** (`.mockResolvedValueOnce({ id: 'a2' });`): mới nhất còn lại

## `src/app/addresses/addresses.service.ts`

- **ADDRESS_ORDER**: Mặc định lên đầu, rồi mới tạo trước.
- **AddressesService**: Sổ địa chỉ của user đang đăng nhập. Mọi hàm đều lọc theo userID lấy từ token.
  Quy tắc: còn địa chỉ thì luôn có đúng 1 địa chỉ mặc định.
- **AddressesService › setDefault**: Đặt làm mặc định, bỏ mặc định ở các địa chỉ khác.
- **AddressesService › remove**: Xóa cứng (đơn hàng lưu snapshot địa chỉ). Xóa địa chỉ mặc định thì địa chỉ mới nhất còn lại thành mặc định.
- **AddressesService › findOwned**: Địa chỉ thuộc user, hoặc null. Checkout dùng (truyền tx).
- **AddressesService › inTransaction**: Đổi mặc định chạm nhiều document: chạy trong transaction, xung đột thì chạy lại.

## `src/app/addresses/dto/address.dto.ts`

- **fields › fullName** (`fullName: fullNameSchema,`): tên người nhận
- **fields › province** (`province: z.enum(PROVINCES),`): lấy từ GET /shipping-zones/provinces
- **fields › district** (`district: text(100).nullable(),`): không bắt buộc: từ 01/07/2025 không còn cấp huyện
- **fields › ward** (`ward: text(100),`): phường / xã
- **fields › street** (`street: text(200),`): số nhà, tên đường
- **CreateAddressDto**: POST /me/addresses. Địa chỉ đầu tiên luôn là mặc định.
- **UpdateAddressDto**: PATCH /me/addresses/:id. Đặt mặc định dùng PATCH /me/addresses/:id/default.
