import{z}from'zod';
import type{Product}from'../catalog/catalog.data';
import{calculateQuote}from'./pricing';

export const onlineDiscountSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('NONE'),value:z.literal(0).default(0)}).strict(),
 z.object({type:z.literal('PERCENT'),value:z.number().int().min(1).max(100)}).strict(),
 z.object({type:z.literal('AMOUNT'),value:z.number().int().min(1).max(100000000)}).strict()
]);
export type OnlineDiscount=z.infer<typeof onlineDiscountSchema>;
type BaseQuote=ReturnType<typeof calculateQuote>;
export type OnlineQuote=Omit<BaseQuote,'lines'>&{lines:(Omit<BaseQuote['lines'][number],'ruleId'>&{ruleId?:string;originalUnitPrice?:number;unitDiscount?:number})[];onlineDiscount?:OnlineDiscount&{amount:number;subtotal:number}};
export function onlineUnitPrice(price:number,discount?:OnlineDiscount){
 if(!discount||discount.type==='NONE')return price;
 const reduction=discount.type==='PERCENT'?Math.floor(price*discount.value/100):discount.value;
 return Math.max(0,price-reduction);
}
export function calculateOnlineQuote(...args:Parameters<typeof calculateQuote>):OnlineQuote{
 const quote=calculateQuote(...args),product=args[0],variant=product.variants.find(v=>v.id===args[1])!;
 const config=variant.onlineDiscount??product.onlineDiscount;
 const lines=quote.lines.map(line=>{const unitPrice=onlineUnitPrice(line.unitPrice,config);return{...line,unitPrice,subtotal:unitPrice*line.quantity,...(unitPrice<line.unitPrice?{originalUnitPrice:line.unitPrice,unitDiscount:line.unitPrice-unitPrice}:{})};});
 const total=lines.reduce((sum,line)=>sum+line.subtotal,0),amount=quote.total-total;
 return{...quote,lines,total,...(amount>0&&config?{onlineDiscount:{...config,amount,subtotal:quote.total}}:{})};
}
export function publicOnlineVariants(product:Product){return product.variants.map(variant=>{
 const discount=variant.onlineDiscount??product.onlineDiscount;
 return{...variant,originalPrices:{...variant.prices},prices:Object.fromEntries(Object.entries(variant.prices).map(([group,price])=>[group,onlineUnitPrice(price!,discount)]))};
});}
export function checkOnlineVoucher(quote:ReturnType<typeof calculateOnlineQuote>,voucher?:string){
 if(voucher&&quote.onlineDiscount?.amount)throw new Error('Ưu đãi online không cộng dồn mã giảm giá. Bỏ mã để dùng giá online.');
}
