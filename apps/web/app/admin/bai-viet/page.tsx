import type{Metadata}from'next';
import{AdminFrame}from'../shared/admin-frame';
import{PostsEditor}from'./posts-editor';
import'../admin.css';import'../shared/content-admin.css';import'./posts.css';
export const metadata:Metadata={title:'Bài viết & SEO',robots:{index:false,follow:false}};
export default async function PostsPage({searchParams}:{searchParams:Promise<{section?:string}>}){const categories=(await searchParams).section==='categories';return <AdminFrame title={categories?'Chuyên mục bài viết':'Bài viết & cẩm nang'} active={categories?'categories':'posts'}><PostsEditor categoriesOnly={categories}/></AdminFrame>;}
