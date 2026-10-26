'use client';
import{useEffect,useState}from'react';
import Link from'next/link';
import{adminApi}from'./admin-api';
export function AdminNav({active}:{active:string}){return <nav className="admin-section-nav" aria-label="Phân hệ quản trị">{[['products','/admin','Sản phẩm & giá'],['orders','/admin/don-hang','Đơn hàng'],['partners','/admin/ctv','CTV & công nợ'],['groups','/admin/nhom-gia','Nhóm giá CTV'],['types','/admin/loai-san-pham','Loại sản phẩm'],['posts','/admin/bai-viet','Bài viết'],['translations','/admin/ban-dich','Ngôn ngữ & bản dịch']].map(([key,url,label])=><Link key={key} href={url} aria-current={active===key?'page':undefined}>{label}</Link>)}</nav>;}
export function useUnsavedChanges(dirty:boolean){useEffect(()=>{const handler=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);}
export function AdminFrame({title,active,children}:{title:string;active:string;children:React.ReactNode}){
  const[user,setUser]=useState('');const[error,setError]=useState('');
  useEffect(()=>{adminApi('me').then(me=>setUser(me.email)).catch(e=>setError(e.message));},[]);
  return <main id="main" className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="logo">jin<span>go</span>↗</Link><p className="eyebrow">BÀN LÀM VIỆC</p><Link href="/admin">▦ Sản phẩm & giá</Link><Link href="/admin/don-hang">▤ Đơn hàng</Link><Link href="/admin/bai-viet">▧ Bài viết</Link><Link href="/admin/loai-san-pham">◇ Loại sản phẩm</Link><div className="sidebar-bottom"><small>{user}</small><Link href="/">Xem website ↗</Link></div></aside><div className="admin-workspace"><header className="admin-topbar"><div><p className="eyebrow">NỘI DUNG & KINH DOANH</p><h1>{title}</h1></div></header><AdminNav active={active}/>{error&&<p className="admin-error" role="alert">{error}</p>}{user?children:<p>Đang kiểm tra đăng nhập…</p>}</div></main>;
}
