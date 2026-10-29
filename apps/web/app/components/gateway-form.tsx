'use client';
export type GatewayFormData={action:string;fields:Record<string,string>};
export function GatewayForm({form,beforeSubmit,targetBlank=false,label='Mở trang thanh toán thẻ SePay ↗'}:{form:GatewayFormData;beforeSubmit?:()=>void;targetBlank?:boolean;label?:string}){
 if(!['https://pay.sepay.vn/v1/checkout/init','https://pay-sandbox.sepay.vn/v1/checkout/init'].includes(form.action))return <p role="alert">Địa chỉ cổng thanh toán không hợp lệ.</p>;
 return <form method="POST" action={form.action} target={targetBlank?'_blank':undefined} rel="noreferrer" onSubmit={()=>beforeSubmit?.()}>{Object.entries(form.fields).map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}<button className="button" type="submit">{label}</button></form>;
}
