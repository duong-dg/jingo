import{PageMenu}from'./components/page-menu';import{contentApi}from'../lib/content-api';import type{PageNav}from'../lib/site-pages';
import{PublicMotion}from'./components/public-motion';
import'./motion.css';
import { CartDrawer } from './components/cart-drawer';
import{CartLink}from'./components/cart-link';
import'./gio-hang/cart.css';
import { requestLocale } from '../lib/request-locale';
import { translator, localizedPath } from '../lib/i18n';
import { LocaleContext } from './components/locale-context';
import {LanguageSwitcher}from'./components/language-switcher';
import type { Metadata } from 'next';
import Link from 'next/link';
import {MobileMenu}from'./components/mobile-menu';
import { SkipLink } from './skip-link';
import './styles.css';
import './content.css';
export const metadata: Metadata = {
    metadataBase: new URL(process.env.PUBLIC_BASE_URL || 'http://localhost:3000'),
    title: { default: 'JinGo — Mỗi chuyến đi, một câu chuyện', template: '%s | JinGo' },
    applicationName:'JinGo',
    description: 'Khám phá vé tham quan, show diễn và tour địa phương cùng JinGo.',
    robots: { index: false, follow: false }
};
export default async function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    const locale = await requestLocale(), t = translator(locale);let pageLinks:PageNav[]=[];try{pageLinks=await contentApi<PageNav[]>('site/navigation',locale);}catch{}const menuLinks=pageLinks.filter(p=>p.menu);
    return <html lang={locale} data-scroll-behavior="smooth"><body><LocaleContext value={locale}>
    <PublicMotion/><SkipLink /><CartDrawer/>
    <header className="header"><Link className="logo" href={localizedPath('/', locale)}>jin<span>go</span><i>↗</i></Link>
      <nav className="public-desktop-nav" aria-label={locale==='en'?'Main navigation':'Điều hướng chính'}><Link href={localizedPath('/', locale) + '#experiences'}>{t("Vé & trải nghiệm")}</Link><Link href={localizedPath('/', locale) + '#local'}>{t("Tour địa phương")}</Link><Link href={localizedPath('/cam-nang', locale)}>{t("Cẩm nang")}</Link><PageMenu links={menuLinks} label={locale==='en'?'Information':'Thông tin'}/></nav>
      <MobileMenu label={locale==='en'?'Main navigation':'Điều hướng chính'} links={[{href:localizedPath('/',locale)+'#experiences',label:t('Vé & trải nghiệm')},{href:localizedPath('/',locale)+'#local',label:t('Tour địa phương')},{href:localizedPath('/cam-nang',locale),label:t('Cẩm nang')},{href:localizedPath('/gio-hang',locale),label:locale==='en'?'Ticket basket':'Giỏ vé'},{href:localizedPath('/tra-cuu',locale),label:t('Tra cứu đơn hàng ↗')},{href:'/ctv',label:t('Cổng CTV ↗')},...menuLinks.map(p=>({href:p.href,label:p.label}))]}/><LanguageSwitcher/><CartLink/><span className="header-note">{t("Đi gần hơn. Trải nghiệm nhiều hơn.")}</span>
    </header>
    <div className="demo-banner">{t("Đặt vé trực tuyến · Nhận vé qua email sau khi xử lý")}</div>
    {children}
    <footer><Link className="logo" href={localizedPath('/',locale)}>jin<span>go</span>↗</Link><p>{t("Những hành trình đáng nhớ, bắt đầu từ đây.")}</p><Link href={localizedPath('/tra-cuu', locale)}>{t("Tra cứu đơn hàng ↗")}</Link><Link href="/ctv">{t("Cổng CTV ↗")}</Link><small>{t("JinGo · Nền tảng đang phát triển")}</small>{pageLinks.some(p=>p.footer)&&<nav className="public-footer-links" aria-label={locale==='en'?'Information and policies':'Thông tin và chính sách'}>{pageLinks.filter(p=>p.footer).map(p=><Link key={p.id} href={p.href}>{p.label}</Link>)}</nav>}</footer>
  </LocaleContext></body></html>;
}
