import {z} from 'zod';
import sanitizeHtml from 'sanitize-html';
export const imageRef=z.object({id:z.uuid(),alt:z.string().trim().max(300)}).strict();
export const slugSchema=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160);
export const typeSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),slug:slugSchema,name:z.string().trim().min(1).max(100),description:z.string().trim().max(1000).default(''),bookingKind:z.enum(['TICKET','TOUR']),status:z.enum(['ACTIVE','ARCHIVED']),version:z.number().int().min(0)}).strict();
export const postSchema=z.object({
  id:z.uuid(),slug:slugSchema,title:z.string().trim().min(1).max(200),excerpt:z.string().trim().max(1000),
  contentHtml:z.string().max(200000),cover:imageRef.nullable().default(null),category:z.string().trim().max(100).default('Cẩm nang'),
  author:z.string().trim().min(1).max(100),status:z.enum(['DRAFT','PUBLISHED']),publishedAt:z.iso.datetime({offset:true}).nullable().default(null),
  seoTitle:z.string().trim().max(200).default(''),seoDescription:z.string().trim().max(500).default(''),
  relatedProductIds:z.array(z.string().max(80)).max(12).default([]),version:z.number().int().min(0),
  english:z.object({title:z.string().max(200),excerpt:z.string().max(1000),contentHtml:z.string().max(200000),seoTitle:z.string().max(200),seoDescription:z.string().max(500)}).strict().optional()
}).strict();
export type Post=z.infer<typeof postSchema>;
export type ProductType=z.infer<typeof typeSchema>;
export const mediaSource=/^\/api\/v1\/media\/([0-9a-f-]{36})$/;
export function cleanContent(html:string){return sanitizeHtml(html,{
  allowedTags:['p','br','h2','h3','h4','strong','em','u','s','ul','ol','li','blockquote','pre','code','a','img','hr'],
  allowedAttributes:{a:['href','title'],img:['src','alt','width','height','loading']},
  allowedSchemes:['http','https','mailto','tel'],allowProtocolRelative:false,
  exclusiveFilter:frame=>frame.tag==='img'&&!mediaSource.test(frame.attribs.src||''),
  transformTags:{img:(_tag,attrs)=>({tagName:'img',attribs:{src:attrs.src||'',alt:attrs.alt||'',loading:'lazy'}})}
});}
export function contentImageIds(html:string){return Array.from(html.matchAll(/src="\/api\/v1\/media\/([0-9a-f-]{36})"/g),match=>match[1]);}
