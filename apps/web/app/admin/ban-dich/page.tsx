import type{Metadata}from'next';
import{AdminFrame}from'../shared/admin-frame';
import{TranslationsEditor}from'./translations-editor';
import'../admin.css';import'../shared/content-admin.css';import'./translations.css';
export const metadata:Metadata={title:'Ngôn ngữ & bản dịch',robots:{index:false,follow:false}};
export default function TranslationPage(){return <AdminFrame title="Ngôn ngữ & bản dịch" active="translations"><TranslationsEditor/></AdminFrame>;}
