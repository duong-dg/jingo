import type{Metadata}from'next';import{DeliveryView}from'./delivery-view';import'../dat-ve/orders.css';import'./delivery.css';
export const metadata:Metadata={title:'Nhận vé của bạn',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function DeliveryPage(){return <DeliveryView/>;}
