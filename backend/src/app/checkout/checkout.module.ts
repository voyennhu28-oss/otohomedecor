import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { CartsModule } from '../carts/carts.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { ShippingZonesModule } from '../shipping-zones/shipping-zones.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

/** Không có collection riêng: điều phối các module khác qua service (chung 1 transaction). */
@Module({
  imports: [
    CartsModule,
    AddressesModule,
    ProductVariantsModule,
    ShippingZonesModule,
    PromotionsModule,
    OrdersModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
