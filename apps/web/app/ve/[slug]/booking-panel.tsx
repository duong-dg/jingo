'use client';
import { useLocale } from '../../components/locale-context';
import { translator, localizedPath, dateLocale, errorText } from '../../../lib/i18n';
import { useEffect, useRef, useState } from 'react';
type Group = 'ADULT' | 'CHILD' | 'SENIOR';
const labels = { ADULT: 'Người lớn', CHILD: 'Trẻ em', SENIOR: 'Người cao tuổi' };
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
interface Product {
    id: string;
    slug: string;
    name: string;
    demo?: boolean;
    variants: {
        id: string;
        name: string;
        prices: Partial<Record<Group, number>>;
        conditions?: Partial<Record<Group, string>>;
    }[];
}
interface Rates {
    lines: {
        customerType: Group;
        unitPrice: number;
    }[];
}
function localToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function addDays(date: string, count: number) { const day = new Date(`${date}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + count); return day.toISOString().slice(0, 10); }
function formatDay(date: string, locale: 'vi' | 'en') { return new Intl.DateTimeFormat(dateLocale(locale), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)); }
export function BookingPanel({ product }: {
    product: Product;
}) {
    const locale = useLocale(), t = translator(locale);
    const dayLabel = (date: string) => formatDay(date, locale);
    const [today] = useState(localToday);
    const [variantId, setVariantId] = useState(product.variants[0].id);
    const [date, setDate] = useState(today);
    const firstType = Object.keys(product.variants[0].prices)[0] as Group;
    const [quantities, setQuantities] = useState<Record<Group, number>>({ ADULT: 0, CHILD: 0, SENIOR: 0, [firstType]: 1 });
    const [rates, setRates] = useState<Rates | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const previousOverflow = useRef('');
    const variant = product.variants.find((item) => item.id === variantId)!;
    useEffect(() => {
        const controller = new AbortController();
        setRates(null);
        setError('');
        setLoading(true);
        if (!date || date < today) {
            setError(t("Chọn ngày sử dụng từ hôm nay."));
            setLoading(false);
            return;
        }
        fetch(`/api/v1/products/${encodeURIComponent(product.slug)}/prices?lang=${locale}&date=${date}&variantId=${encodeURIComponent(variantId)}`, { signal: controller.signal, cache: 'no-store' })
            .then(async (response) => { const body = await response.json(); if (!response.ok)
            throw new Error(body.message || t("Không lấy được giá.")); return body; })
            .then(body => { if (!controller.signal.aborted)
            setRates(body); })
            .catch(err => { if (!controller.signal.aborted)
            setError(errorText(err.message, locale) || t("Mất kết nối. Vui lòng thử lại.")); })
            .finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [date, variantId, product.slug, today]);
    useEffect(() => () => { document.body.style.overflow = previousOverflow.current; }, []);
    const count = (Object.keys(variant.prices) as Group[]).reduce((sum, type) => sum + quantities[type], 0);
    const total = rates?.lines.reduce((sum, line) => sum + line.unitPrice * quantities[line.customerType], 0) ?? 0;
    const open = () => { previousOverflow.current = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.current?.showModal(); dialog.current?.querySelector('.ticket-scroll')?.scrollTo({ top: 0 }); };
    const close = () => { dialog.current?.close(); document.body.style.overflow = previousOverflow.current; };
    const changeCount = (type: Group, step: number) => { setQuantities(q => ({ ...q, [type]: Math.max(0, Math.min(50, q[type] + step)) })); };
    const selectVariant = (id: string) => { setVariantId(id); const v = product.variants.find(x => x.id === id)!; const first = Object.keys(v.prices)[0] as Group; setQuantities({ ADULT: 0, CHILD: 0, SENIOR: 0, [first]: 1 }); };
    return <aside className="booking booking-launcher"><p className="eyebrow">{t("MỘT TRẢI NGHIỆM ĐÁNG NHỚ")}</p><h2>{t("Lên lịch đi thôi.")}</h2><p>{t("Chọn ngày, gói vé và số khách để xem giá phù hợp.")}</p><div className="selection-summary"><span>{dayLabel(date)} · {variant.name}</span><strong>{count} {locale==='en'&&count===1?'guest':t("khách")}</strong>{rates && <b>{money(total)}</b>}</div><button className="button ticket-launch" onClick={open}>{t("Chọn vé & xem giá")}<span>↗</span></button><small className="booking-note">{product.demo ? t("Giá minh họa · Chưa mở bán") : t("Gửi yêu cầu · Chờ JinGo xác nhận")}</small>
    <dialog ref={dialog} className="ticket-dialog" aria-labelledby="ticket-title" onCancel={e => { e.preventDefault(); close(); }} onClose={() => { document.body.style.overflow = previousOverflow.current; }}>
      <div className="ticket-dialog-inner"><header className="ticket-dialog-header"><button className="ticket-close" aria-label={t("Đóng chọn vé")} onClick={close}>×</button><div><small>{t("CHỌN TRẢI NGHIỆM")}</small><h2 id="ticket-title">{product.name}</h2></div><span className="ticket-demo">{product.demo ? t("Bản minh họa") : t("Xem giá")}</span></header>
      <div className="ticket-scroll"><section className="ticket-section"><div className="ticket-section-heading"><h3>{t("Ngày sử dụng")}</h3><span>{t("Giờ Việt Nam")}</span></div><div className="date-options"><label className="date-picker-button" title={t("Chọn ngày khác")}><span aria-hidden="true">▦</span><span className="sr-only">{t("Chọn ngày khác")}</span><input aria-label={t("Ngày sử dụng")} type="date" min={today} value={date} onChange={e => { setDate(e.target.value); }}/></label>{Array.from({ length: 7 }, (_, index) => { const day = addDays(today, index); return <button className={`date-chip ${day === date ? 'active' : ''}`} key={day} aria-pressed={day === date} onClick={() => setDate(day)}>{index === 0 ? t("Hôm nay") : index === 1 ? t("Ngày mai") : dayLabel(day)}</button>; })}</div><span className="chosen-date">{t("Ngày đã chọn:")} {date ? dayLabel(date) + ', ' + date.slice(0, 4) : t("Chưa chọn")}</span></section>
      <section className="ticket-section"><h3>{t("Hạng / gói vé")}</h3><div className="variant-options">{product.variants.map(v => <button className={`variant-chip ${variantId === v.id ? 'active' : ''}`} key={v.id} aria-pressed={variantId === v.id} onClick={() => selectVariant(v.id)}>{v.name}</button>)}</div></section>
      <section className="ticket-section guests-section" aria-busy={loading}><div className="ticket-section-heading"><h3>{t("Số lượng khách")}</h3><span>{product.demo ? t("Giá minh họa / khách") : t("Giá / khách")}</span></div>{(Object.keys(variant.prices) as Group[]).map(type => <div className="ticket-guest" key={type}><div className="guest-description"><strong>{t(labels[type])}</strong><small>{variant.conditions?.[type] || t("Điều kiện cần xác nhận với đơn vị tổ chức")}</small></div><span className="guest-price">{loading ? '…' : rates ? money(rates.lines.find(l => l.customerType === type)!.unitPrice) : '—'}</span><div className="guest-stepper"><button aria-label={`${t("Giảm")} ${t(labels[type])}`} disabled={quantities[type] === 0 || submitting} onClick={() => changeCount(type, -1)}>−</button><output aria-label={`${t("Số")} ${t(labels[type])}`} aria-live="polite">{quantities[type]}</output><button aria-label={`${t("Tăng")} ${t(labels[type])}`} disabled={quantities[type] === 50 || submitting} onClick={() => changeCount(type, 1)}>＋</button></div></div>)}</section>
      <div className="ticket-help">{t("ⓘ Chọn ít nhất 1 khách. Tối đa 50 khách mỗi nhóm trong một lượt lựa chọn.")}</div>{error && <div className="ticket-error" role="alert">{error}</div>}<p className="ticket-disclaimer">{t("Bạn đang xem giá và lựa chọn vé. Thao tác này chưa giữ chỗ, tạo đơn hoặc thu tiền.")}</p></div>
      <footer className="ticket-total-bar"><div className="ticket-total"><span>{t("Tổng tiền")}{product.demo ? t(" minh họa") : ''}</span><strong aria-live="polite">{loading ? t("Đang lấy giá…") : rates ? money(total) : t("Chưa có giá")}</strong></div><button className="ticket-apply" disabled={loading || !rates || count === 0 || submitting || product.demo} onClick={async () => {
            setSubmitting(true);
            setError('');
            try {
                const selected = Object.fromEntries(Object.entries(quantities).filter(([type]) => variant.prices[type as Group] !== undefined));
                const response = await fetch('/api/v1/quotes?lang='+locale, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, variantId, date, quantities: selected }) });
                const body = await response.json();
                if (!response.ok)
                    throw new Error(body.message || t("Không thể xác nhận giá."));
                const changed = body.total !== total;
                setRates({ lines: body.lines });
                if (changed) {
                    setError(t("Giá vừa thay đổi. Vui lòng kiểm tra tổng tiền mới và áp dụng lại."));
                    return;
                }
                close();
                const params = new URLSearchParams({ product: product.id, variant: variantId, date, ...Object.fromEntries(Object.entries(selected).map(([key, value]) => [key, String(value)])) });
                window.location.assign(localizedPath('/dat-ve', locale) + `?${params.toString()}`);
            }
            catch (err) {
                setRates(null);
                setError(err instanceof Error ? err.message : t("Không thể xác nhận giá."));
            }
            finally {
                setSubmitting(false);
            }
        }}>{submitting ? t("Đang kiểm tra…") : product.demo ? t("Vé mẫu · chưa mở bán") : t("Tiếp tục đặt vé")} <span>↗</span></button></footer></div>
    </dialog>
  </aside>;
}
