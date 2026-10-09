export const PAYMENT_METHODS = ['Cash', 'GCash', 'Maya', 'Bank Transfer'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isDigitalPaymentMethod(method: PaymentMethod) {
  return method !== 'Cash';
}
