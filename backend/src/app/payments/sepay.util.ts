import { OrderStatus, PaymentStatus, type Order } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { toPaymentCode } from '../orders/order-number';

const VIETQR_IMAGE_URL = 'https://vietqr.app/img';

export interface SepayAccount {
  bank: string;
  accountNumber: string;
  accountName: string | null;
}

export interface TransferInfo extends SepayAccount {
  amount: number;
  content: string;
  qrUrl: string;
  expiresAt: Date;
}

export const buildTransferInfo = (
  account: SepayAccount,
  order: Pick<Order, 'orderNumber' | 'total' | 'createdAt'>,
  timeoutMinutes: number,
): TransferInfo => {
  const content = toPaymentCode(order.orderNumber);
  const query = new URLSearchParams({
    acc: account.accountNumber,
    bank: account.bank,
    amount: String(order.total),
    des: content,
    template: 'compact',
  });
  return {
    ...account,
    amount: order.total,
    content,
    qrUrl: `${VIETQR_IMAGE_URL}?${query}`,
    expiresAt: new Date(order.createdAt.getTime() + timeoutMinutes * 60_000),
  };
};

export type TransferOutcome =
  'paid' | 'amount_mismatch' | 'already_paid' | 'order_closed';

export const evaluateTransfer = (
  order: Pick<Order, 'status' | 'paymentStatus' | 'total'>,
  amount: number,
): TransferOutcome => {
  if (order.paymentStatus === PaymentStatus.paid) return 'already_paid';
  if (
    order.status === OrderStatus.cancelled ||
    order.status === OrderStatus.returned
  ) {
    return 'order_closed';
  }
  return amount === order.total ? 'paid' : 'amount_mismatch';
};

export const safeEqual = (a: string, b: string) =>
  timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type SignatureCheck = 'ok' | 'missing' | 'expired' | 'invalid';

export const verifySepaySignature = ({
  rawBody,
  timestamp,
  signature,
  secret,
  now = Date.now(),
}: {
  rawBody: Buffer | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  secret: string;
  now?: number;
}): SignatureCheck => {
  if (!rawBody || !signature || !timestamp || !/^\d+$/.test(timestamp))
    return 'missing';
  if (Math.abs(now / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS)
    return 'expired';

  const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
  return safeEqual(signature.trim(), expected) ? 'ok' : 'invalid';
};
