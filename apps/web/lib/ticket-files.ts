export type TicketFile = { id: string; ticket_id: string; name: string; mime: string; bytes: number; created_at: string; revoked_at: string | null };
export async function downloadTicketFile(url: string, body?: unknown) {
  const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'X-Jingo-Admin': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, cache: 'no-store', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Không tải được file vé.'); }
  const type = response.headers.get('content-type') || '';
  if (!type.startsWith('application/pdf') && !type.startsWith('image/webp')) throw new Error('Không nhận được file vé hợp lệ.');
  const blob = await response.blob(), link = document.createElement('a'), objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl; link.download = 'jingo-ticket.' + (type.startsWith('application/pdf') ? 'pdf' : 'webp');
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function attachDeliveryFile(prefix:'admin'|'pos',order:{id:string;version:number;tickets:{id:string;code:string}[]},code:string,file:File){const ticket=order.tickets.find(t=>t.code===code);if(!ticket)throw new Error('Đã lưu mã nhưng chưa xác định được mã nhận file. Mở phần Đính kèm file để tiếp tục.');const body=new FormData();body.set('ticketId',ticket.id);body.set('version',String(order.version));body.set('file',file);let response:Response;try{response=await fetch('/api/v1/'+prefix+'/orders/'+order.id+'/files',{method:'POST',headers:{'X-Jingo-Admin':'1','X-Jingo-POS':'1'},body});}catch{throw new Error('Đã giao mã, nhưng chưa xác nhận được file do lỗi kết nối. Cập nhật đơn và kiểm tra phần file trước khi thử lại.');}const data=await response.json();if(!response.ok)throw new Error('Đã giao mã, nhưng chưa gắn được file: '+(data.message||'hãy đính kèm lại ở phần file vé.'));return data;}

export async function openTicketForPrint(url:string){
 const preview=window.open('about:blank','_blank');if(!preview)throw new Error('Cho phép mở cửa sổ để xem và in vé.');preview.opener=null;
 try{const response=await fetch(url,{headers:{'X-Jingo-Admin':'1','X-Jingo-POS':'1'},cache:'no-store'});if(!response.ok)throw new Error('Không mở được file vé.');const blob=await response.blob();if(!['application/pdf','image/webp'].includes(blob.type))throw new Error('File vé không hợp lệ.');const objectUrl=URL.createObjectURL(blob);preview.location.href=objectUrl;setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);}catch(error){preview.close();throw error;}
}

export async function readTicketResponse(response:Response){
 let data:any;try{data=await response.json();}catch{throw new Error('Máy chủ chưa trả kết quả xuất vé (HTTP '+response.status+'). File nhiều vé có thể vẫn đang xử lý. Cập nhật đơn và kiểm tra vé đã tạo trước khi thử lại.');}
 if(!response.ok)throw new Error(Array.isArray(data?.message)?data.message.join(' · '):data?.message||'Không xử lý được file vé (HTTP '+response.status+').');
 if(!data||typeof data!=='object')throw new Error('Kết quả xuất vé không hợp lệ. Cập nhật đơn để kiểm tra.');return data;
}
