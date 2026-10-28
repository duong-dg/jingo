'use client';
import { useEffect, useState } from 'react';
import { readCart, useTicketCart, writeCart, type CartLine } from '../../lib/ticket-cart';
import type { InventoryAvailability } from '../../lib/inventory';
import { saleSignature } from '../../lib/sales-cart';
export type SaleQuote = { total: number; unitPrices?: Record<string, number>; lines: { customerType: string; unitPrice: number; quantity: number }[]; inventory?: InventoryAvailability; timeSlot?: { id: string; start: string } };
export async function salesQuote(path: string, line: Pick<CartLine, 'productId' | 'variantId' | 'date' | 'slotId' | 'quantities'>, signal?: AbortSignal): Promise<SaleQuote> {
  const response = await fetch('/api/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jingo-Admin': '1', 'X-Jingo-POS': '1', 'X-Jingo-Partner': '1' }, cache: 'no-store', signal, body: JSON.stringify({ productId: line.productId, variantId: line.variantId, date: line.date, ...(line.slotId ? { slotId: line.slotId } : {}), quantities: line.quantities }) });
  const data = await response.json(); if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('\n') : data.message || 'Không lấy được giá.'); return data;
}
export function useSalesBasket(scope: string, quotePath: string) {
  const items = useTicketCart(scope), signature = saleSignature(items), [checked, setChecked] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0), [rates, setRates] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    const abort = new AbortController(); setChecked(''); setError('');
    if (!items.length) { setBusy(false); return; } setBusy(true);
    const timer = setTimeout(async () => {
      try { const current = readCart(scope), updated: CartLine[] = [], prices: Record<string, Record<string, number>> = {};
        for (const line of current) { const quote = await salesQuote(quotePath, line, abort.signal); updated.push({ ...line, expectedTotal: quote.total }); prices[line.id] = { ...quote.unitPrices, ...Object.fromEntries(quote.lines.map(l => [l.customerType, l.unitPrice])) }; }
        if (!abort.signal.aborted && saleSignature(readCart(scope)) === signature) { writeCart(scope, updated); setRates(prices); setChecked(signature); }
      } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); } finally { if (!abort.signal.aborted) setBusy(false); }
    }, 220); return () => { clearTimeout(timer); abort.abort(); };
  }, [scope, quotePath, signature, revision]);
  return { items, signature, rates, error, busy, ready: !!items.length && checked === signature && !busy && !error, total: items.reduce((n, i) => n + i.expectedTotal, 0), retry: () => setRevision(n => n + 1) };
}
