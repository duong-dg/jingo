'use client';
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
type Quote = {timeSlot?:{start:string;end?:string;requiresSelection?:boolean};
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
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [identity, setIdentity] = useState<ReturnType<typeof keys> | null>(null);
    const pending = useRef<(ReturnType<typeof keys> & {
        fingerprint: string;
    }) | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/v1/quotes?lang=' + locale, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection), signal: controller.signal })
            .then(async (res) => { const data = await res.json(); if (!res.ok)
            throw new Error(data.message || t("Không thể kiểm tra giá.")); return data; })
            .then(setQuote).catch(e => { if (!controller.signal.aborted)
            setError(errorText(e.message, locale)); });
        return () => controller.abort();
    }, [selection]);
    useEffect(() => { setIdentity(keys()); }, []);
    return <main id="main" className="order-page"><Link className="text-link" href={localizedPath('/', locale)}>{t("← Chọn trải nghiệm khác")}</Link><p className="eyebrow">{t("BƯỚC TIẾP THEO CỦA HÀNH TRÌNH")}</p><h1>{t("Thông tin đặt vé")}</h1><div className="checkout-grid"><section className="order-card"><h2>{t("Thông tin liên hệ")}</h2><p className="order-muted">{t("JinGo sẽ liên hệ để xác nhận nguồn vé và hướng dẫn thanh toán.")}</p><form onSubmit={async (e) => {
            e.preventDefault();
            if (!quote || !identity || quote.demo)
                return;
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setError('');
            const email = String(form.get('email') || '').trim();
            try {
                const payload = { ...selection, ...(locale === 'en' ? { locale } : {}), expectedTotal: quote.total, contact: { name: String(form.get('name')).trim(), phone: String(form.get('phone')).trim(), email, note: String(form.get('note')).trim() }, accepted: true };
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
        }}><fieldset disabled={busy || !quote || quote.demo}><label>{t("Họ và tên")}<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>{t("Số điện thoại")}<input name="phone" type="tel" autoComplete="tel" required pattern="\+?[0-9 \(\)\-]{8,25}" maxLength={25}/></label><label>{(locale==='en'?'Email (required)':'Email (bắt buộc)')}<input name="email" required type="email" autoComplete="email" maxLength={200}/></label><label>{t("Ghi chú")}<textarea name="note" rows={3} maxLength={1000} placeholder={t("Điểm đón hoặc yêu cầu cần trao đổi…")}/></label><label className="order-consent"><input type="checkbox" required/>{t("Tôi hiểu đây là yêu cầu chờ xác nhận, chưa giữ chỗ. Chỉ chuyển khoản sau khi JinGo xác nhận và cung cấp chính sách áp dụng.")}</label><button className="button" disabled={!identity || busy}>{busy ? t("Đang gửi yêu cầu…") : t("Gửi yêu cầu đặt vé ↗")}</button></fieldset></form>{error && <div className="order-error" role="alert">{error}<br /><button type="button" className="text-link" onClick={() => window.location.reload()}>{t("Tải lại giá")}</button></div>}</section><aside className="order-card order-summary"><p className="eyebrow">{t("LỰA CHỌN CỦA BẠN")}</p><h2>{quote?.productName || t("Chi tiết giá")}</h2><p>{quote?.variantName}</p>{quote?.timeSlot?.requiresSelection&&<p>{locale==='en'?'Visit time':'Giờ sử dụng'}: {quote.timeSlot.start}{quote.timeSlot.end?' – '+quote.timeSlot.end:''} (GMT+7)</p>}<p>{t("Ngày sử dụng:")} <strong>{selection.date}</strong></p>{quote ? <>{quote.lines.map(line => <div className="order-price-row" key={line.customerType}><span>{line.quantity} × {t(labels[line.customerType])}<small>{money(line.unitPrice)}{t(" / khách")}</small></span><strong>{money(line.subtotal)}</strong></div>)}<div className="order-grand-total"><span>{t("Tổng tiền")}</span><strong>{money(quote.total)}</strong></div>{quote.demo && <p className="order-error">{t("Sản phẩm minh họa chưa nhận đơn. Quản trị cần thiết lập sản phẩm thật trước khi mở bán.")}</p>}</> : <p>{t("Đang kiểm tra giá…")}</p>}<div className="order-info">{t("Chưa thu tiền tại bước này. JinGo kiểm tra lại với đối tác trước khi xác nhận yêu cầu của bạn.")}</div></aside></div></main>;
}
