import{AdminFrame}from'../shared/admin-frame';import{UserGuide}from'../../components/user-guide';import'../admin.css';import'../shared/content-admin.css';
export const metadata={title:'Hướng dẫn quản trị',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Hướng dẫn sử dụng" active="guide"><UserGuide role="admin"/></AdminFrame>;}
