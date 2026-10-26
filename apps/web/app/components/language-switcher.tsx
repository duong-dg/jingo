'use client';
import{useEffect,useState}from'react';
import{usePathname}from'next/navigation';
import{useLocale}from'./locale-context';
import{localizedPath}from'../../lib/i18n';
export function LanguageSwitcher(){
 const pathname=usePathname(),locale=useLocale(),path=pathname.replace(/^\/en(?=\/|$)/,'')||'/';
 const[available,setAvailable]=useState<{path:string;languages:string[]}|null>(null);
 const detail=/^\/(ve|cam-nang|loai)\/([^/]+)$/.exec(path);
 const supported=['/','/cam-nang','/dat-ve','/tra-cuu'].includes(path)||!!detail;
 useEffect(()=>{if(!detail){setAvailable(null);return;}const controller=new AbortController();setAvailable(null);const section={ve:'products','cam-nang':'posts',loai:'product-types'}[detail[1]];
 fetch(`/api/v1/${section}/${detail[2]}?lang=vi`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>setAvailable({path,languages:result.data.languages||['vi']})).catch(()=>{if(!controller.signal.aborted)setAvailable({path,languages:['vi']});});return()=>controller.abort();
 },[path]);
 if(!supported)return null;
 const languages=detail?(available?.path===path?available.languages:[locale]):['vi','en'];
 return <nav className="language-links" aria-label={locale==='en'?'Language':'Ngôn ngữ'}>{(['vi','en'] as const).map(lang=>languages.includes(lang)?<a key={lang} href={localizedPath(path,lang)} hrefLang={lang} lang={lang} aria-current={locale===lang?'page':undefined} onClick={event=>{event.preventDefault();window.location.assign(localizedPath(path,lang)+window.location.search+window.location.hash);}}>{lang==='vi'?'Tiếng Việt':'English'}</a>:<span key={lang}>{lang==='vi'?'Tiếng Việt':'English'} — {available?.path===path?(locale==='en'?'not available':'chưa dịch'):'…'}</span>)}</nav>;
}
