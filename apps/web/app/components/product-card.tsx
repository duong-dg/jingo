import { translator, localizedPath, type Locale } from '../../lib/i18n';
import Link from 'next/link';
import { Product, imageUrl } from '../../lib/content-api';
export function ProductCard({ product, index = 0, anchorId, locale = 'vi' }: {
    product: Product;
    index?: number;
    anchorId?: string;
    locale?: Locale;
}) { const t = translator(locale); const prices = product.variants.flatMap(variant => Object.values(variant.prices)).filter((price): price is number => price !== undefined); const price = prices.length ? Math.min(...prices) : null; const style = product.bookingKind === 'TOUR' ? 'local' : index % 2 ? 'hills' : 'memories'; return <Link href={localizedPath(`/ve/${product.slug}`, locale)} className="card" id={anchorId}><div className={`card-art ${style}`}>{product.cover ? <img className="card-cover" src={imageUrl(product.cover)} alt={product.cover.alt || product.name} width={600} height={400} loading="lazy"/> : <span className="card-icon" aria-hidden="true">{product.bookingKind === 'TOUR' ? '☼' : '◒'}</span>}<span className="badge">{product.typeName || t("VÉ & TRẢI NGHIỆM")}</span><span className="place">↗ {product.destination}</span></div><div className="card-body"><h3>{product.name}</h3><p>{product.description}</p><div className="card-bottom"><span>{t("Từ")}{' '}<strong>{price === null ? t("Liên hệ") : price.toLocaleString('vi-VN') + 'đ'}</strong><small>{t(" / khách")}{product.demo ? t(" · giá mẫu") : t(" · giá cơ bản")}</small></span><span className="round-arrow">↗</span></div></div></Link>; }
