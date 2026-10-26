import { requestLocale } from '../../../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../../../lib/i18n';
import{languageAlternates}from'../../../lib/content-api';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { contentApi, Post, Product, imageUrl, siteBase, indexing, jsonLd } from '../../../lib/content-api';
import { ProductCard } from '../../components/product-card';
async function getPost(slug: string) { const locale = await requestLocale(), t = translator(locale); try {
    return await contentApi<Post>(`posts/${encodeURIComponent(slug)}`, locale);
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
}): Promise<Metadata> { const locale = await requestLocale(), t = translator(locale); const post = await getPost((await params).slug); if (!post)
    return { title: 'Không tìm thấy bài viết' }; const canonical = new URL(localizedPath(`/cam-nang/${post.slug}`, locale), siteBase()).toString(); return { title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, alternates: { canonical,languages:languageAlternates(`/cam-nang/${post.slug}`,post.languages) }, robots: { index: indexing(), follow: true }, openGraph: { type: 'article', url: canonical, title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, publishedTime: post.publishedAt || undefined, modifiedTime: post.updatedAt, authors: [post.author], images: post.cover ? [{ url: new URL(imageUrl(post.cover), siteBase()).toString(), alt: post.cover.alt || post.title }] : [] } }; }
export default async function ArticlePage({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const locale = await requestLocale(), t = translator(locale);
    const requested = (await params).slug;
    const post = await getPost(requested);
    if (!post)
        notFound();
    if (post.slug !== requested)
        permanentRedirect(localizedPath(`/cam-nang/${post.slug}`, locale));
    let products: Product[] = [];
    if (post.relatedProductIds.length)
        products = (await contentApi<Product[]>('products', locale)).filter(product => post.relatedProductIds.includes(product.id));
    const toc: {
        id: string;
        text: string;
        level: number;
    }[] = [];
    const html = (post.contentHtml || '').replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, level, heading) => { const id = `section-${toc.length + 1}`; toc.push({ id, text: heading.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'), level: Number(level) }); return `<h${level} id="${id}">${heading}</h${level}>`; });
    const reading = Math.max(1, Math.ceil((post.contentHtml || '').replace(/<[^>]*>/g, ' ').split(/\s+/).length / 200));
    const url = new URL(`/cam-nang/${post.slug}`, siteBase()).toString();
    return <main id="main" className="article-page"><nav className="breadcrumbs" aria-label={t("Đường dẫn")}><Link href={localizedPath('/', locale)}>{t("Trang chủ")}</Link><span>/</span><Link href={localizedPath('/cam-nang', locale)}>{t("Cẩm nang")}</Link><span>/</span><span>{post.category}</span></nav><header className="article-heading"><p className="eyebrow">{post.category}</p><h1>{post.title}</h1><p className="article-excerpt">{post.excerpt}</p><p className="article-byline">{post.author} · {new Date(post.publishedAt || post.updatedAt).toLocaleDateString(dateLocale(locale), { timeZone: 'Asia/Ho_Chi_Minh' })} · {reading} {t("phút đọc")}</p></header>{post.cover && <img className="article-cover" src={imageUrl(post.cover)} alt={post.cover.alt || post.title} width={1200} height={800} fetchPriority="high"/>}<div className="article-layout"><article className="prose" dangerouslySetInnerHTML={{ __html: html }}/>{toc.length > 0 && <aside className="article-toc"><h2>{t("Trong bài viết")}</h2>{toc.map(item => <a key={item.id} className={item.level === 3 ? 'toc-sub' : ''} href={`#${item.id}`}>{item.text}</a>)}</aside>}</div>{products.length > 0 && <section className="article-related"><p className="eyebrow">{t("BIẾN CẢM HỨNG THÀNH CHUYẾN ĐI")}</p><h2>{t("Trải nghiệm được nhắc tới")}</h2><div className="cards">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} locale={locale}/>)}</div></section>}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ '@context': 'https://schema.org', '@type': 'BlogPosting',inLanguage:locale, headline: post.title, description: post.excerpt, url, datePublished: post.publishedAt || post.updatedAt, dateModified: post.updatedAt, author: { '@type': 'Organization', name: post.author }, publisher: { '@type': 'Organization', name: 'JinGo' }, mainEntityOfPage: url, ...(post.cover ? { image: new URL(imageUrl(post.cover), siteBase()).toString() } : {}) }) }}/></main>;
}
