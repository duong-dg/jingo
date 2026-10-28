import type { Metadata } from 'next';
import { BasketPage } from './basket-page';
import '../dat-ve/orders.css';
import './cart.css';
export const metadata: Metadata = { title: 'Thanh toán / Checkout', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Page() { return <BasketPage/>; }
