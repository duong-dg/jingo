import {createHash} from 'node:crypto';
import {z} from 'zod';
export const translationState={status:z.enum(['DRAFT','PUBLISHED','NEEDS_REVIEW']).default('DRAFT'),sourceHash:z.string().regex(/^[a-f0-9]{64}$/).optional()};
export type TranslationKind='PRODUCT'|'POST'|'TYPE';
export function translationSource(kind:TranslationKind,item:any){
  if(kind==='PRODUCT')return{name:item.name,destination:item.destination,description:item.description,detailHtml:item.detailHtml||'',seoTitle:item.seoTitle||'',seoDescription:item.seoDescription||'',variants:item.variants.map((v:any)=>({id:v.id,name:v.name,conditions:Object.fromEntries(['ADULT', 'CHILD', 'SENIOR', 'LOCAL_ADULT', 'LOCAL_CHILD', 'LOCAL_SENIOR'].filter(g=>v.prices[g]!==undefined).map(g=>[g,v.conditions?.[g]||'']))}))};
  if(kind==='POST')return{title:item.title,excerpt:item.excerpt,contentHtml:item.contentHtml,category:item.category,seoTitle:item.seoTitle||'',seoDescription:item.seoDescription||''};
  return{name:item.name,description:item.description||''};
}
export const sourceHash=(kind:TranslationKind,item:any)=>createHash('sha256').update(JSON.stringify(translationSource(kind,item))).digest('hex');
export function translationStatus(kind:TranslationKind,item:any){if(!item.english)return'MISSING';if(kind==='POST')return item.english.status==='NEEDS_REVIEW'?'PUBLISHED':item.english.status||'DRAFT';if(item.english.status==='PUBLISHED'&&item.english.sourceHash!==sourceHash(kind,item))return'NEEDS_REVIEW';return item.english.status||'DRAFT';}
export const translated=(kind:TranslationKind,item:any)=>translationStatus(kind,item)==='PUBLISHED';
export function markTranslation(kind:TranslationKind,item:any){if(kind==='POST'){if(item.english?.status==='NEEDS_REVIEW')item.english.status='PUBLISHED';return;}if(item.english?.status==='PUBLISHED'&&!translated(kind,item))item.english.status='NEEDS_REVIEW';}
export function localizeProduct(item:any){const en=item.english;return{...item,name:en.name,destination:en.destination,description:en.description,detailHtml:en.detailHtml,seoTitle:en.seoTitle,seoDescription:en.seoDescription,cover:item.cover?{...item.cover,alt:en.name}:null,gallery:(item.gallery||[]).map((image:any)=>({...image,alt:en.name})),variants:item.variants.map((v:any)=>({...v,name:en.variants.find((t:any)=>t.id===v.id)?.name||v.name,conditions:en.variants.find((t:any)=>t.id===v.id)?.conditions||{}}))};}
