import { CustomerType, Product } from '../catalog/catalog.data';

export interface PriceRule {
  id: string;
  productId: string;
  variantId: string;
  customerType: CustomerType;
  startDate: string;
  endDate: string;
  weekdays?: number[]; // ISO weekday: Monday=1, Sunday=7
  priority: number;
  amount: number;
}
export interface Closure {
  productId: string;
  variantId?: string;
  startDate: string;
  endDate: string;
}
export function validateDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Ngày không hợp lệ.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error('Ngày không hợp lệ.');
}
export function calculateQuote(
  product: Product, variantId: string, date: string,
  quantities: Partial<Record<CustomerType, number>>,
  rules: PriceRule[] = [], closures: Closure[] = []
) {
  validateDate(date);
  const variant = product.variants.find((item) => item.id === variantId);
  if (!variant) throw new Error('Gói vé không tồn tại.');
  if (closures.some((item) => item.productId === product.id && (!item.variantId || item.variantId === variantId)
    && item.startDate <= date && date <= item.endDate)) throw new Error('Ngày này đã khóa bán.');
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
  const entries = Object.entries(quantities).filter(([, quantity]) => quantity !== undefined) as [CustomerType, number][];
  if (!entries.length || entries.every(([, quantity]) => quantity === 0)) throw new Error('Chọn ít nhất một khách.');
  const lines = entries.map(([customerType, quantity]) => {
    if (!['ADULT', 'CHILD', 'SENIOR'].includes(customerType)) throw new Error('Nhóm khách không hợp lệ.');
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 50) throw new Error('Số khách phải từ 0 đến 50.');
    if (quantity === 0) return null;
    if (variant.prices[customerType] === undefined) throw new Error('Gói không áp dụng cho nhóm khách này.');
    const candidates = rules.filter((rule) => rule.productId === product.id && rule.variantId === variantId
      && rule.customerType === customerType && rule.startDate <= date && date <= rule.endDate
      && (!rule.weekdays || rule.weekdays.includes(weekday))).sort((a, b) => b.priority - a.priority);
    if (candidates.length > 1 && candidates[0].priority === candidates[1].priority)
      throw new Error('Lịch giá bị xung đột.');
    const unitPrice = candidates[0]?.amount ?? variant.prices[customerType]!;
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) throw new Error('Giá không hợp lệ.');
    return { customerType, quantity, unitPrice, subtotal: quantity * unitPrice, ruleId: candidates[0]?.id ?? 'base' };
  }).filter((line) => line !== null);
  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Tổng tiền vượt giới hạn.');
  return { productId: product.id, productName:product.name, variantId, variantName:variant.name, date, currency: 'VND', lines, total, demo: product.demo ?? true };
}
