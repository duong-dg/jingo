import {PrintShift} from '../../../../admin/ca-quay/print-shift';
import '../../../../admin/admin.css';import '../../../../admin/operations.css';import '../../../../admin/ca-quay/shift-print.css';
export const metadata={title:'Biên bản bàn giao ca quầy',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){return <PrintShift id={(await params).id} pos/>;}
