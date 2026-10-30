'use client';
import{useEffect,useState}from'react';
import{usePathname}from'next/navigation';
import{useLocale}from'./locale-context';
import{localizedPath,unlocalizedPath}from'../../lib/i18n';
export function LanguageSwitcher(){
 const pathname=usePathname(),locale=useLocale(),path=unlocalizedPath(pathname);
 const[available,setAvailable]=useState<{path:string;languages:string[];paths?:Partial<Record<'vi'|'en',string>>}|null>(null);
 const detail=/^\/(ve|cam-nang|loai|diem-den|trang)\/([^/]+)$/.exec(path);
 const contact=path==='/lien-he';
 const supported=contact||['/','/cam-nang','/dat-ve','/tra-cuu','/gio-hang','/diem-den'].includes(path)||!!detail;
 useEffect(()=>{if(!detail&&!contact){setAvailable(null);return;}const controller=new AbortController();setAvailable(null);const section=detail?{trang:'site/pages',ve:'products','cam-nang':'posts',loai:'product-types','diem-den':'destinations'}[detail[1]]:'site';
 fetch(`/api/v1/${section}/${contact?'contact':detail![2]}?lang=${locale}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>setAvailable({path,languages:result.data.languages||['vi'],paths:result.data.localePaths})).catch(()=>{if(!controller.signal.aborted)setAvailable({path,languages:['vi']});});return()=>controller.abort();
 },[path,locale]);
 if(!supported)return null;
 const languages=detail||contact?(available?.path===path?available.languages:[locale]):['vi','en'];
 const target=(lang:'vi'|'en')=>available?.path===path&&available.paths?.[lang]||localizedPath(path,lang);
 return <nav className="language-links" aria-label={locale==='en'?'Language':'Ngôn ngữ'}>{(['vi','en'] as const).map(lang=>languages.includes(lang)?<a key={lang} href={target(lang)} hrefLang={lang} lang={lang} aria-current={locale===lang?'page':undefined} onClick={event=>{event.preventDefault();const query=new URLSearchParams(window.location.search);if(lang!==locale&&path==='/cam-nang'){query.delete('chuyen_muc');query.delete('category');}window.location.assign(target(lang)+(query.size?'?'+query.toString():'')+window.location.hash);}}>{lang==='vi'?'Tiếng Việt':'English'}</a>:<span key={lang}>{lang==='vi'?'Tiếng Việt':'English'} — {available?.path===path?(locale==='en'?'not available':'chưa dịch'):'…'}</span>)}</nav>;
}
