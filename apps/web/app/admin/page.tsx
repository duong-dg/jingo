import{cookies}from'next/headers';import{notFound}from'next/navigation';
import type { Metadata } from 'next';
import { AdminConsole } from './admin-console';
import './admin.css';
import './shared/content-admin.css';
export const metadata: Metadata = { title: 'Quản trị JinGo', robots: { index: false, follow: false } };
export default async function AdminPage(){const base=process.env.INTERNAL_API_URL||'http://localhost:4000';const response=await fetch(base+'/api/v1/admin/login-policy',{cache:'no-store'});if(!response.ok)throw new Error('Không kiểm tra được chính sách đăng nhập.');const policy=await response.json();if(policy.privateEntryEnabled){const token=(await cookies()).get('jingo_admin')?.value;if(!token||!/^[a-f0-9]{64}$/.test(token))notFound();const me=await fetch(base+'/api/v1/admin/me',{cache:'no-store',headers:{Cookie:'jingo_admin='+token}});if(!me.ok)notFound();}return <AdminConsole/>;}
