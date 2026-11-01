import type {Metadata} from 'next';
import {AdminFrame} from '../shared/admin-frame';
import {BackupView} from './backup-view';
import '../admin.css';
import './backup.css';
export const metadata:Metadata={title:'Sao lưu & khôi phục',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <AdminFrame title="Sao lưu & khôi phục" active="backups"><BackupView/></AdminFrame>;}
