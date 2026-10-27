'use client';
import Link from 'next/link';
export function MobileMenu({links,label}:{links:{href:string;label:string}[];label:string}){return <details className="public-mobile-menu"><summary aria-label={label}>☰ <span>Menu</span></summary><nav aria-label={label}>{links.map(link=><Link key={link.href} href={link.href} onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>{link.label}</Link>)}</nav></details>;}
