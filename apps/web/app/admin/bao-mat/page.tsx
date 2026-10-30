import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{SecurityEditor}from'./security-editor';import'../admin.css';import'./security.css';
export const metadata:Metadata={title:'Bảo mật quản trị',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <AdminFrame title="Bảo mật & nhật ký đăng nhập" active="security"><SecurityEditor/></AdminFrame>;}
