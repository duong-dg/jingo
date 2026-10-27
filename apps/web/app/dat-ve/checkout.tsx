'use client';
import{InventoryNotice}from'../components/inventory-notice';import type{InventoryAvailability}from'../../lib/inventory';
import { useLocale } from '../components/locale-context';
import { translator, localizedPath, dateLocale, errorText } from '../../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
type Selection = {slotId?:string;
    productId: string;
    variantId: string;
    date: string;
    quantities: Record<string, number>;
};
type Quote = {discount?:{code:string;amount:number;subtotal:number};inventory?:InventoryAvailability;timeSlot?:{start:string;end?:string;requiresSelection?:boolean};
    productName: string;
    variantName: string;
    total: number;
    lines: {
        customerType: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }[];
    demo: boolean;
};
const labels: Record<string, string> = { ADULT: 'Người lớn', CHILD: 'Trẻ em', SENIOR: 'Người cao tuổi' };
const money = (value: number) => value.toLocaleString('vi-VN') + 'đ';
function keys() { const bytes = crypto.getRandomValues(new Uint8Array(32)); return { requestId: crypto.randomUUID(), accessKey: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') }; }
export function Checkout({ selection }: {
    selection: Selection;
}) {
    const locale = useLocale(), t = translator(locale);
    const [quote, setQuote] = useState<Quote | null>(null);
    const[voucherInput,setVoucherInput]=useState(''),[quoteBusy,setQuoteBusy]=useState(false);const quoteSerial=useRef(0);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [identity, setIdentity] = useState<ReturnType<typeof keys> | null>(null);
    const pending = useRef<(ReturnType<typeof keys> & {
        fingerprint: string;
    }) | null>(null);
    async function loadQuote(voucherCode='',signal?:AbortSignal){const serial=++quoteSerial.current;setQuoteBusy(true);setQuote(null);setError('');try{const response=await fetch('/api/v1/quotes?lang='+locale,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...selection,...(voucherCode?{voucherCode}:{})}),signal});const data=await response.json();if(!response.ok)throw new Error(data.message||t('Không thể kiểm tra giá.'));if(serial===quoteSerial.current)setQuote(data);}catch(e){if(!signal?.aborted&&serial===quoteSerial.current)setError(locale==='en'?'Unable to apply this price or voucher. Check the code, dates, minimum order and availability, or remove the voucher to continue.':(e as Error).message);}finally{if(serial===quoteSerial.current)setQuoteBusy(false);}}
    useEffect(()=>{const controller=new AbortController();setVoucherInput('');void loadQuote('',controller.signal);return()=>{controller.abort();quoteSerial.current++;};},[selection,locale]);
    useEffect(() => { setIdentity(keys()); }, []);
    return <main id="main" className="order-page"><Link className="text-link" href={localizedPath('/', locale)}>{t("← Chọn trải nghiệm khác")}</Link><p className="eyebrow">{t("BƯỚC TIẾP THEO CỦA HÀNH TRÌNH")}</p><h1>{t("Thông tin đặt vé")}</h1><div className="checkout-grid"><section className="order-card"><h2>{t("Thông tin liên hệ")}</h2><p className="order-muted">{t("Đặt vé ngay. JinGo sẽ gửi xác nhận và vé qua email của bạn.")}</p><form onSubmit={async (e) => {
            e.preventDefault();
            if (!quote || !identity || quote.demo || quoteBusy)
                return;
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setError('');
            const email = String(form.get('email') || '').trim();
            try {
                const payload = { ...selection,...(quote.discount?{voucherCode:quote.discount.code}:{}), ...(locale === 'en' ? { locale } : {}), expectedTotal: quote.total, contact: { name: String(form.get('name')).trim(), phone: String(form.get('phone')).trim(), email, note: String(form.get('note')).trim() }, accepted: true };
                const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
                const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
                const storageKey = 'jingo-pending:' + selection.productId + ':' + selection.variantId + ':' + selection.date;
                try {
                    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
                    if (saved?.fingerprint === fingerprint && /^[a-f0-9]{64}$/.test(saved.accessKey) && typeof saved.requestId === 'string')
                        pending.current = saved;
                }
                catch { /* Storage is optional; in-memory retry remains available. */ }
                if (pending.current?.fingerprint !== fingerprint)
                    pending.current = { ...keys(), fingerprint };
                try {
                    sessionStorage.setItem(storageKey, JSON.stringify(pending.current));
                }
                catch { /* Private browsing may disable storage. */ }
                const res = await fetch('/api/v1/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jingo-Request': '1' }, body: JSON.stringify({ ...payload, requestId: pending.current.requestId, accessKey: pending.current.accessKey }) });
                const data = await res.json();
                if (!res.ok)
                    throw new Error(data.message || t("Chưa gửi được yêu cầu."));
                window.location.assign(localizedPath('/tra-cuu', locale) + `#${encodeURIComponent(data.code)}:${data.accessKey}`);
            }
            catch (err) {
                setError(errorText((err as Error).message, locale));
                setBusy(false);
            }
        }}><fieldset disabled={busy || quoteBusy || !quote || quote.demo}><label>{t("Họ và tên")}<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>{t("Số điện thoại")}<input name="phone" type="tel" autoComplete="tel" required pattern="\+?[0-9 \(\)\-]{8,25}" maxLength={25}/></label><label>{(locale==='en'?'Email (required)':'Email (bắt buộc)')}<input name="email" required type="email" autoComplete="email" maxLength={200}/></label><label>{t("Ghi chú")}<textarea name="note" rows={3} maxLength={1000} placeholder={t("Điểm đón hoặc yêu cầu cần trao đổi…")}/></label><button className="button" disabled={!identity || busy}>{busy ? t("Đang đặt vé…") : t("Đặt vé ↗")}</button></fieldset></form>{error && <div className="order-error" role="alert">{error}<br /><button type="button" className="text-link" onClick={() => window.location.reload()}>{t("Tải lại giá")}</button></div>}</section><aside className="order-card order-summary"><p className="eyebrow">{t("LỰA CHỌN CỦA BẠN")}</p><h2>{quote?.productName || t("Chi tiết giá")}</h2><p>{quote?.variantName}</p><InventoryNotice inventory={quote?.inventory}/>{quote?.timeSlot?.requiresSelection&&<p>{locale==='en'?'Visit time':'Giờ sử dụng'}: {quote.timeSlot.start}{quote.timeSlot.end?' – '+quote.timeSlot.end:''} (GMT+7)</p>}<p>{t("Ngày sử dụng:")} <strong>{selection.date}</strong></p>{quote ? <>{quote.lines.map(line => <div className="order-price-row" key={line.customerType}><span>{line.quantity} × {t(labels[line.customerType])}<small>{money(line.unitPrice)}{t(" / khách")}</small></span><strong>{money(line.subtotal)}</strong></div>)}{quote.discount&&<div className="order-price-row"><span>{locale==='en'?'Voucher':'Mã giảm giá'} · {quote.discount.code}</span><strong>−{money(quote.discount.amount)}</strong></div>}<div className="order-grand-total"><span>{t("Tổng tiền")}</span><strong>{money(quote.total)}</strong></div>{quote.demo && <p className="order-error">{t("Sản phẩm minh họa chưa nhận đơn. Quản trị cần thiết lập sản phẩm thật trước khi mở bán.")}</p>}</> : <p>{t("Đang kiểm tra giá…")}</p>}<form className="checkout-voucher" onSubmit={event=>{event.preventDefault();void loadQuote(voucherInput.trim().toUpperCase());}}><fieldset disabled={busy||quoteBusy||!!quote?.demo}><label>{locale==='en'?'Voucher code':'Mã giảm giá'}<input maxLength={40} value={voucherInput} onChange={event=>setVoucherInput(event.target.value.toUpperCase())} placeholder={locale==='en'?'Enter code':'Nhập mã ưu đãi'} autoComplete="off"/></label><div><button type="submit" className="outline-button" disabled={!voucherInput.trim()}>{quoteBusy?(locale==='en'?'Checking…':'Đang kiểm tra…'):(locale==='en'?'Apply':'Áp dụng')}</button>{(voucherInput||quote?.discount)&&<button type="button" className="text-link" onClick={()=>{setVoucherInput('');void loadQuote('');}}>{locale==='en'?'Remove voucher':'Bỏ mã'}</button>}</div></fieldset></form><div className="order-info">{t("Đơn đặt vé được xác nhận ngay. Vé sẽ được gửi qua email sau khi xử lý.")}</div></aside></div></main>;
}
