'use client';
import{useEffect,useId,useRef,useState}from'react';
import'./language-switcher.css';
import{usePathname}from'next/navigation';
import{useLocale}from'./locale-context';
import{localizedPath,unlocalizedPath}from'../../lib/i18n';
function Flag({lang}:{lang:'vi'|'en'}){return <span className="language-flag" aria-hidden="true">{lang==='vi'?<svg viewBox="0 0 32 32"><path fill="#da251d" d="M0 0h32v32H0z"/><path fill="#ffdf00" d="m16 6 2.4 7.2H26l-6.1 4.5 2.3 7.3-6.2-4.5L9.8 25l2.3-7.3L6 13.2h7.6z"/></svg>:<svg viewBox="0 0 32 32"><path fill="#012169" d="M0 0h32v32H0z"/><path stroke="#fff" strokeWidth="7" d="m0 0 32 32M32 0 0 32"/><path stroke="#c8102e" strokeWidth="3" d="m0 0 32 32M32 0 0 32"/><path stroke="#fff" strokeWidth="11" d="M16 0v32M0 16h32"/><path stroke="#c8102e" strokeWidth="6" d="M16 0v32M0 16h32"/></svg>}</span>;}
export function LanguageSwitcher(){
 const[open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panelId=useId();
 const pathname=usePathname(),locale=useLocale(),path=unlocalizedPath(pathname);
 const[available,setAvailable]=useState<{path:string;languages:string[];paths?:Partial<Record<'vi'|'en',string>>}|null>(null);
 const detail=/^\/(ve|cam-nang|loai|diem-den|trang)\/([^/]+)$/.exec(path);
 const contact=path==='/lien-he';
 const supported=contact||['/','/cam-nang','/dat-ve','/tra-cuu','/gio-hang','/diem-den'].includes(path)||!!detail;
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 useEffect(()=>{if(!detail&&!contact){setAvailable(null);return;}const controller=new AbortController();setAvailable(null);const section=detail?{trang:'site/pages',ve:'products','cam-nang':'posts',loai:'product-types','diem-den':'destinations'}[detail[1]]:'site';
 fetch(`/api/v1/${section}/${contact?'contact':detail![2]}?lang=${locale}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>setAvailable({path,languages:result.data.languages||['vi'],paths:result.data.localePaths})).catch(()=>{if(!controller.signal.aborted)setAvailable({path,languages:['vi']});});return()=>controller.abort();
 },[path,locale]);
 if(!supported)return null;
 const languages=detail||contact?(available?.path===path?available.languages:[locale]):['vi','en'];
 const target=(lang:'vi'|'en')=>available?.path===path&&available.paths?.[lang]||localizedPath(path,lang);
 return <div className="language-picker" ref={root} onBlur={event=>{if(event.relatedTarget instanceof Node&&!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}><button ref={trigger} type="button" className="language-trigger" aria-label={(locale==='en'?'Language: ':'Ngôn ngữ: ')+(locale==='vi'?'Tiếng Việt':'English')} aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(value=>!value)}><Flag lang={locale}/><span>{locale==='vi'?'Tiếng Việt':'English'}</span><svg className="language-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><ul className="language-options" id={panelId} hidden={!open} aria-label={locale==='en'?'Choose language':'Chọn ngôn ngữ'}>{(['vi','en'] as const).map(lang=><li key={lang}>{languages.includes(lang)?<a href={target(lang)} hrefLang={lang} lang={lang} aria-current={locale===lang?'page':undefined} onClick={event=>{event.preventDefault();setOpen(false);if(lang===locale)return;const query=new URLSearchParams(window.location.search);if(path==='/cam-nang'){query.delete('chuyen_muc');query.delete('category');}window.location.assign(target(lang)+(query.size?'?'+query.toString():'')+window.location.hash);}}><Flag lang={lang}/><span>{lang==='vi'?'Tiếng Việt':'English'}</span>{locale===lang&&<span className="language-selected" aria-hidden="true">✓</span>}</a>:<span className="language-unavailable" aria-disabled="true"><Flag lang={lang}/><span>{lang==='vi'?'Tiếng Việt':'English'}<small>{available?.path===path?(locale==='en'?'Not available':'Chưa có bản dịch'):(locale==='en'?'Checking…':'Đang kiểm tra…')}</small></span></span>}</li>)}</ul></div>;
}
