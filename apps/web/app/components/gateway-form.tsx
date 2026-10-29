'use client';
import{useEffect,useRef}from'react';
export type GatewayFormData={action:string;fields:Record<string,string>};
export function GatewayForm({form,beforeSubmit,autoSubmit=false,targetBlank=false,label='Mở trang thanh toán thẻ SePay ↗'}:{form:GatewayFormData;autoSubmit?:boolean;beforeSubmit?:()=>void;targetBlank?:boolean;label?:string}){
 const element=useRef<HTMLFormElement>(null),sent=useRef(false);useEffect(()=>{if(autoSubmit&&!sent.current&&element.current){sent.current=true;element.current.requestSubmit();}},[autoSubmit]);
 if(!['https://pay.sepay.vn/v1/checkout/init','https://pay-sandbox.sepay.vn/v1/checkout/init'].includes(form.action))return <p role="alert">Địa chỉ cổng thanh toán không hợp lệ.</p>;
 return <form ref={element} method="POST" action={form.action} target={targetBlank?'_blank':undefined} rel="noreferrer" onSubmit={()=>beforeSubmit?.()}>{Object.entries(form.fields).map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}<button className="button" type="submit">{label}</button></form>;
}
