import type{DestinationNode}from'../lib/destinations';
import type{MetadataRoute}from'next';
import{contentApi,Product,Post,ProductType,indexing,languageAlternates}from'../lib/content-api';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!indexing())return[];
 const[products,posts,types,destinations]=await Promise.all([contentApi<Product[]>('products'),contentApi<Post[]>('posts'),contentApi<ProductType[]>('product-types'),contentApi<DestinationNode[]>('destinations')]);
 function entries(path:string,languages:string[]=['vi'],lastModified?:Date,paths?:Partial<Record<'vi'|'en',string>>):MetadataRoute.Sitemap{const links=languageAlternates(path,languages,paths);return Object.entries(links).filter(([language])=>language!=='x-default').map(([,url])=>({url,...(lastModified?{lastModified}:{}),alternates:{languages:links}}));}
 return[...entries('/',['vi','en']),...entries('/cam-nang',['vi','en']),...entries('/diem-den',['vi','en']),...destinations.flatMap(n=>entries('/diem-den/'+n.slug,['vi','en'],undefined,n.localePaths)),...products.filter(p=>!p.demo).flatMap(p=>entries(`/ve/${p.slug}`,p.languages)),...posts.flatMap(p=>entries(`/cam-nang/${p.slug}`,p.languages,new Date(p.updatedAt),p.localePaths)),...types.filter(type=>products.some(p=>!p.demo&&p.type===type.id)).flatMap(type=>entries(`/loai/${type.slug}`,type.languages))];
}
