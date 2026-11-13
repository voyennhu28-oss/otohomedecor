import { OrderStatus, PaymentMethod, PaymentStatus, type Order } from '@prisma/client';
import { raw, safeHtml } from '../../common/utils/string-util/html.util';
import type { TransferInfo } from '../payments/sepay.util';
import { formatAddress } from './order-excel';

export const SHOP_NAME = 'Home Decor';

export interface OrderEmail {
  subject: string;
  html: string;
  text: string;
}

export type MailOrder = Pick<
  Order,
  | 'orderNumber'
  | 'items'
  | 'subtotal'
  | 'shippingFee'
  | 'assemblyFee'
  | 'discount'
  | 'total'
  | 'promotionCode'
  | 'shippingAddress'
  | 'paymentMethod'
  | 'paymentStatus'
  | 'status'
  | 'cancelReason'
  | 'expectedDeliveryAt'
>;

export interface MailContext {
  customerName: string;
  orderUrl: string; // trang chi tiết đơn trên frontend
}

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
const date = (d: Date) =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'long' }).format(d);
const dateTime = (d: Date) =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(d);

// ───────────── khối dùng chung ─────────────

const layout = (title: string, body: string, ctx: MailContext) =>
  safeHtml`<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#222;line-height:1.5">
<h2 style="margin:0 0 16px">${title}</h2>
<p>Chào ${ctx.customerName},</p>
${raw(body)}
<p><a href="${ctx.orderUrl}" style="display:inline-block;padding:10px 18px;background:#222;color:#fff;text-decoration:none;border-radius:4px">Xem đơn hàng</a></p>
<p style="color:#888;font-size:12px;margin-top:24px">${SHOP_NAME}. Đây là email tự động, vui lòng không trả lời.</p>
</div>`;

const row = (label: string, value: string, bold = false) =>
  raw(safeHtml`<tr><td style="padding:2px 0">${label}</td><td style="padding:2px 0;text-align:right${bold ? ';font-weight:bold' : ''}">${value}</td></tr>`);

/** Bảng sản phẩm + tiền. */
const orderSummary = (o: MailOrder) => {
  const items = o.items.map((i) =>
    raw(safeHtml`<tr>
<td style="padding:6px 0;border-bottom:1px solid #eee">${i.name}${i.variantName ? ` (${i.variantName})` : ''}<br><span style="color:#888;font-size:12px">${i.sku} × ${i.quantity}</span></td>
<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${vnd(i.lineTotal)}</td>
</tr>`),
  );
  const totals = [
    row('Tạm tính', vnd(o.subtotal)),
    row('Phí vận chuyển', vnd(o.shippingFee)),
    ...(o.assemblyFee ? [row('Phí lắp đặt', vnd(o.assemblyFee))] : []),
    ...(o.discount ? [row(`Giảm giá${o.promotionCode ? ` (${o.promotionCode})` : ''}`, `-${vnd(o.discount)}`)] : []),
    row('Tổng cộng', vnd(o.total), true),
  ];
  return safeHtml`<table style="width:100%;border-collapse:collapse;margin:12px 0">${items}</table>
<table style="width:100%;border-collapse:collapse;margin:12px 0">${totals}</table>
<p><b>Giao tới:</b> ${o.shippingAddress.fullName} · ${o.shippingAddress.phone}<br>${formatAddress(o.shippingAddress)}</p>`;
};

const transferBlock = (t: TransferInfo) =>
  safeHtml`<div style="border:1px solid #ddd;border-radius:6px;padding:12px;margin:12px 0">
<p style="margin:0 0 8px"><b>Thông tin chuyển khoản</b> (đơn tự hủy nếu chưa nhận được tiền trước ${dateTime(t.expiresAt)})</p>
<img src="${t.qrUrl}" alt="Mã QR chuyển khoản" width="240" style="display:block;margin:8px 0">
<table style="border-collapse:collapse">
${row('Ngân hàng', t.bank)}${row('Số tài khoản', t.accountNumber)}${t.accountName ? row('Chủ tài khoản', t.accountName) : ''}
${row('Số tiền', vnd(t.amount), true)}${row('Nội dung', t.content, true)}
</table>
<p style="color:#c00;font-size:13px;margin:8px 0 0">Vui lòng chuyển ĐÚNG số tiền và ĐÚNG nội dung để đơn được xác nhận tự động.</p>
</div>`;

const itemsText = (o: MailOrder) =>
  [
    ...o.items.map((i) => `- ${i.name}${i.variantName ? ` (${i.variantName})` : ''} × ${i.quantity}: ${vnd(i.lineTotal)}`),
    `Tổng cộng: ${vnd(o.total)}`,
  ].join('\n');

// ───────────── các loại email ─────────────

/** Email xác nhận đặt hàng (gửi ngay sau checkout). */
export const buildOrderPlacedEmail = (
  o: MailOrder,
  ctx: MailContext,
  transfer: TransferInfo | null,
): OrderEmail => {
  const payment =
    o.paymentMethod === PaymentMethod.bank_transfer && transfer
      ? transferBlock(transfer)
      : safeHtml`<p>Thanh toán khi nhận hàng (COD). Shop sẽ gọi điện xác nhận đơn trong thời gian sớm nhất.</p>`;
  const delivery = o.expectedDeliveryAt
    ? safeHtml`<p>Dự kiến giao: <b>${date(o.expectedDeliveryAt)}</b></p>`
    : '';

  const html = layout(
    `Đặt hàng thành công #${o.orderNumber}`,
    safeHtml`<p>Cảm ơn bạn đã mua sắm tại ${SHOP_NAME}. Đơn hàng <b>#${o.orderNumber}</b> đã được ghi nhận.</p>
${raw(payment)}${raw(delivery)}${raw(orderSummary(o))}`,
    ctx,
  );
  const transferText =
    o.paymentMethod === PaymentMethod.bank_transfer && transfer
      ? `\nChuyển khoản: ${transfer.bank} - ${transfer.accountNumber}${transfer.accountName ? ` (${transfer.accountName})` : ''}\nSố tiền: ${vnd(transfer.amount)}\nNội dung: ${transfer.content}\nHạn: ${dateTime(transfer.expiresAt)}\n`
      : '\nThanh toán khi nhận hàng (COD).\n';

  return {
    subject: `[${SHOP_NAME}] Đặt hàng thành công #${o.orderNumber}`,
    html,
    text: `Chào ${ctx.customerName},\n\nĐơn hàng #${o.orderNumber} đã được ghi nhận.\n${transferText}\n${itemsText(o)}\n\nXem đơn: ${ctx.orderUrl}`,
  };
};

/** Nội dung theo trạng thái; null = trạng thái này không gửi email (pending, processing). */
const statusContent = (o: MailOrder): { title: string; message: string } | null => {
  switch (o.status) {
    case OrderStatus.confirmed:
      return o.paymentMethod === PaymentMethod.bank_transfer && o.paymentStatus === PaymentStatus.paid
        ? { title: 'Đã nhận thanh toán', message: `Shop đã nhận được ${vnd(o.total)} và xác nhận đơn hàng. Đơn sẽ sớm được chuẩn bị.` }
        : { title: 'Đơn hàng đã được xác nhận', message: 'Shop đã xác nhận đơn hàng và sẽ sớm chuẩn bị hàng cho bạn.' };
    case OrderStatus.shipping:
      return {
        title: 'Đơn hàng đang được giao',
        message: o.expectedDeliveryAt
          ? `Đơn hàng đã được giao cho đơn vị vận chuyển, dự kiến tới nơi ngày ${date(o.expectedDeliveryAt)}.`
          : 'Đơn hàng đã được giao cho đơn vị vận chuyển.',
      };
    case OrderStatus.delivered:
      return { title: 'Giao hàng thành công', message: `Đơn hàng đã được giao. Cảm ơn bạn đã tin chọn ${SHOP_NAME}!` };
    case OrderStatus.cancelled:
      return {
        title: 'Đơn hàng đã bị hủy',
        message: [
          o.cancelReason ? `Lý do: ${o.cancelReason}.` : 'Đơn hàng đã bị hủy.',
          o.paymentStatus === PaymentStatus.refunded ? 'Khoản tiền bạn đã thanh toán sẽ được shop hoàn lại.' : '',
        ]
          .filter(Boolean)
          .join(' '),
      };
    case OrderStatus.returned:
      return {
        title: 'Đã ghi nhận trả hàng',
        message:
          o.paymentStatus === PaymentStatus.refunded
            ? 'Shop đã ghi nhận trả hàng và sẽ hoàn tiền cho bạn.'
            : 'Shop đã ghi nhận trả hàng cho đơn này.',
      };
    default:
      return null;
  }
};

/** Email khi đơn đổi trạng thái (gồm cả khi SePay báo đã nhận tiền). */
export const buildStatusEmail = (o: MailOrder, ctx: MailContext): OrderEmail | null => {
  const content = statusContent(o);
  if (!content) return null;
  const title = `${content.title} #${o.orderNumber}`;
  return {
    subject: `[${SHOP_NAME}] ${title}`,
    html: layout(title, safeHtml`<p>${content.message}</p>${raw(orderSummary(o))}`, ctx),
    text: `Chào ${ctx.customerName},\n\n${content.message}\n\n${itemsText(o)}\n\nXem đơn: ${ctx.orderUrl}`,
  };
};
