import {AdminFrame} from '../shared/admin-frame';
import {ShiftsDesk} from './shifts-desk';
import '../admin.css';import '../shared/content-admin.css';import '../operations.css';import './shifts.css';
export const metadata={title:'Ca bán hàng tại quầy',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Ca bán hàng & bàn giao" active="shifts"><ShiftsDesk/></AdminFrame>;}
