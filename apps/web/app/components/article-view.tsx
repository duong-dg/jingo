import{ArticleToc}from'./article-toc';
import{SocialShare}from'./social-share';
import Link from 'next/link';
import {translator,localizedPath,dateLocale,type Locale} from '../../lib/i18n';
import {imageUrl,type Post,type Product} from '../../lib/content-api';
import {ProductCard} from './product-card';
export function ArticleView({post,products=[],locale='vi',shareUrl}:{post:Post;products?:Product[];locale?:Locale;shareUrl?:string}){
 const t=translator(locale);
    const toc: {
        id: string;
        text: string;
        level: number;
    }[] = [];
    const html = (post.contentHtml || '').replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, level, heading) => { const id = `section-${toc.length + 1}`; toc.push({ id, text: heading.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'), level: Number(level) }); return `<h${level} id="${id}">${heading}</h${level}>`; });
    const reading = Math.max(1, Math.ceil((post.contentHtml || '').replace(/<[^>]*>/g, ' ').split(/\s+/).length / 200));
    return <main id="main" className="article-page" lang={locale}><nav className="breadcrumbs" aria-label={t("Đường dẫn")}><Link href={localizedPath('/', locale)}>{t("Trang chủ")}</Link><span>/</span><Link href={localizedPath('/cam-nang', locale)}>{t("Cẩm nang")}</Link><span>/</span><span>{post.title}</span></nav><header className="article-heading"><p className="eyebrow">{post.category}</p><h1>{post.title}</h1><p className="article-excerpt">{post.excerpt}</p><p className="article-byline">{post.author} · {new Date(post.publishedAt || post.updatedAt).toLocaleDateString(dateLocale(locale), { timeZone: 'Asia/Ho_Chi_Minh' })} · {reading} {t("phút đọc")}</p>{shareUrl&&<SocialShare url={shareUrl} title={post.title} locale={locale}/>}</header>{post.cover && <img className="article-cover" src={imageUrl(post.cover)} alt={post.cover.alt || post.title} width={1200} height={800} fetchPriority="high"/>}<div className="article-layout"><article className="prose" dangerouslySetInnerHTML={{ __html: html }}/>{toc.length > 0 && <ArticleToc title={t("Trong bài viết")} items={toc}/>}</div>{products.length > 0 && <section className="article-related"><p className="eyebrow">{t("BIẾN CẢM HỨNG THÀNH CHUYẾN ĐI")}</p><h2>{t("Trải nghiệm được nhắc tới")}</h2><div className="cards">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} locale={locale}/>)}</div></section>}</main>;
}
