type CopySource={id:string;name:string;slug:string;status:'DRAFT'|'PUBLISHED';version:number;seoTitle:string;english?:unknown;variants:{id:string;timeSlots?:{id:string}[]}[];rules:{id:string;productId:string;variantId:string}[];closures:{productId:string;variantId?:string}[]};
export function duplicateProduct<T extends CopySource>(source:T,makeId:()=>string=()=>crypto.randomUUID()){
 const{english,...copy}=structuredClone(source),id=makeId(),variants=new Map(source.variants.map(variant=>[variant.id,makeId()]));
 const variantId=(old:string)=>{const next=variants.get(old);if(!next)throw new Error('Lịch bán tham chiếu gói không tồn tại. Kiểm tra sản phẩm gốc trước khi nhân bản.');return next;};
 return{...copy,id,name:source.name.slice(0,190)+' (bản sao)',slug:source.slug.slice(0,125).replace(/-+$/,'')+'-ban-sao-'+id.replace(/-/g,'').slice(0,8),status:'DRAFT' as const,version:0,seoTitle:'',
  variants:copy.variants.map(variant=>({...variant,id:variantId(variant.id),...(variant.timeSlots?{timeSlots:variant.timeSlots.map(slot=>({...slot,id:makeId()}))}:{})})),
  rules:copy.rules.map(rule=>({...rule,id:makeId(),productId:id,variantId:variantId(rule.variantId)})),
  closures:copy.closures.map(closure=>({...closure,productId:id,...(closure.variantId?{variantId:variantId(closure.variantId)}:{})}))};
}
