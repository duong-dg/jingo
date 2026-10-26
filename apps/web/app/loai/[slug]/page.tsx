import { requestLocale } from '../../../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../../../lib/i18n';
import{languageAlternates}from'../../../lib/content-api';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { contentApi, Product, ProductType, siteBase, indexing } from '../../../lib/content-api';
import { ProductCard } from '../../components/product-card';
async function getType(slug: string) { const locale = await requestLocale(), t = translator(locale); try {
    return await contentApi<ProductType>('product-types/' + encodeURIComponent(slug), locale);
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
}): Promise<Metadata> { const locale = await requestLocale(), t = translator(locale); const { slug } = await params; const type = await getType(slug); return { title: type?.name || 'Không tìm thấy loại sản phẩm', description: type?.description, alternates: { languages:languageAlternates(`/loai/${type?.slug||''}`,type?.languages||[]),canonical: new URL(localizedPath(`/loai/${type?.slug || slug}`, locale), siteBase()).toString() }, robots: { index: !!type && indexing(), follow: true } }; }
export default async function TypePage({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) { const locale = await requestLocale(), t = translator(locale); const requested = (await params).slug; const type = await getType(requested); if (!type)
    notFound(); if (type.slug !== requested)
    permanentRedirect(localizedPath(`/loai/${type.slug}`, locale)); const products = await contentApi<Product[]>(`products?type=${encodeURIComponent(type.id)}`,locale); return <main id="main" className="section"><Link className="text-link" href={localizedPath('/', locale)}>{t("← Tất cả trải nghiệm")}</Link><p className="eyebrow">{t("KHÁM PHÁ THEO CÁCH CỦA BẠN")}</p><h1>{type.name}</h1>{type.description && <p className="lead">{type.description}</p>}{!products.length && <p className="notice">{t("Các trải nghiệm thuộc nhóm này đang được cập nhật.")}</p>}<div className="cards">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} locale={locale}/>)}</div></main>; }
