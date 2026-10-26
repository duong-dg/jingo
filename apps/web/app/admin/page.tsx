import type { Metadata } from 'next';
import { AdminConsole } from './admin-console';
import './admin.css';
export const metadata: Metadata = { title: 'Quản trị JinGo', robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminConsole/>; }
