import type{Metadata}from'next';import{AdminFrame}from'../shared/admin-frame';import{PaymentSettingsEditor}from'./payment-settings';import'../admin.css';import'../shared/content-admin.css';import'./payments.css';
export const metadata:Metadata={title:'Cổng thanh toán',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Cổng thanh toán" active="payments"><PaymentSettingsEditor/></AdminFrame>;}
