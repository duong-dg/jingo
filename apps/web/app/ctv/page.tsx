import type{Metadata}from'next';import{PartnerPortal}from'./partner-portal';import'./partner.css';
export const metadata:Metadata={title:'Cổng cộng tác viên',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function PartnerPage(){return <PartnerPortal/>;}
