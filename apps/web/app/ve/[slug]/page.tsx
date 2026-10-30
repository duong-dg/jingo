import{breadcrumbData}from'../../../lib/seo-breadcrumbs';
import{SocialShare}from'../../components/social-share';
import{DestinationWeather}from'../../components/destination-weather';
import { requestLocale } from '../../../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../../../lib/i18n';
import{jsonLd,languageAlternates}from'../../../lib/content-api';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { BookingPanel } from './booking-panel';
import { Product, imageUrl, siteBase, indexing, contentApi } from '../../../lib/content-api';
import { ProductGallery } from '../../components/product-gallery';
import './ticket.css';
async function getProduct(slug: string) { const locale = await requestLocale(), t = translator(locale); try {
    return await contentApi<Product>(`products/${encodeURIComponent(slug)}`, locale);
}
catch (e) {
    if ((e as {
        status?: number;
    }).status === 404)
        return null;
    throw e;
} }
export async function generateMetadata({ params }: {
    params: Promise<{
        slug: string;
    }>;
}): Promise<Metadata> { const locale = await requestLocale(), t = translator(locale); const { slug } = await params; const product = await getProduct(slug); return { title: product?.seoTitle || product?.name || 'Không tìm thấy trải nghiệm', description: product?.seoDescription || product?.description, alternates: { languages:languageAlternates(`/ve/${product?.slug||''}`,product?.languages||[]),canonical: new URL(localizedPath(`/ve/${product?.slug || slug}`, locale), siteBase()).toString() }, robots: { index: !!product && indexing() && !product.demo, follow: true }, twitter:{card:product?.cover?'summary_large_image':'summary',title:product?.seoTitle||product?.name,description:product?.seoDescription||product?.description,images:product?.cover?[new URL(imageUrl(product.cover),siteBase()).toString()]:[]},openGraph: { type:'website',url:new URL(localizedPath(`/ve/${product?.slug||slug}`,locale),siteBase()).toString(),title: product?.seoTitle || product?.name, description: product?.seoDescription || product?.description, images: product?.cover ? [{ url: new URL(imageUrl(product.cover), siteBase()).toString(), alt: product.cover.alt || product.name }] : [] } }; }
export default async function ProductPage({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const locale = await requestLocale(), t = translator(locale);
    const requested = (await params).slug;
    const product = await getProduct(requested);
    if (!product)
        notFound();
    if (product.slug !== requested)
        permanentRedirect(localizedPath(`/ve/${product.slug}`, locale));
    return <main id="main" className="section"><Link className="text-link" href={localizedPath('/', locale)}>{t("← Tất cả trải nghiệm")}</Link><div className="product-layout"><article><p className="eyebrow">{product.destinationSlug?<Link href={localizedPath('/diem-den/'+product.destinationSlug,locale)}>{product.destination}</Link>:product.destination} · {product.typeSlug ? <Link href={localizedPath(`/loai/${product.typeSlug}`, locale)}>{product.typeName}</Link> : product.typeName || t("TRẢI NGHIỆM")}</p><h1>{product.name}</h1><p className="lead product-description">{product.description}</p><SocialShare url={new URL(localizedPath(`/ve/${product.slug}`,locale),siteBase()).toString()} title={product.name} locale={locale}/><ProductGallery cover={product.cover} images={product.gallery} name={product.name}/>{product.detailHtml && <div className="prose" dangerouslySetInnerHTML={{ __html: product.detailHtml }}/>}<DestinationWeather destinationId={product.destinationId} locale={locale} variant="compact"/><h2>{t("Trước khi bạn đặt")}</h2><p>{t("Chọn ngày sử dụng, hạng vé và nhóm khách để kiểm tra mức giá tương ứng.")}</p>{product.demo&&<div className="notice">{t("Vé mẫu · chưa mở bán")}</div>}</article><BookingPanel product={product}/></div><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(breadcrumbData([{name:locale==='en'?'Home':'Trang chủ',url:new URL(localizedPath('/',locale),siteBase()).toString()},...(product.destinationSlug?[{name:product.destination,url:new URL(localizedPath('/diem-den/'+product.destinationSlug,locale),siteBase()).toString()}]:[]),{name:product.name,url:new URL(localizedPath('/ve/'+product.slug,locale),siteBase()).toString()}]))}}/></main>;
}
