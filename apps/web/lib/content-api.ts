import type{SaleClosure}from'./sale-calendar';
import type{Locale}from'./i18n';
export type ImageRef={id:string;alt:string};
export type Product={saleClosures?:SaleClosure[];languages?:string[];id:string;slug:string;name:string;destination:string;destinationId?:string;description:string;type:string;typeName?:string;typeSlug?:string;bookingKind?:'TICKET'|'TOUR';demo?:boolean;cover?:ImageRef|null;gallery?:ImageRef[];detailHtml?:string;seoTitle?:string;seoDescription?:string;variants:{timeSlots?:{id:string;start:string;end?:string}[];id:string;name:string;prices:Partial<Record<'ADULT' | 'CHILD' | 'SENIOR' | 'LOCAL_ADULT' | 'LOCAL_CHILD' | 'LOCAL_SENIOR',number>>;conditions?:Partial<Record<'ADULT' | 'CHILD' | 'SENIOR' | 'LOCAL_ADULT' | 'LOCAL_CHILD' | 'LOCAL_SENIOR',string>>}[]};
export type Post={languages?:string[];id:string;slug:string;title:string;excerpt:string;contentHtml?:string;cover:ImageRef|null;category:string;author:string;publishedAt:string|null;seoTitle:string;seoDescription:string;relatedProductIds:string[];updatedAt:string};
export type ProductType={languages?:string[];id:string;name:string;slug:string;description?:string;bookingKind:'TICKET'|'TOUR'};
export const imageUrl=(image:ImageRef)=>`/api/v1/media/${image.id}`;
export const siteBase=()=>process.env.PUBLIC_BASE_URL||'http://localhost:3000';
export const indexing=()=>process.env.SEO_INDEXING==='true';
export async function contentApi<T>(path:string,locale:Locale='vi'):Promise<T>{const response=await fetch(`${process.env.INTERNAL_API_URL||'http://localhost:4000'}/api/v1/${path}${path.includes('?')?'&':'?'}lang=${locale}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Object.assign(new Error('Không tải được nội dung.'),{status:response.status});return(await response.json()).data;}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,()=>String.fromCharCode(92)+'u003c');}

export function languageAlternates(path:string,languages:string[]=['vi']){const links=Object.fromEntries(languages.map(lang=>[lang,new URL(lang==='en'?'/en'+(path==='/'?'':path):path,siteBase()).toString()]));return {...links,...(links.vi?{'x-default':links.vi}:{})};}
