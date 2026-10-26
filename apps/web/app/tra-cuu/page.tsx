import{requestLocale}from'../../lib/request-locale';
import type { Metadata } from 'next';
import { OrderLookup } from './order-lookup';
import '../dat-ve/orders.css';
export async function generateMetadata():Promise<Metadata>{const locale=await requestLocale();return{title:locale==='en'?'Find your booking':'Tra cứu đơn hàng',robots:{index:false,follow:false},referrer:'no-referrer'};}
export default function LookupPage(){return <OrderLookup/>;}
