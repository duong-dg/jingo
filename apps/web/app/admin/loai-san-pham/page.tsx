import type{Metadata}from'next';
import{AdminFrame}from'../shared/admin-frame';
import{TypesEditor}from'./types-editor';
import'../admin.css';import'../shared/content-admin.css';
export const metadata:Metadata={title:'Loại sản phẩm',robots:{index:false,follow:false}};
export default function TypesPage(){return <AdminFrame title="Loại sản phẩm" active="types"><TypesEditor/></AdminFrame>;}
