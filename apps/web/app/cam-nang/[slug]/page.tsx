import{breadcrumbData}from'../../../lib/seo-breadcrumbs';
import { requestLocale } from '../../../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../../../lib/i18n';
import{languageAlternates}from'../../../lib/content-api';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { contentApi, Post, Product, imageUrl, siteBase, indexing, jsonLd } from '../../../lib/content-api';
import { ArticleView } from '../../components/article-view';
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
    return { title: 'Không tìm thấy bài viết' }; const canonical = new URL(localizedPath(`/cam-nang/${post.slug}`, locale), siteBase()).toString(); return { title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, alternates: { canonical,languages:languageAlternates(`/cam-nang/${post.slug}`,post.languages,post.localePaths) }, robots: { index: indexing(), follow: true }, twitter:{card:post.cover?'summary_large_image':'summary',title:post.seoTitle||post.title,description:post.seoDescription||post.excerpt,images:post.cover?[new URL(imageUrl(post.cover),siteBase()).toString()]:[]},openGraph: { type: 'article', url: canonical, title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, publishedTime: post.publishedAt || undefined, modifiedTime: post.updatedAt, authors: [post.author], images: post.cover ? [{ url: new URL(imageUrl(post.cover), siteBase()).toString(), alt: post.cover.alt || post.title }] : [] } }; }
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
    const url = new URL(localizedPath(`/cam-nang/${post.slug}`,locale), siteBase()).toString();
    return <><ArticleView post={post} products={products} locale={locale} shareUrl={url}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(breadcrumbData([{name:locale==='en'?'Home':'Trang chủ',url:new URL(localizedPath('/',locale),siteBase()).toString()},{name:locale==='en'?'Travel journal':'Cẩm nang',url:new URL(localizedPath('/cam-nang',locale),siteBase()).toString()},{name:post.title,url}]))}}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ '@context': 'https://schema.org', '@type': 'BlogPosting',inLanguage:locale, headline: post.title, description: post.excerpt, url, datePublished: post.publishedAt || post.updatedAt, dateModified: post.updatedAt, author: { '@type': 'Organization', name: post.author }, publisher: { '@type': 'Organization', name: 'JinGo' }, mainEntityOfPage: url, ...(post.cover ? { image: new URL(imageUrl(post.cover), siteBase()).toString() } : {}) }) }}/></>;
}
