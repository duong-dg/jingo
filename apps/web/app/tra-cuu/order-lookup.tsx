'use client';
import { useLocale } from '../components/locale-context';
import { translator, localizedPath, dateLocale, errorText } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import Link from 'next/link';
const money = (v: number) => v.toLocaleString('vi-VN') + 'đ';
const bookingLabels: Record<string, string> = { REQUESTED: 'Chờ JinGo xác nhận', CONFIRMED: 'Đã đặt vé', CANCELLED: 'Đã hủy' };
interface Order {
    ticketAccess?:'EMAIL_LINK';
    code: string;
    bookingStatus: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    instructions: string;
    deliveredGuests: number;
    totalGuests: number;
    snapshot: {timeSlot?:{start:string;end?:string;requiresSelection?:boolean};
        productName: string;
        variantName: string;
        date: string;
        total: number;
        policy: string;
    };
    tickets: {
        id: string;
        code: string;
        kind: string;
        covers: number;
        note: string;
    }[];
}
export function OrderLookup() {
    const locale = useLocale(), t = translator(locale);
    const [code, setCode] = useState('');
    const [email,setEmail]=useState('');
    const [key, setKey] = useState('');
    const [order, setOrder] = useState<Order | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const lookup = async (c: string, k: string) => { setBusy(true); setError(''); setOrder(null); try {
        const res = await fetch('/api/v1/orders/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jingo-Request': '1' }, body: JSON.stringify({ code: c.toUpperCase().trim(), ...(k.trim()?{accessKey:k.trim()}:{email:email.trim()}) }), cache: 'no-store' });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.message || t("Không thể tra cứu."));
        setOrder(data);
    }
    catch (e) {
        setError(errorText((e as Error).message, locale));
    }
    finally {
        setBusy(false);
    } };
    useEffect(() => { const fragment = window.location.hash.slice(1).split(':'); if (fragment.length === 2 && /^JG[A-F0-9]{10}$/.test(fragment[0]) && /^[a-f0-9]{64}$/.test(fragment[1])) {
        setCode(fragment[0]);
        setKey(fragment[1]);
        void lookup(fragment[0], fragment[1]);
    } }, []);
    return <main id="main" className="order-page"><p className="eyebrow">{t("ĐỒNG HÀNH CÙNG CHUYẾN ĐI")}</p><h1>{t("Đơn hàng của bạn")}</h1>{order?.bookingStatus==='CONFIRMED'&&!order.tickets.length&&<div className="order-info" role="status"><strong>{t('Đặt vé thành công. JinGo sẽ gửi vé qua email sau khi xử lý.')}</strong></div>}<section className="order-card lookup-form"><form onSubmit={e => { e.preventDefault(); void lookup(code, key); }}><label>{t("Mã đơn")}<input value={code} onChange={e => { setCode(e.target.value); setOrder(null); }} placeholder="JG…" required autoComplete="off"/></label>{!key&&<label>{locale==='en'?'Booking email':'Email đã đặt vé'}<input type="email" value={email} onChange={e=>{setEmail(e.target.value);setOrder(null);}} required autoComplete="email"/></label>}<button className="button" disabled={busy}>{busy ? t("Đang tra cứu…") : t("Tra cứu / cập nhật")}</button></form><p className="order-muted">{locale==='en'?'Enter your booking code and the email used to book. Email links open your booking directly.':'Nhập mã booking và email đã dùng khi đặt vé. Link trong email mở trực tiếp đơn hàng.'}</p>{error && <p className="order-error" role="alert">{error}</p>}</section>{order && <><div className="order-info"><strong>{t("Lưu đường dẫn này để quay lại nhận vé.")}</strong>{key&&<button className="outline-button" onClick={async () => { try {
        await navigator.clipboard.writeText(`${window.location.origin}${localizedPath('/tra-cuu', locale)}#${order.code}:${key}`);
        setCopied(true);
    }
    catch {
        setError(t("Không sao chép được. Hãy lưu mã đơn và khóa tra cứu."));
    } }}>{copied ? t("Đã sao chép") : t("Sao chép link tra cứu")}</button>}</div><div className="checkout-grid"><section className="order-card"><div className="order-title-row"><h2>{order.code}</h2><span className="order-status">{t(bookingLabels[order.bookingStatus])}</span></div><h3>{order.snapshot.productName}</h3><p>{order.snapshot.variantName} · {order.snapshot.date}</p>{order.snapshot.timeSlot?.requiresSelection!==false&&order.snapshot.timeSlot&&<p>{order.snapshot.timeSlot.start}{order.snapshot.timeSlot.end?' – '+order.snapshot.timeSlot.end:''} (GMT+7)</p>}<div className="order-price-row"><span>{t("Thanh toán")}</span><strong>{order.paymentStatus === 'PAID' ? t("Đã thanh toán") : t("Chưa thanh toán")}</strong></div><div className="order-price-row"><span>{t("Đã giao vé cho")}</span><strong>{order.deliveredGuests}/{order.totalGuests} {t("khách")}</strong></div><div className="order-grand-total"><span>{t("Tổng tiền")}</span><strong>{money(order.snapshot.total)}</strong></div>{order.instructions && <div className="order-info"><h3>{t("Hướng dẫn từ JinGo")}</h3><p className="preserve-lines">{order.instructions}</p></div>}{order.bookingStatus === 'REQUESTED' && <div className="order-info">{t("Đơn của bạn đã được ghi nhận. JinGo sẽ gửi vé qua email sau khi xử lý.")}</div>}{order.bookingStatus === 'CANCELLED' && <p className="order-error">{t("Đơn đã hủy. Không chuyển khoản cho đơn này.")}</p>}</section><section className="order-card"><h2>{t("Vé / voucher của bạn")}</h2>{order.ticketAccess==='EMAIL_LINK'&&<p className="order-info">{locale==='en'?'Open the link in your JinGo email to view ticket codes for this counter booking.':'Mở đường dẫn trong email JinGo để xem mã vé của đơn mua tại quầy.'}</p>}{!order.tickets.length && order.ticketAccess!=='EMAIL_LINK' && <p className="order-muted">{t("Chưa có vé được giao. Bấm “Tra cứu / cập nhật” để kiểm tra trạng thái mới.")}</p>}{order.tickets.map(ticket => <article className="issued-ticket" key={ticket.id}><small>{ticket.kind === 'TOUR_VOUCHER' ? t("VOUCHER TOUR") : t("MÃ NHÀ CUNG CẤP")}</small><strong className="ticket-code">{ticket.code}</strong><p>{t("Áp dụng cho")} {ticket.covers} {t("khách")}</p>{ticket.note && <p className="preserve-lines">{ticket.note}</p>}<small>{t("Xuất trình theo hướng dẫn của đơn vị tổ chức. Mã này chưa được chuyển thành QR tự động.")}</small></article>)}<p className="order-muted">{order.snapshot.policy}</p></section></div></>}<Link className="text-link" href={localizedPath('/', locale)}>{t("← Tiếp tục khám phá")}</Link></main>;
}
