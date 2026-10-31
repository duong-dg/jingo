'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from './locale-context';
import { localizedPath } from '../../lib/i18n';
import { WebCartEditor, cartMoney, useWebCart } from './web-cart-editor';

function DrawerContents({ close }: { close: () => void }) {
  const { items, savings,total, busy, error, ready, retry } = useWebCart(), locale = useLocale(), en = locale === 'en';
  return <><header className="cart-drawer-header"><div><p>{en ? 'YOUR EXPERIENCES' : 'TRẢI NGHIỆM ĐÃ CHỌN'}</p><h2 id="cart-drawer-title">{en ? 'Shopping cart' : 'Giỏ hàng'} <span>{items.length}</span></h2></div><button type="button" onClick={close} aria-label={en ? 'Close cart' : 'Đóng giỏ hàng'}>×</button></header><div className="cart-drawer-body">{items.length ? <WebCartEditor savings={savings} items={items} compact/> : <div className="web-cart-empty"><span>＋</span><h3>{en ? 'A new experience awaits' : 'Thêm một trải nghiệm mới'}</h3><p>{en ? 'Choose a package to start your journey.' : 'Chọn gói vé yêu thích để bắt đầu hành trình.'}</p><button className="outline-button" onClick={close}>{en ? 'Continue exploring' : 'Tiếp tục chọn vé'}</button></div>}{error && <div className="web-cart-error" role="alert">{error}<button type="button" onClick={retry}>{en ? 'Retry' : 'Kiểm tra lại'}</button></div>}</div>{!!items.length && <footer className="cart-drawer-footer"><div><span>{en ? 'Total' : 'Tổng tiền'}</span><strong aria-live="polite">{busy ? (en ? 'Updating…' : 'Đang cập nhật…') : cartMoney(total)}</strong><small>{en ? 'Prices and availability checked at checkout.' : 'Giá và số vé được kiểm tra khi đặt.'}</small></div>{ready ? <Link className="web-checkout-button" href={localizedPath('/gio-hang', locale)} onClick={close}>{en ? 'Checkout' : 'Thanh toán'} <span>↗</span></Link> : <button className="web-checkout-button" disabled>{busy ? (en ? 'Updating…' : 'Đang cập nhật…') : (en ? 'Check your cart' : 'Kiểm tra giỏ vé')}</button>}</footer>}</>;
}
export function CartDrawer() {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLElement | null>(null), [open, setOpen] = useState(false);
  useEffect(() => { const show = () => { trigger.current = document.activeElement as HTMLElement; setOpen(true); }; window.addEventListener('jingo-open-cart', show); return () => window.removeEventListener('jingo-open-cart', show); }, []);
  useEffect(() => { if (!open) return; const element = dialog.current; element?.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { element?.close(); document.body.style.overflow = previous; trigger.current?.focus(); }; }, [open]);
  return <dialog ref={dialog} className="cart-drawer" aria-labelledby="cart-drawer-title" onClose={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) { const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) setOpen(false); } }}>{open && <DrawerContents close={() => setOpen(false)}/>}</dialog>;
}
