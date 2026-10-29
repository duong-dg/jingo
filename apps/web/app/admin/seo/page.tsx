import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{SeoEditor}from'./seo-editor';import{indexing}from'../../../lib/content-api';import'../admin.css';import'../shared/content-admin.css';
export const metadata:Metadata={title:'SEO trang chủ',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="SEO trang chủ" active="seo"><SeoEditor indexingEnabled={indexing()}/></AdminFrame>;}
