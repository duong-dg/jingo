'use client';
import { useLocale } from './locale-context';
import { translator, localizedPath, dateLocale, errorText } from '../../lib/i18n';
import { useRef, useState } from 'react';
import { ImageRef, imageUrl } from '../../lib/content-api';
export function ProductGallery({ cover, images = [], name }: {
    cover?: ImageRef | null;
    images?: ImageRef[];
    name: string;
}) { const locale = useLocale(), t = translator(locale); const all = [...(cover ? [cover] : []), ...images.filter(image => image.id !== cover?.id)]; const [active, setActive] = useState(0); const dialog = useRef<HTMLDialogElement>(null); if (!all.length)
    return <div className="product-art" aria-hidden="true">↗</div>; const open = (index: number) => { setActive(index); dialog.current?.showModal(); }; const step = (direction: number) => setActive(index => (index + direction + all.length) % all.length); return <div className="product-gallery"><button className="product-gallery-hero" type="button" onClick={() => open(0)} aria-label={t("Mở ảnh sản phẩm")}><img src={imageUrl(all[0])} alt={all[0].alt || name} width={1200} height={800} fetchPriority="high"/><span>{t("Xem")} {all.length} {t("ảnh")} ↗</span></button>{all.length > 1 && <div className="product-gallery-thumbs">{all.slice(1).map((image, index) => <button type="button" key={image.id} onClick={() => open(index + 1)} aria-label={`${t("Mở ảnh")} ${index + 2}: ${image.alt || name}`}><img src={imageUrl(image)} alt={image.alt || name} width={240} height={160} loading="lazy"/></button>)}</div>}<dialog ref={dialog} className="photo-dialog" aria-label={t("Xem ảnh sản phẩm")} onKeyDown={event => { if (event.key === 'ArrowLeft')
    step(-1); if (event.key === 'ArrowRight')
    step(1); }}><button className="photo-close" aria-label={t("Đóng xem ảnh")} onClick={() => dialog.current?.close()}>✕</button><img src={imageUrl(all[active])} alt={all[active].alt || name}/><div className="photo-controls"><button aria-label={t("Ảnh trước")} onClick={() => step(-1)}>←</button><span>{active + 1}/{all.length} · {all[active].alt || name}</span><button aria-label={t("Ảnh sau")} onClick={() => step(1)}>→</button></div></dialog></div>; }
