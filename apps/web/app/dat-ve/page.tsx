import{requestLocale}from'../../lib/request-locale';
import type { Metadata } from 'next';
import { Checkout } from './checkout';
import './orders.css';
export async function generateMetadata():Promise<Metadata>{const locale=await requestLocale();return{title:locale==='en'?'Book tickets':'Đặt vé',robots:{index:false,follow:false},referrer:'no-referrer'};}
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  return <Checkout selection={{ productId:value('product'), variantId:value('variant'), date:value('date'),...(value('slotId')?{slotId:value('slotId')}:{}), quantities:{ ADULT:Number(value('ADULT') || 0), CHILD:Number(value('CHILD') || 0), SENIOR:Number(value('SENIOR') || 0), LOCAL_ADULT:Number(value('LOCAL_ADULT') || 0), LOCAL_CHILD:Number(value('LOCAL_CHILD') || 0), LOCAL_SENIOR:Number(value('LOCAL_SENIOR') || 0) } }}/>;
}
