import {PrintShift} from '../../print-shift';
import '../../../admin.css';import '../../../operations.css';import '../../shift-print.css';
export const metadata={title:'Biên bản bàn giao ca quầy',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){return <PrintShift id={(await params).id}/>;}
