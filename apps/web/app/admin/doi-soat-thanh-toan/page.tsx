import type {Metadata} from 'next';
import {AdminFrame} from '../shared/admin-frame';
import {PaymentJournal} from '../thanh-toan/payment-journal';
import '../admin.css';import '../shared/content-admin.css';import '../thanh-toan/payments.css';
export const metadata:Metadata={title:'Đối soát thanh toán',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Đối soát thanh toán" active="payment-journal"><PaymentJournal/></AdminFrame>;}
