export type VoucherSelection={productId:string;variantId:string};
export type VoucherTarget={productId:string;variantId?:string};
export function voucherApplies(voucher:{scope?:string;targets?:VoucherTarget[]},selection?:VoucherSelection){
 const scope=voucher.scope===undefined?'ALL':voucher.scope;
 if(scope==='ALL')return true;
 if(!selection||!Array.isArray(voucher.targets)||!voucher.targets.length)return false;
 if(scope==='PRODUCTS')return voucher.targets.some(t=>t.productId===selection.productId&&!t.variantId);
 if(scope==='VARIANTS')return voucher.targets.some(t=>t.productId===selection.productId&&t.variantId===selection.variantId);
 return false;
}
