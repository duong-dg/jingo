'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArticleView} from '../../components/article-view';
import {adminApi} from '../shared/admin-api';
import type {Post,Product} from '../../../lib/content-api';
type Preview=Post&{version:number;status:string;translationStatus:string};
export function PostPreview({id,lang,revision}:{id:string;lang:'vi'|'en';revision?:string}){
 const[post,setPost]=useState<Preview|null>(null),[products,setProducts]=useState<Product[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;setPost(null);setProducts([]);setError('');const query=new URLSearchParams({lang,...(revision?{revision}:{})});adminApi('posts/'+encodeURIComponent(id)+'/preview?'+query).then(async result=>{if(!active)return;setPost(result.data);try{const r=await fetch('/api/v1/products?lang='+lang,{cache:'no-store'});if(!r.ok)throw new Error('Không tải được sản phẩm liên quan.');const p=await r.json();if(active)setProducts(p.data.filter((p:Product)=>result.data.relatedProductIds.includes(p.id)));}catch{if(active)setProducts([]);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id,lang,revision]);
 return <><div className="post-preview-bar"><div><strong>XEM TRƯỚC · CHỈ ADMIN</strong><p>{revision?'Phiên bản lịch sử':'Nội dung đã lưu'}{post?' · v'+post.version:''} · {lang==='en'?'English':'Tiếng Việt'} · Không thay đổi trạng thái xuất bản.</p></div><nav aria-label="Tùy chọn xem trước"><Link href={'/admin/bai-viet/xem-truoc/'+id+'?'+new URLSearchParams({lang:lang==='en'?'vi':'en',...(revision?{revision}:{})})}>{lang==='en'?'Tiếng Việt':'English'}</Link><Link href="/admin/bai-viet">← Quản lý bài viết</Link></nav></div>{error?<main id="main" className="post-preview-message" role="alert">{error}</main>:post?<ArticleView post={post} products={products} locale={lang}/>:<main id="main" className="post-preview-message">Đang kiểm tra quyền và tải bài xem trước…</main>}</>;
}
