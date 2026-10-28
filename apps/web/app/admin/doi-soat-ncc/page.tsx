import {AdminFrame} from '../shared/admin-frame';
import {SupplierStatementDesk} from './statement-desk';
import '../admin.css';import '../shared/content-admin.css';import '../operations.css';import './statement.css';
export const metadata={title:'Đối soát nhà cung cấp',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Đối soát nhà cung cấp" active="supplier-statements"><SupplierStatementDesk/></AdminFrame>;}
