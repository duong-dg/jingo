'use client';
import { useEffect, useState } from 'react';
export type CartLine = { id: string; productId: string; variantId: string; productName: string; variantName: string; date: string; slotId?: string; quantities: Record<string, number>; expectedTotal: number; voucherCode?: string; coverId?: string; slotLabel?: string };
const memory = new Map<string, CartLine[]>();
function storage(scope: string) { return scope === 'WEB' ? localStorage : sessionStorage; }
export function readCart(scope: string): CartLine[] {
  if (!scope || typeof window === 'undefined') return [];
  if (memory.has(scope)) return memory.get(scope)!;
  try { const data = JSON.parse(storage(scope).getItem('jingo-basket:' + scope) || '[]'); if (!Array.isArray(data) || data.length > 20) return []; return data.filter(i => i && typeof i.id === 'string' && typeof i.productId === 'string' && typeof i.variantId === 'string' && typeof i.productName === 'string' && typeof i.variantName === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(i.date) && i.quantities && typeof i.quantities === 'object' && Object.values(i.quantities).every(n => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 50) && Number.isSafeInteger(i.expectedTotal) && i.expectedTotal >= 0); } catch { return memory.get(scope) || []; }
}
export function writeCart(scope: string, lines: CartLine[]) { try { storage(scope).setItem('jingo-basket:' + scope, JSON.stringify(lines)); memory.delete(scope); } catch { memory.set(scope, lines); } window.dispatchEvent(new Event('jingo-basket')); }
export function addTicket(scope: string, line: Omit<CartLine, 'id'>) {
  if (!scope) throw new Error('Đăng nhập trước khi thêm vé.');
  const items = readCart(scope), existing = items.find(i => i.productId === line.productId && i.variantId === line.variantId && i.date === line.date && (i.slotId || '') === (line.slotId || ''));
  if (existing) { const quantities = { ...existing.quantities }; for (const [key, n] of Object.entries(line.quantities)) quantities[key] = (quantities[key] || 0) + n; if (Object.values(quantities).some(n => n > 50)) throw new Error('Mỗi nhóm khách tối đa 50 vé trong cùng gói/ngày.'); existing.quantities = quantities; existing.expectedTotal += line.expectedTotal; }
  else { if (items.length >= 20) throw new Error('Mỗi giỏ tối đa 20 gói vé.'); items.push({ ...line, id: crypto.randomUUID() }); }
  if (items.reduce((sum, i) => sum + Object.values(i.quantities).reduce((n, v) => n + v, 0), 0) > 150) throw new Error('Mỗi giỏ tối đa 150 khách.'); writeCart(scope, items);
}
export function useTicketCart(scope: string) { const [items, setItems] = useState<CartLine[]>([]); useEffect(() => { const load = () => setItems(readCart(scope)); load(); window.addEventListener('jingo-basket', load); window.addEventListener('storage', load); return () => { window.removeEventListener('jingo-basket', load); window.removeEventListener('storage', load); }; }, [scope]); return items; }
export function rememberCart(scope: string, code: string) { try { sessionStorage.setItem('jingo-basket-result:' + scope, code); } catch {} }
export function cartKeys() { return { requestId: crypto.randomUUID(), accessKey: Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('') }; }

export function openTicketCart() { window.dispatchEvent(new Event("jingo-open-cart")); }
