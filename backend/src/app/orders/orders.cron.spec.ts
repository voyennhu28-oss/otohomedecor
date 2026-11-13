import { Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OrdersCron } from './orders.cron';
import { OrdersService } from './orders.service';

describe('OrdersCron', () => {
  const orders = { cancelExpiredUnpaid: jest.fn() };
  let cron: OrdersCron;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    cron = new OrdersCron(orders as unknown as OrdersService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('được đăng ký chạy mỗi 5 phút', () => {
    const metadata = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', OrdersCron.prototype.cancelUnpaidOrders);
    expect(metadata).toMatchObject({ cronTime: '0 */5 * * * *', name: 'cancel-unpaid-orders' });
    expect(SchedulerRegistry).toBeDefined();
  });

  it('gọi hủy đơn quá hạn', async () => {
    orders.cancelExpiredUnpaid.mockResolvedValue(2);
    await cron.cancelUnpaidOrders();
    expect(orders.cancelExpiredUnpaid).toHaveBeenCalledTimes(1);
  });

  it('lần trước chưa chạy xong thì bỏ qua lần này (không chạy chồng)', async () => {
    let finish!: (n: number) => void;
    orders.cancelExpiredUnpaid.mockReturnValue(new Promise<number>((resolve) => (finish = resolve)));

    const first = cron.cancelUnpaidOrders();
    await cron.cancelUnpaidOrders();
    expect(orders.cancelExpiredUnpaid).toHaveBeenCalledTimes(1);

    finish(0);
    await first;
    orders.cancelExpiredUnpaid.mockResolvedValue(0);
    await cron.cancelUnpaidOrders();
    expect(orders.cancelExpiredUnpaid).toHaveBeenCalledTimes(2);
  });

  it('lỗi không làm crash cron, lần sau vẫn chạy', async () => {
    orders.cancelExpiredUnpaid.mockRejectedValueOnce(new Error('db down')).mockResolvedValue(0);
    await expect(cron.cancelUnpaidOrders()).resolves.toBeUndefined();
    await cron.cancelUnpaidOrders();
    expect(orders.cancelExpiredUnpaid).toHaveBeenCalledTimes(2);
  });
});
