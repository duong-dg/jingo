import {PostPreview} from '../../post-preview';
import '../../preview.css';
export const metadata={title:'Xem trước bài viết',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{lang?:string;revision?:string}>}){const {id}=await params,query=await searchParams;return <PostPreview id={id} lang={query.lang==='en'?'en':'vi'} revision={query.revision}/>;}
