import{loadSiteSeo,homeMetadata,homeSchema}from'../lib/site-seo';
import{CatalogExplorer}from'./components/catalog-explorer';
import type{DestinationNode}from'../lib/destinations';
import { requestLocale } from '../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../lib/i18n';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Product, ProductType, contentApi, siteBase, indexing,jsonLd } from '../lib/content-api';
import { ProductCard } from './components/product-card';
export async function generateMetadata():Promise<Metadata>{const locale=await requestLocale();return homeMetadata(await loadSiteSeo(),locale,siteBase(),indexing());}
export default async function Home() {
    const locale = await requestLocale(), t = translator(locale);
    let products: Product[] = [];
    let types: ProductType[] = [];let destinations:DestinationNode[]=[];
    let unavailable = false;
    try {
        const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/api/v1/products?lang=${locale}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!response.ok)
            throw new Error('Catalog unavailable');
        products = (await response.json()).data;
        [types,destinations] = await Promise.all([contentApi<ProductType[]>('product-types', locale),contentApi<DestinationNode[]>('destinations',locale)]);
    }
    catch {
        unavailable = true;
    }
    return <main id="main"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(homeSchema(siteBase(),locale))}}/>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">{t("ĐI ĐỂ CÓ CHUYỆN KỂ")}</p><h1>{t("Chuyến đi nhỏ.")}<br /><em>{t("Kỷ niệm lớn.")}</em></h1><p>{t("Vé vui chơi, những đêm diễn đáng nhớ và tour địa phương.")}<br className="desktop"/>{t("Tìm trải nghiệm dành riêng cho hành trình của bạn.")}</p><a href="#experiences" className="button">{t("Khám phá trải nghiệm")}<span>↗</span></a><div className="hero-foot"><span>{t("01 — MIỀN TRUNG")}</span><span>{t("Đà Nẵng · Hội An")}</span></div></div>
      <div className="hero-art" role="img" aria-label={t("Minh họa phong cảnh núi và mặt trời")}><div className="sun"/><div className="mountain back"/><div className="mountain front"/><div className="art-label">{t("Những điều đẹp đẽ")}<br />{t("đang chờ bạn ngoài kia.")}<span>16°03′ N · 108°12′ E</span></div><span className="vertical-label">THE LOCAL EXPERIENCE</span></div>
    </section>
    <div className="promise"><span>{t("↗ Khám phá theo cách của bạn")}</span><span>{t("◎ Thông tin rõ ràng")}</span><span>{t("◇ Trải nghiệm địa phương")}</span></div>
    <section className="section" id="experiences"><div className="section-heading"><div><p className="eyebrow">{t("CHỌN MỘT ĐIỀU ĐÁNG NHỚ")}</p><h2>{t("Bạn muốn đi đâu hôm nay?")}</h2></div><span className="muted">{t("Chọn trải nghiệm dành cho bạn")}</span></div>
      {unavailable && <p className="notice">{t("Chưa tải được danh sách trải nghiệm. Vui lòng thử lại sau.")}</p>}{!unavailable && !products.length && <p className="notice">{t("Các trải nghiệm đang được cập nhật.")}</p>}
      <nav className="type-chips" aria-label={t("Loại trải nghiệm")}>{types.map(type => <Link key={type.id} href={localizedPath(`/loai/${type.slug}`, locale)}>{type.name}</Link>)}</nav><CatalogExplorer products={products} types={types} destinations={destinations}/>
    </section>
    <section className="journal"><div><p className="eyebrow">{t("MỘT CHÚT CẢM HỨNG")}</p><h2>{t("Đi như người địa phương.")}</h2><p>{t("Góc cẩm nang dành cho kinh nghiệm, lịch trình và những điểm đến đáng khám phá.")}</p></div><Link href={localizedPath('/cam-nang', locale)} className="button secondary">{t("Ghé cẩm nang ↗")}</Link></section>
  </main>;
}
