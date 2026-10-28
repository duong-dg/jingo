'use client';
import Link from 'next/link';
import { openTicketCart } from '../../lib/ticket-cart';
export function MobileMenu({links,label}:{links:{href:string;label:string}[];label:string}){return <details className="public-mobile-menu"><summary aria-label={label}>☰ <span>Menu</span></summary><nav aria-label={label}>{links.map(link=><Link key={link.href} href={link.href} onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');if(/\/gio-hang$/.test(link.href)){e.preventDefault();openTicketCart();}}}>{link.label}</Link>)}</nav></details>;}
