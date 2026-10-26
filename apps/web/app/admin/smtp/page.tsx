import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{SmtpEditor}from'./smtp-editor';import'../admin.css';import'../shared/content-admin.css';
export const metadata:Metadata={title:'Email & SMTP',robots:{index:false,follow:false}};
export default function SmtpPage(){return <AdminFrame title="Email & SMTP" active="smtp"><SmtpEditor/></AdminFrame>;}
