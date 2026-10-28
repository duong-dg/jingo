import { AdminFrame } from '../shared/admin-frame';
import { TicketStock } from './ticket-stock';
import '../admin.css';
import '../shared/content-admin.css';
import './stock.css';
export const metadata = { title: 'Kho mã vé', robots: { index: false, follow: false } };
export default function Page() { return <AdminFrame title="Kho mã vé nhà cung cấp" active="ticket-stock"><TicketStock/></AdminFrame>; }
