'use client';
import{errorText}from'../../lib/i18n';
import{saleDayAvailable,type CalendarProduct}from'../../lib/sale-calendar';
import { guestLabel } from '../../lib/guests';
import { useEffect, useState } from 'react';
import { readCart, useTicketCart, writeCart, type CartLine } from '../../lib/ticket-cart';
import { useLocale } from './locale-context';
import { DatePicker } from './date-picker';

export type OnlineSavings={amount:number;subtotal:number};
export const cartSelection = (items: CartLine[]) => JSON.stringify(items.map(i => ({ id: i.id, productId: i.productId, variantId: i.variantId, date: i.date, slotId: i.slotId, quantities: i.quantities, voucherCode: i.voucherCode })));
export const cartMoney = (value: number) => value.toLocaleString('vi-VN') + ' ₫';
export function useWebCart() {
  const items = useTicketCart('WEB'), en = useLocale() === 'en', signature = cartSelection(items);
  const[savings,setSavings]=useState<Record<string,OnlineSavings>>({});
  const [checked, setChecked] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setChecked(''); setError('');
    if (!items.length) { setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const updated: CartLine[] = [],discounts:Record<string,OnlineSavings>={};
        for (const line of readCart('WEB')) {
          const response = await fetch('/api/v1/quotes?lang=' + (en ? 'en' : 'vi'), { method: 'POST', cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: line.productId, variantId: line.variantId, date: line.date, ...(line.slotId ? { slotId: line.slotId } : {}), quantities: line.quantities, ...(line.voucherCode ? { voucherCode: line.voucherCode } : {}) }) });
          const quote = await response.json(); if (!response.ok || quote.demo) throw new Error(quote.message || (en ? 'This package is unavailable.' : 'Gói vé này chưa mở bán.'));
          if(quote.onlineDiscount)discounts[line.id]=quote.onlineDiscount;
          updated.push({ ...line, expectedTotal: quote.total, productName: quote.productName || line.productName, variantName: quote.variantName || line.variantName });
        }
        if (!controller.signal.aborted && cartSelection(readCart('WEB')) === signature) { writeCart('WEB', updated);setSavings(discounts); setChecked(signature); }
      } catch (e) { if (!controller.signal.aborted) setError(errorText((e as Error).message,en?'en':'vi')); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [signature, en, refresh]);
  return { items, savings,total: items.reduce((sum, i) => sum + i.expectedTotal, 0), busy, error, ready: !!items.length && checked === signature && !busy && !error, retry: () => setRefresh(n => n + 1) };
}
export function WebCartEditor({ items, compact = false,savings={} }: { items: CartLine[]; compact?: boolean;savings?:Record<string,OnlineSavings> }) {
  const en = useLocale() === 'en', today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [editError, setEditError] = useState(''),[calendars,setCalendars]=useState<Record<string,CalendarProduct>>({}),[clock,setClock]=useState(Date.now);const productIds=[...new Set(items.map(i=>i.productId))].sort().join(',');
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{const controller=new AbortController();const ids=productIds?productIds.split(','):[];void Promise.allSettled(ids.map(async id=>{const response=await fetch('/api/v1/products/'+encodeURIComponent(id)+'/sale-calendar',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();return[id,(await response.json()).data]as const;})).then(results=>{if(controller.signal.aborted)return;setCalendars(Object.fromEntries(results.flatMap(r=>r.status==='fulfilled'?[r.value]:[])));if(results.some(r=>r.status==='rejected'))setEditError(en?'Could not load the sales calendar. Refresh to edit dates.':'Chưa tải được lịch bán. Tải lại trang để sửa ngày.');});return()=>controller.abort();},[productIds,en]);
  function patch(id: string, update: Partial<CartLine>) {
    const next = readCart('WEB').map(i => i.id === id ? { ...i, ...update } : i).filter(i => Object.values(i.quantities).some(q => q > 0)), changed = next.find(i => i.id === id);
    if (changed && next.some(i => i.id !== id && i.productId === changed.productId && i.variantId === changed.variantId && i.date === changed.date && (i.slotId || '') === (changed.slotId || ''))) { setEditError(en ? 'This package and date are already in your cart. Update its quantity instead.' : 'Giỏ đã có gói vé cùng ngày và suất này. Hãy chỉnh số lượng ở gói đã có.'); return; }
    if (next.reduce((sum, i) => sum + Object.values(i.quantities).reduce((n, q) => n + q, 0), 0) > 150) { setEditError(en ? 'Each cart can contain up to 150 guests.' : 'Mỗi giỏ tối đa 150 khách.'); return; }
    setEditError(''); writeCart('WEB', next);
  }
  return <div className={'web-cart-items' + (compact ? ' compact' : '')}>{editError && <p className="web-cart-error" role="alert">{editError}</p>}{items.map(line => <article className="web-cart-item" key={line.id}>
    <div className="web-cart-item-heading"><div className="web-cart-thumb">{line.coverId ? <img src={'/api/v1/media/' + encodeURIComponent(line.coverId)} alt=""/> : <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z"/><path d="M14 5v3m0 3v2m0 3v3"/></svg>}</div><div><h3>{line.productName}</h3><p>{line.variantName}</p><span className="web-cart-date">{new Intl.DateTimeFormat(en ? 'en-GB' : 'vi-VN').format(new Date(line.date + 'T12:00:00'))}{line.slotLabel ? ' · ' + line.slotLabel : ''}</span></div><button type="button" className="web-cart-remove" aria-label={(en ? 'Remove ' : 'Xóa ') + line.variantName} onClick={() => writeCart('WEB', readCart('WEB').filter(i => i.id !== line.id))}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></svg></button></div>
    <div className="web-cart-guests">{Object.entries(line.quantities).map(([type, quantity]) => { const label = guestLabel(type, en); return <div className="web-cart-guest" key={type}><span>{label}</span><div className="web-cart-stepper"><button type="button" aria-label={(en ? 'Decrease ' : 'Giảm ') + label + ' ' + line.variantName} disabled={quantity === 0} onClick={() => patch(line.id, { quantities: { ...line.quantities, [type]: quantity - 1 } })}>−</button><input aria-label={label + ' ' + line.variantName} type="number" inputMode="numeric" min={0} max={50} value={quantity} onChange={e => patch(line.id, { quantities: { ...line.quantities, [type]: Math.min(50, Math.max(0, Math.trunc(Number(e.target.value) || 0))) } })}/><button type="button" disabled={quantity >= 50} aria-label={(en ? 'Increase ' : 'Tăng ') + label + ' ' + line.variantName} onClick={() => patch(line.id, { quantities: { ...line.quantities, [type]: quantity + 1 } })}>+</button></div></div>; })}</div>
    <div className="web-cart-item-bottom"><details><summary>{en ? 'Edit date / voucher' : 'Sửa ngày / mã giảm giá'}</summary><DatePicker label={en ? 'Visit date' : 'Ngày sử dụng'} min={today} value={line.date} disabled={!calendars[line.productId]} isDateDisabled={date=>!saleDayAvailable(calendars[line.productId],date,clock,line.variantId)} onChange={date => patch(line.id, { date })}/><label>{en ? 'Voucher for this package' : 'Mã giảm giá cho gói này'}<input maxLength={40} value={line.voucherCode || ''} placeholder={en ? 'Enter code' : 'Nhập mã nếu có'} onChange={e => patch(line.id, { voucherCode: e.target.value.trim().toUpperCase() || undefined })}/></label></details><div>{savings[line.id]&&<small className="web-online-savings"><del>{cartMoney(savings[line.id].subtotal)}</del> · {en?'Online savings':'Ưu đãi online'} −{cartMoney(savings[line.id].amount)}</small>}<strong>{cartMoney(line.expectedTotal)}</strong></div></div>
  </article>)}</div>;
}
