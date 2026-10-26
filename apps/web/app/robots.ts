import type{MetadataRoute}from'next';
import{indexing,siteBase}from'../lib/content-api';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{return{rules:indexing()?{userAgent:'*',allow:['/','/api/v1/media/'],disallow:['/admin','/api/','/dat-ve','/tra-cuu']}:{userAgent:'*',disallow:'/'},sitemap:new URL('/sitemap.xml',siteBase()).toString()};}
