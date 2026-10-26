import type { Metadata } from 'next';
import { OrdersAdmin } from './orders-admin';
import '../admin.css';
import './orders-admin.css';
export const metadata:Metadata={title:'Quản lý đơn hàng',robots:{index:false,follow:false}};
export default function OrdersAdminPage(){return <OrdersAdmin/>;}
