import type{SaleClosure}from'./sale-calendar';
import type { CartLine } from './ticket-cart';
export type SaleGroup = 'ADULT' | 'CHILD' | 'SENIOR' | 'LOCAL_ADULT' | 'LOCAL_CHILD' | 'LOCAL_SENIOR';
export type SaleProduct = { saleClosures?:SaleClosure[];id: string; name: string; destination: string; cover?: { id: string; alt: string } | null; description?: string; variants: { id: string; name: string; prices?: Partial<Record<SaleGroup, number>>; customerTypes?: SaleGroup[]; conditions?: Partial<Record<SaleGroup, string>>; timeSlots?: { id: string; start: string; end?: string }[] }[] };
export const saleIdentity = (line: Pick<CartLine, 'productId' | 'variantId' | 'date' | 'slotId'>) => JSON.stringify([line.productId, line.variantId, line.date, line.slotId || '']);
export const saleSignature = (items: CartLine[]) => JSON.stringify(items.map(i => ({ id: i.id, key: saleIdentity(i), quantities: i.quantities })));
export function setSaleQuantity(items: CartLine[], selection: CartLine, group: string, quantity: number, rates: Partial<Record<string, number>> = {}): CartLine[] {
  if (!['ADULT', 'CHILD', 'SENIOR', 'LOCAL_ADULT', 'LOCAL_CHILD', 'LOCAL_SENIOR'].includes(group) || !Number.isInteger(quantity) || quantity < 0 || quantity > 50) throw new Error('Số lượng mỗi nhóm khách từ 0 đến 50.');
  const existing = items.find(i => saleIdentity(i) === saleIdentity(selection)), quantities = { ...(existing || selection).quantities, [group]: quantity };
  const count = Object.values(quantities).reduce((n, q) => n + q, 0);
  const next = count ? { ...(existing || selection), quantities, expectedTotal: Object.keys(quantities).every(g => !quantities[g] || rates[g] !== undefined) ? Object.entries(quantities).reduce((n, [g, q]) => n + q * (rates[g] || 0), 0) : (existing || selection).expectedTotal } : null;
  const result = existing ? items.flatMap(i => i.id === existing.id ? next ? [next] : [] : [i]) : next ? [...items, next] : [...items];
  if (result.length > 20) throw new Error('Mỗi giỏ tối đa 20 gói vé.');
  if (result.reduce((n, i) => n + Object.values(i.quantities).reduce((sum, q) => sum + q, 0), 0) > 150) throw new Error('Mỗi giỏ tối đa 150 khách.');
  return result;
}
