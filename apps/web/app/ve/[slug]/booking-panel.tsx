'use client';
import { useState } from 'react';
type CustomerType = 'ADULT' | 'CHILD' | 'SENIOR';
const labels: Record<CustomerType, string> = { ADULT: 'Người lớn', CHILD: 'Trẻ em', SENIOR: 'Người cao tuổi' };
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
interface Product { id: string; variants: { id: string; name: string; prices: Partial<Record<CustomerType, number>> }[] }
export function BookingPanel({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [date, setDate] = useState('');
  const [quantities, setQuantities] = useState<Record<CustomerType, number>>({ ADULT: 1, CHILD: 0, SENIOR: 0 });
  const [quote, setQuote] = useState<{ total: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const variant = product.variants.find((item) => item.id === variantId)!;
  const reset = () => { setQuote(null); setError(''); };
  return <aside className="booking"><p className="eyebrow">LÊN KẾ HOẠCH CHUYẾN ĐI</p><h2>Chọn trải nghiệm</h2><form onSubmit={async (event) => {
    event.preventDefault(); reset(); setLoading(true);
    try {
      const selected = Object.fromEntries(Object.entries(quantities).filter(([type]) => variant.prices[type as CustomerType] !== undefined));
      const response = await fetch('/api/v1/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, variantId, date, quantities: selected }) });
      const body = await response.json();
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || 'Chưa thể lấy giá.');
      setQuote(body);
    } catch (err) { setError(err instanceof Error ? err.message : 'Kết nối bị gián đoạn. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }}>
    <fieldset disabled={loading}><label htmlFor="visit-date">Ngày sử dụng</label><input required id="visit-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); reset(); }}/>
    <label htmlFor="variant">Hạng / gói vé</label><select id="variant" value={variantId} onChange={(e) => { setVariantId(e.target.value); reset(); }}>{product.variants.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
    {(Object.keys(variant.prices) as CustomerType[]).map((type) => <div className="guest-row" key={type}><label htmlFor={`guest-${type}`}>{labels[type]}<small>{money(variant.prices[type]!)} · giá cơ bản mẫu</small></label><input id={`guest-${type}`} type="number" min="0" max="50" step="1" required value={quantities[type]} onChange={(e) => { setQuantities({ ...quantities, [type]: Number(e.target.value) }); reset(); }}/></div>)}
    <button className="button" type="submit">{loading ? 'Đang kiểm tra…' : 'Xem giá minh họa ↗'}</button></fieldset>
    <div aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{quote && <div className="quote"><span>Tổng giá minh họa</span><strong>{money(quote.total)}</strong><small>Chưa tạo đơn, giữ chỗ hoặc nhận thanh toán.</small></div>}</div>
  </form></aside>;
}
