import {CounterPortal} from '../counter-portal';
import '../../admin/admin.css';import '../../admin/shared/content-admin.css';import '../../admin/operations.css';import '../../admin/ca-quay/shifts.css';import '../quay.css';
export const metadata={title:'Ca bán hàng tại quầy',robots:{index:false,follow:false}};
export default function Page(){return <CounterPortal view="shifts"/>;}
