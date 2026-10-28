import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{PaymentSettingsEditor}from'./payment-settings';import'../admin.css';import'../shared/content-admin.css';import'./payments.css';
export const metadata:Metadata={title:'VNPay & SePay',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Thanh toán VNPay & SePay" active="payments"><PaymentSettingsEditor/></AdminFrame>;}
