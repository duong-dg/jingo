import type{Metadata}from'next';
import{AdminFrame}from'../shared/admin-frame';
import{PostsEditor}from'./posts-editor';
import'../admin.css';import'../shared/content-admin.css';
export const metadata:Metadata={title:'Bài viết & SEO',robots:{index:false,follow:false}};
export default function PostsPage(){return <AdminFrame title="Bài viết & cẩm nang" active="posts"><PostsEditor/></AdminFrame>;}
