'use client';
import{useEffect}from'react';import{usePathname}from'next/navigation';
// Progressive enhancement: server HTML and reduced-motion mode always remain visible.
export function PublicMotion(){const pathname=usePathname();useEffect(()=>{
 if(/^\/(admin|quay|ctv|gio-hang|dat-ve|tra-cuu|nhan-ve)(\/|$)/.test(pathname)||/^\/en\/(gio-hang|dat-ve|tra-cuu)(\/|$)/.test(pathname))return;
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)');let observer:IntersectionObserver|undefined,changes:MutationObserver|undefined,frame=0;const touched=new Set<HTMLElement>(),seen=new WeakSet<HTMLElement>();
 const scroll=()=>{if(frame)return;frame=requestAnimationFrame(()=>{document.body.dataset.publicScrolled=window.scrollY>16?'yes':'no';frame=0;});};
 const reset=()=>{observer?.disconnect();changes?.disconnect();for(const node of touched){node.classList.remove('jg-reveal','jg-reveal-pending');node.style.removeProperty('--jg-delay');}touched.clear();delete document.body.dataset.publicMotion;delete document.body.dataset.publicScrolled;window.removeEventListener('scroll',scroll);if(frame)cancelAnimationFrame(frame);frame=0;};
 function start(){reset();if(preference.matches)return;document.body.dataset.publicMotion='on';scroll();window.addEventListener('scroll',scroll,{passive:true});
  if(!('IntersectionObserver'in window))return;
  observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting||entry.boundingClientRect.top<0){const node=entry.target as HTMLElement;node.classList.remove('jg-reveal-pending');observer?.unobserve(node);}},{threshold:0,rootMargin:'0px 0px -24px 0px'});
  function collect(){const main=document.querySelector('main');if(!main)return;main.querySelectorAll<HTMLElement>('.section-heading,.cards>.card,.blog-grid>.blog-card,.journal,.blog-intro,.article-header').forEach((node,index)=>{if(seen.has(node))return;seen.add(node);if(node.getBoundingClientRect().top<window.innerHeight-24)return;touched.add(node);node.style.setProperty('--jg-delay',((index%3)*45)+'ms');node.classList.add('jg-reveal','jg-reveal-pending');observer?.observe(node);});}
  collect();changes=new MutationObserver(records=>{if(records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1)))collect();});const main=document.querySelector('main');if(main)changes.observe(main,{childList:true,subtree:true});
 }
 start();preference.addEventListener('change',start);return()=>{preference.removeEventListener('change',start);reset();};
 },[pathname]);return null;}
