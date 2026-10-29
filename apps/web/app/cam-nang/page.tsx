import { requestLocale } from '../../lib/request-locale';
import { translator, localizedPath, dateLocale } from '../../lib/i18n';
import{languageAlternates}from'../../lib/content-api';
import type { Metadata } from 'next';
import Link from 'next/link';
import { contentApi, Post, imageUrl, siteBase, indexing } from '../../lib/content-api';
export async function generateMetadata({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> { const locale = await requestLocale(), t = translator(locale); const params = await searchParams; return { title: t("Cẩm nang du lịch & trải nghiệm"), description: t("Kinh nghiệm, lịch trình và những câu chuyện địa phương cùng JinGo."), alternates: { languages:languageAlternates('/cam-nang',['vi','en']),canonical: new URL(localizedPath('/cam-nang', locale), siteBase()).toString() }, robots: { index: indexing() && !(params.chuyen_muc||params.category), follow: true } }; }
export default async function Journal({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const locale = await requestLocale(), t = translator(locale);
    const posts = await contentApi<Post[]>('posts', locale);
    const params = await searchParams;
    const category = typeof params.category==='string'?params.category:typeof params.chuyen_muc === 'string' ? params.chuyen_muc : '';
    const categories = Array.from(new Set(posts.map(post => post.category).filter(Boolean)));
    const shown = posts.filter(post => !category || post.category === category);
    return <main id="main" className="section"><div className="blog-intro"><p className="eyebrow">{t("CẨM NANG JINGO")}</p><h1>{t("Chuyện trên đường đi.")}</h1><p className="lead">{t("Kinh nghiệm hữu ích, góc nhìn địa phương và cảm hứng cho chuyến đi tiếp theo của bạn.")}</p></div>{categories.length > 0 && <nav className="type-chips" aria-label={t("Chuyên mục bài viết")}><Link href={localizedPath('/cam-nang', locale)} aria-current={!category ? 'page' : undefined}>{t("Tất cả")}</Link>{categories.map(name => <Link key={name} href={localizedPath(`/cam-nang?chuyen_muc=${encodeURIComponent(name)}`, locale)} aria-current={category === name ? 'page' : undefined}>{name}</Link>)}</nav>}{!shown.length && <div className="notice">{t("Chưa có bài viết trong chuyên mục này. Những câu chuyện mới sẽ được cập nhật tại đây.")}</div>}<div className="blog-grid">{shown.map(post => <Link className="blog-card" key={post.id} href={localizedPath(`/cam-nang/${post.slug}`, locale)}>{post.cover ? <img className="blog-card-cover" src={imageUrl(post.cover)} alt={post.cover.alt || post.title} width={600} height={400} loading="lazy"/> : <div className="blog-card-placeholder" aria-hidden="true">↗</div>}<div className="blog-card-body"><small>{post.category}</small><h2>{post.title}</h2><p>{post.excerpt}</p><div className="blog-card-date"><span>{new Date(post.publishedAt || post.updatedAt).toLocaleDateString(dateLocale(locale), { timeZone: 'Asia/Ho_Chi_Minh' })}</span><span>{t("Đọc câu chuyện ↗")}</span></div></div></Link>)}</div></main>;
}
