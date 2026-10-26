import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{PartnersEditor}from'./partners-editor';import'../admin.css';import'../shared/content-admin.css';import'./partners-admin.css';
export const metadata:Metadata={title:'CTV & công nợ',robots:{index:false,follow:false}};
export default function PartnersPage(){return <AdminFrame title="Cộng tác viên & công nợ" active="partners"><PartnersEditor/></AdminFrame>;}
