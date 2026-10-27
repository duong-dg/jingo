'use client';
import{useEffect,useState}from'react';
import Link from'next/link';
import{adminApi}from'./admin-api';
const menuGroups=[
 {label:'Bán hàng',items:[['pos','/admin/ban-tai-quay','Bán vé tại quầy'],['pos-users','/admin/nhan-vien-quay','Nhân viên & phân quyền'],['reports','/admin/bao-cao','Báo cáo doanh thu']]},
 {label:'Sản phẩm',items:[['products','/admin','Sản phẩm & giá'],['types','/admin/loai-san-pham','Loại sản phẩm'],['destinations','/admin/diem-den','Điểm đến']]},
 {label:'Cộng tác viên',items:[['partners','/admin/ctv','CTV & công nợ'],['groups','/admin/nhom-gia','Nhóm giá CTV']]},
 {label:'Blog',items:[['posts','/admin/bai-viet','Bài viết'],['categories','/admin/bai-viet?section=categories','Chuyên mục']]},
 {label:'Cài đặt',items:[['smtp','/admin/smtp','Email & SMTP'],['translations','/admin/ban-dich','Ngôn ngữ & bản dịch']]}
];
export function AdminNav({active}:{active:string}){return <nav className="admin-menu" aria-label="Phân hệ quản trị"><Link href="/admin/don-hang" aria-current={active==='orders'?'page':undefined}>Đơn hàng</Link>{menuGroups.map(group=><details className="admin-nav-group" key={group.label} open={group.items.some(([key])=>key===active)}><summary>{group.label}<span aria-hidden="true">⌄</span></summary><div>{group.items.map(([key,url,label])=><Link key={key} href={url} aria-current={active===key?'page':undefined}>{label}</Link>)}</div></details>)}</nav>;}
export function useUnsavedChanges(dirty:boolean){useEffect(()=>{const handler=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);}
export function AdminFrame({title,active,children}:{title:string;active:string;children:React.ReactNode}){
  const[user,setUser]=useState('');const[error,setError]=useState('');
  useEffect(()=>{adminApi('me').then(me=>setUser(me.email)).catch(e=>setError(e.message));},[]);
  return <main id="main" className="admin-shell"><AdminSidebar active={active} user={user}/><div className="admin-workspace"><header className="admin-topbar"><div><p className="eyebrow">NỘI DUNG & KINH DOANH</p><h1>{title}</h1></div></header>{error&&<p className="admin-error" role="alert">{error}</p>}{user?children:<p>Đang kiểm tra đăng nhập…</p>}</div></main>;
}

export function AdminSidebar({active,user,onLogout}:{active:string;user?:string;onLogout?:()=>void}){return <aside className="admin-sidebar"><Link className="logo" href="/">jin<span>go</span>↗</Link><p className="eyebrow">BÀN LÀM VIỆC</p><div className="admin-desktop-menu"><AdminNav active={active}/></div><details className="admin-mobile-menu"><summary>☰ Menu quản trị</summary><AdminNav active={active}/></details><div className="sidebar-bottom"><small>{user}</small><Link href="/">Xem website ↗</Link><button onClick={onLogout||(()=>{void adminApi('logout',{}).then(()=>window.location.assign('/admin'));})}>Đăng xuất</button></div></aside>;}
