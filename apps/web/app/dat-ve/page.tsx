import{requestLocale}from'../../lib/request-locale';
import type { Metadata } from 'next';
import { Checkout } from './checkout';
import './orders.css';
export async function generateMetadata():Promise<Metadata>{const locale=await requestLocale();return{title:locale==='en'?'Request a booking':'Gửi yêu cầu đặt vé',robots:{index:false,follow:false},referrer:'no-referrer'};}
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  return <Checkout selection={{ productId:value('product'), variantId:value('variant'), date:value('date'),...(value('slotId')?{slotId:value('slotId')}:{}), quantities:{ ADULT:Number(value('ADULT') || 0), CHILD:Number(value('CHILD') || 0), SENIOR:Number(value('SENIOR') || 0) } }}/>;
}
