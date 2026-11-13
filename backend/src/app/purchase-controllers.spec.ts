/**
 * Controller của giai đoạn 3 (mua hàng) chỉ chuyển tiếp sang service. Test khóa 2 điều dễ sai:
 *  - phân quyền: route /me/... cần đăng nhập (không @Public), route /admin/... có @AdminOnly
 *  - userID luôn lấy từ token (@User), không từ body / param
 */
import { Role } from '@prisma/client';
import { AutoMockingModule } from '../../test/auto-mocking/auto-mocking.module';
import { IS_ADMIN_ONLY } from '../common/decorators/admin-only.decorator';
import { IS_PUBLIC } from '../common/decorators/public.decorator';
import type { UserInfo } from '../common/decorators/user.decorator';
import { AddressesController } from './addresses/addresses.controller';
import { AddressesService } from './addresses/addresses.service';
import { CartsController } from './carts/carts.controller';
import { CartsService } from './carts/carts.service';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutService } from './checkout/checkout.service';
import { AdminOrdersController } from './orders/admin-orders.controller';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { AdminPaymentsController } from './payments/admin-payments.controller';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { AdminPromotionsController } from './promotions/admin-promotions.controller';
import { PromotionsService } from './promotions/promotions.service';
import { AdminShippingZonesController } from './shipping-zones/admin-shipping-zones.controller';
import { ShippingZonesController } from './shipping-zones/shipping-zones.controller';
import { ShippingZonesService } from './shipping-zones/shipping-zones.service';

const me: UserInfo = { userID: 'u1', userEmail: 'khach@x.com', role: Role.customer };
const admin: UserInfo = { userID: 'a1', userEmail: 'admin@x.com', role: Role.admin };
const ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const ORDER_NUMBER = 'HD261113-ABCDEF';

type Ctor = abstract new (...args: never[]) => object;
const handlers = (controller: Ctor) =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => (controller.prototype as Record<string, object>)[name]);

describe('Controller giai đoạn 3', () => {
  describe('phân quyền', () => {
    it.each([AddressesController, CartsController, CheckoutController, OrdersController, PaymentsController])(
      '%p: cần đăng nhập, không phải chỉ admin',
      (controller) => {
        expect(Reflect.getMetadata(IS_PUBLIC, controller)).toBeUndefined();
        expect(Reflect.getMetadata(IS_ADMIN_ONLY, controller)).toBeUndefined();
        for (const handler of handlers(controller)) {
          expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBeUndefined();
        }
      },
    );

    it.each([AdminOrdersController, AdminPromotionsController, AdminShippingZonesController, AdminPaymentsController])(
      '%p: @AdminOnly ở cấp class',
      (controller) => {
        expect(Reflect.getMetadata(IS_ADMIN_ONLY, controller)).toBe(true);
      },
    );

    it('GET /shipping-zones/provinces là public (form địa chỉ dùng trước khi đăng nhập)', () => {
      expect(Reflect.getMetadata(IS_PUBLIC, ShippingZonesController.prototype.listProvinces)).toBe(true);
    });
  });

  describe('userID lấy từ token', () => {
    it('addresses / cart', async () => {
      const module = await AutoMockingModule.createTestingModule({
        controllers: [AddressesController, CartsController],
      });
      const addresses = module.get(AddressesService) as jest.Mocked<AddressesService>;
      const carts = module.get(CartsService) as jest.Mocked<CartsService>;
      const addressCtrl = module.get(AddressesController);
      const cartCtrl = module.get(CartsController);

      await addressCtrl.findMine(me);
      await addressCtrl.update(me, { id: ID }, { street: 'x' });
      await addressCtrl.setDefault(me, { id: ID });
      await addressCtrl.remove(me, { id: ID });
      expect(addresses.findMine).toHaveBeenCalledWith('u1');
      expect(addresses.update).toHaveBeenCalledWith('u1', ID, { street: 'x' });
      expect(addresses.setDefault).toHaveBeenCalledWith('u1', ID);
      expect(addresses.remove).toHaveBeenCalledWith('u1', ID);

      await cartCtrl.addItem(me, { variantID: ID, quantity: 2 });
      await cartCtrl.updateItem(me, { variantID: ID }, { quantity: 3 });
      await cartCtrl.removeItem(me, { variantID: ID });
      await cartCtrl.clear(me);
      expect(carts.addItem).toHaveBeenCalledWith('u1', { variantID: ID, quantity: 2 });
      expect(carts.updateItem).toHaveBeenCalledWith('u1', ID, 3);
      expect(carts.removeItem).toHaveBeenCalledWith('u1', ID);
      expect(carts.clearCart).toHaveBeenCalledWith('u1');
    });

    it('checkout / đơn của tôi', async () => {
      const module = await AutoMockingModule.createTestingModule({
        controllers: [CheckoutController, OrdersController],
      });
      const checkout = module.get(CheckoutService) as jest.Mocked<CheckoutService>;
      const orders = module.get(OrdersService) as jest.Mocked<OrdersService>;

      const dto = { addressID: ID, withAssembly: false, paymentMethod: 'cod' as const };
      await module.get(CheckoutController).checkout(me, dto);
      await module.get(CheckoutController).preview(me, dto);
      expect(checkout.checkout).toHaveBeenCalledWith(me, dto);
      expect(checkout.preview).toHaveBeenCalledWith(me, dto);

      const ctrl = module.get(OrdersController);
      await ctrl.findMine(me, { page: 1, itemPerPage: 10 });
      await ctrl.findOne(me, { orderNumber: ORDER_NUMBER });
      await ctrl.cancel(me, { orderNumber: ORDER_NUMBER }, { reason: 'Đặt nhầm' });
      expect(orders.findMine).toHaveBeenCalledWith('u1', { page: 1, itemPerPage: 10 });
      expect(orders.findMineByNumber).toHaveBeenCalledWith('u1', ORDER_NUMBER);
      expect(orders.cancelMine).toHaveBeenCalledWith(me, ORDER_NUMBER, 'Đặt nhầm');
    });
  });

  describe('admin', () => {
    it('orders: đổi trạng thái ghi nhận admin thao tác; export trả file xlsx', async () => {
      const module = await AutoMockingModule.createTestingModule({ controllers: [AdminOrdersController] });
      const orders = module.get(OrdersService) as jest.Mocked<OrdersService>;
      const ctrl = module.get(AdminOrdersController);

      await ctrl.updateStatus(admin, { id: ID }, { status: 'confirmed' });
      expect(orders.updateStatus).toHaveBeenCalledWith(admin, ID, { status: 'confirmed' });

      orders.exportExcel.mockResolvedValue({ xlsx: { writeBuffer: () => Promise.resolve(new ArrayBuffer(4)) } } as never);
      const file = await ctrl.exportExcel({});
      expect(file.getHeaders()).toMatchObject({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: expect.stringMatching(/^attachment; filename="orders_\d{4}_\d{2}_\d{2}\.xlsx"$/),
      });

      await ctrl.findList({ page: 1, itemPerPage: 20 });
      await ctrl.findOne({ id: ID });
      expect(orders.findAdminByID).toHaveBeenCalledWith(ID);

      await ctrl.markPaid(admin, { id: ID }, { note: 'Khách chuyển sai nội dung' });
      expect(orders.markPaidManually).toHaveBeenCalledWith(admin, ID, 'Khách chuyển sai nội dung');
    });

    it('payments: thông tin chuyển khoản lấy userID từ token; admin xem danh sách giao dịch', async () => {
      const meModule = await AutoMockingModule.createTestingModule({ controllers: [PaymentsController] });
      const adminModule = await AutoMockingModule.createTestingModule({ controllers: [AdminPaymentsController] });

      await meModule.get(PaymentsController).getTransferInfo(me, { orderNumber: ORDER_NUMBER });
      expect((meModule.get(PaymentsService) as jest.Mocked<PaymentsService>).getMyTransferInfo).toHaveBeenCalledWith(
        'u1',
        ORDER_NUMBER,
      );

      await adminModule.get(AdminPaymentsController).findList({ status: 'failed', page: 1, itemPerPage: 20 });
      expect((adminModule.get(PaymentsService) as jest.Mocked<PaymentsService>).findList).toHaveBeenCalledWith({
        status: 'failed',
        page: 1,
        itemPerPage: 20,
      });
    });

    it('promotions / shipping zones: chuyển tiếp đúng tham số', async () => {
      // Mỗi controller 1 module: AutoMockingModule tạo mock riêng cho từng nơi inject
      const promoModule = await AutoMockingModule.createTestingModule({ controllers: [AdminPromotionsController] });
      const zoneModule = await AutoMockingModule.createTestingModule({ controllers: [AdminShippingZonesController] });
      const publicModule = await AutoMockingModule.createTestingModule({ controllers: [ShippingZonesController] });
      const promotions = promoModule.get(PromotionsService) as jest.Mocked<PromotionsService>;
      const zones = zoneModule.get(ShippingZonesService) as jest.Mocked<ShippingZonesService>;
      const publicZones = publicModule.get(ShippingZonesService) as jest.Mocked<ShippingZonesService>;

      const promoCtrl = promoModule.get(AdminPromotionsController);
      await promoCtrl.findList({ page: 1, itemPerPage: 20 });
      await promoCtrl.findOne({ id: ID });
      await promoCtrl.update({ id: ID }, { isActive: false });
      await promoCtrl.remove({ id: ID });
      expect(promotions.update).toHaveBeenCalledWith(ID, { isActive: false });
      expect(promotions.remove).toHaveBeenCalledWith(ID);

      const zoneCtrl = zoneModule.get(AdminShippingZonesController);
      await zoneCtrl.findAll();
      await zoneCtrl.findOne({ id: ID });
      await zoneCtrl.update({ id: ID }, { baseFee: 1 });
      await zoneCtrl.remove({ id: ID });
      expect(zones.update).toHaveBeenCalledWith(ID, { baseFee: 1 });
      expect(zones.remove).toHaveBeenCalledWith(ID);

      await publicModule.get(ShippingZonesController).listProvinces();
      expect(publicZones.listProvinces).toHaveBeenCalled();
    });
  });
});
