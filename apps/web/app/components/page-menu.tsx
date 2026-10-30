'use client';
import Link from'next/link';import type{PageNav}from'../../lib/site-pages';import'./page-menu.css';
export function PageMenu({links,label}:{links:PageNav[];label:string}){if(!links.length)return null;return <details className="public-page-menu"><summary>{label}<span aria-hidden="true">⌄</span></summary><div>{links.map(link=><Link key={link.id} href={link.href} onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>{link.label}</Link>)}</div></details>;}
