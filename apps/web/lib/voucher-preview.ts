export function voucherPreview(subtotal:number,discountType:'PERCENT'|'FIXED',value:number,minSubtotal:number,maxDiscount:number|null){
 if(!Number.isSafeInteger(subtotal)||subtotal<0||subtotal>15000000000)return{discount:0,total:0,eligible:false};
 if(!Number.isInteger(value)||value<1||value>100000000||discountType==='PERCENT'&&value>100||!Number.isSafeInteger(minSubtotal)||minSubtotal<0||minSubtotal>15000000000||maxDiscount!==null&&(!Number.isSafeInteger(maxDiscount)||maxDiscount<1||maxDiscount>15000000000)||subtotal<minSubtotal)return{discount:0,total:subtotal,eligible:false};
 const raw=discountType==='PERCENT'?Math.floor(subtotal*value/100):value,discount=Math.min(subtotal,raw,discountType==='PERCENT'&&maxDiscount!==null?maxDiscount:subtotal);return{discount,total:subtotal-discount,eligible:true};
}
