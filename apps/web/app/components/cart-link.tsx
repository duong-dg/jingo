'use client';
import { useTicketCart, openTicketCart } from '../../lib/ticket-cart';
import { useLocale } from './locale-context';
export function CartLink() { const items = useTicketCart('WEB'), locale = useLocale(), count = items.reduce((n, i) => n + Object.values(i.quantities).reduce((s, q) => s + q, 0), 0); return <button type="button" className="cart-header-link" onClick={openTicketCart} aria-label={(locale === 'en' ? 'Ticket basket: ' : 'Giỏ vé: ') + count}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 3h3l3 12h11l3-8H6M9 20h.01M18 20h.01" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{locale === 'en' ? 'Basket' : 'Giỏ'} <strong>{count}</strong></span></button>; }
