import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{GroupsEditor}from'./groups-editor';import'../admin.css';import'../shared/content-admin.css';import'../ctv/partners-admin.css';
export const metadata:Metadata={title:'Nhóm giá CTV',robots:{index:false,follow:false}};
export default function GroupsPage(){return <AdminFrame title="Nhóm giá cộng tác viên" active="groups"><GroupsEditor/></AdminFrame>;}
