# Ghi chú code backend

Code trong `src/`, `test/`, `prisma/` không chứa comment giải thích. Lý do thiết kế, quy tắc nghiệp vụ và lưu ý của từng file nằm ở đây, chia theo module.

Mỗi file `.md` gồm các mục `## <đường dẫn file>`. Mỗi dòng có dạng `**Class › method**: ghi chú`, kèm đoạn code trong ngoặc nếu ghi chú gắn với một dòng cụ thể. Spec của module nằm chung file với module đó.

| File | Nội dung |
|---|---|
| [core.md](core.md) | `main.ts`, `app.module.ts`, filter lỗi, logger |
| [common.md](common.md) | `src/common`: guard, decorator, Prisma service, utils, env |
| [prisma.md](prisma.md) | `schema.prisma` (ý nghĩa field), seed |
| [auth.md](auth.md), [users.md](users.md), [addresses.md](addresses.md) | Tài khoản, phân quyền, địa chỉ |
| [categories.md](categories.md), [collections.md](collections.md), [products.md](products.md), [product-variants.md](product-variants.md), [product-images.md](product-images.md) | Catalog |
| [carts.md](carts.md), [checkout.md](checkout.md), [shipping-zones.md](shipping-zones.md), [promotions.md](promotions.md) | Mua hàng |
| [orders.md](orders.md), [payments.md](payments.md) | Đơn hàng, thanh toán SePay |
| [reviews.md](reviews.md), [dashboard.md](dashboard.md) | Đánh giá, báo cáo |
| [tests.md](tests.md) | Mock và test e2e trong `test/` |

Khi sửa code: có quyết định đáng ghi lại thì cập nhật mục tương ứng ở đây, không viết comment vào code. Chỉ giữ directive có tác dụng (`eslint-disable...`, `@ts-...`).
