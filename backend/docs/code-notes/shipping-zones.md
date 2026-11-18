# Module `shipping-zones` (src/app/shipping-zones)

## `src/app/shipping-zones/dto/shipping-zone.dto.ts`

- **money** (`const money = z.number().int().min(0);`): VND
- **fields › name** (`name: z.string().trim().min(1).max(100),`): "Nội thành HCM", "Miền Bắc"
- **fields › baseFee** (`baseFee: money,`): phí cho baseWeightKg đầu tiên
- **fields › feePerKg** (`feePerKg: money,`): mỗi kg tiếp theo
- **fields › bulkySurcharge** (`bulkySurcharge: money,`): phụ phí hàng cồng kềnh
- **fields › freeShipThreshold** (`freeShipThreshold: money.min(1).nullable(),`): đơn >= mức này thì free ship (trừ hàng cồng kềnh)
- **CreateShippingZoneDto**: POST /admin/shipping-zones. Một tỉnh chỉ thuộc 1 vùng đang hoạt động.
- **UpdateShippingZoneDto**: PATCH /admin/shipping-zones/:id

## `src/app/shipping-zones/shipping-zones.controller.ts`

- **ShippingZonesController › listProvinces**: Danh sách tỉnh cho form địa chỉ, kèm cờ `supported` (đang giao được).

## `src/app/shipping-zones/shipping-zones.module.ts`

- **ShippingZonesModule › exports** (`exports: [ShippingZonesService],`): checkout tìm vùng theo tỉnh

## `src/app/shipping-zones/shipping-zones.service.spec.ts`

- **describe('ShippingZonesService') › it('DTO: bỏ tỉnh trùng, tỉnh phải nằm trong danh sách 34 tỉnh')** (`).toBe(false);`): đã sáp nhập

## `src/app/shipping-zones/shipping-zones.service.ts`

- **ShippingZonesService › listProvinces**: GET /shipping-zones/provinces: 34 tỉnh, đánh dấu tỉnh đang giao được (cho dropdown địa chỉ).
- **ShippingZonesService › remove**: Xóa cứng: đơn hàng cũ đã lưu sẵn phí ship nên không bị ảnh hưởng.
- **ShippingZonesService › findForProvince**: Vùng đang hoạt động chứa tỉnh này. Không có thì 400 (chưa giao tới).
- **ShippingZonesService › assertNoOverlap**: Một tỉnh chỉ được thuộc 1 vùng đang hoạt động, nếu không sẽ không biết tính phí theo vùng nào.

## `src/app/shipping-zones/shipping.util.spec.ts`

- **describe('shipping.util') › describe('cân nặng tính cước') › it('lấy số lớn hơn giữa cân thật và cân quy đổi')** (`).toBe(40);`): gối to, nhẹ
- **describe('shipping.util') › describe('cân nặng tính cước') › it('lấy số lớn hơn giữa cân thật và cân quy đổi')** (`).toBe(25);`): nhỏ, nặng
- **describe('shipping.util') › describe('calculateShippingFee') › it('mỗi kg tiếp theo làm tròn lên')**: 2 × 3.2kg = 6.4kg → vượt 1.4kg → tính 2kg
- **describe('shipping.util') › describe('calculateShippingFee') › it('có hàng cồng kềnh: không free ship dù đủ ngưỡng, cộng phụ phí') › sofa** (`const sofa = { quantity: 1, weightKg: 45, dimensions: box(210, 90, 80) };`): quy đổi 302.4kg
- **describe('shipping.util') › describe('calculateShippingFee') › it('có hàng cồng kềnh: không free ship dù đủ ngưỡng, cộng phụ phí')**: 302.4 - 5 = 297.4 → 298kg × 5.000 + 30.000 + 200.000

## `src/app/shipping-zones/shipping.util.ts`

- **BULKY_WEIGHT_KG**: Hàng cồng kềnh: 1 sản phẩm nặng (quy đổi) từ 30kg hoặc có cạnh dài từ 150cm.
- **VOLUMETRIC_DIVISOR**: Trọng lượng quy đổi = thể tích (cm³) / 5000, chuẩn của các hãng vận chuyển.
- **chargeableKg**: Cân nặng tính cước của 1 sản phẩm: lấy số lớn hơn giữa cân thật và cân quy đổi.
- **calculateShippingFee**: Phí ship (VND, plan mục 9):
   - Đơn có hàng cồng kềnh: không free ship, cộng phụ phí cồng kềnh.
   - Còn lại: subtotal >= freeShipThreshold thì miễn phí.
   - Phí = phí cơ bản (cho baseWeightKg đầu) + mỗi kg tiếp theo (làm tròn lên) × feePerKg.
- **calculateShippingFee › totalKg**: Làm tròn 3 số lẻ trước khi ceil để tránh lỗi số thực (0.1 + 0.2 = 0.30000000000000004)
- **estimateDeliveryDate**: Ngày giao dự kiến = hôm nay + số ngày vận chuyển của vùng + thời gian sản xuất lâu nhất
  của các dòng hàng đặt làm (leadTimeDays, 0 nếu có sẵn hàng).
