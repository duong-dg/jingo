import type { Metadata } from 'next';
import { OrderLookup } from './order-lookup';
import '../dat-ve/orders.css';
export const metadata:Metadata = { title:'Tra cứu đơn hàng',robots:{index:false,follow:false},referrer:'no-referrer' };
export default function LookupPage(){return <OrderLookup/>;}
