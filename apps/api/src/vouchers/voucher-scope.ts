export type VoucherSelection={productId:string;variantId:string;date?:string};
export type VoucherTarget={productId:string;variantId?:string};
export function voucherApplies(voucher:{scope?:string;targets?:VoucherTarget[]},selection?:VoucherSelection){
 const scope=voucher.scope===undefined?'ALL':voucher.scope;
 if(scope==='ALL')return true;
 if(!selection||!Array.isArray(voucher.targets)||!voucher.targets.length)return false;
 if(scope==='PRODUCTS')return voucher.targets.some(t=>t.productId===selection.productId&&!t.variantId);
 if(scope==='VARIANTS')return voucher.targets.some(t=>t.productId===selection.productId&&t.variantId===selection.variantId);
 return false;
}

// Dates are calendar dates of ticket use in Vietnam, independent of booking time.
export function voucherVisitApplies(voucher:{visitFrom?:string|null;visitTo?:string|null;visitWeekdays?:number[]},date?:string){
 const restricted=!!voucher.visitFrom||!!voucher.visitTo||!!voucher.visitWeekdays?.length;
 if(!restricted)return true;
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const parsed=new Date(date+'T00:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return false;
 return (!voucher.visitFrom||date>=voucher.visitFrom)&&(!voucher.visitTo||date<=voucher.visitTo)&&(!voucher.visitWeekdays?.length||voucher.visitWeekdays.includes(parsed.getUTCDay()));
}
