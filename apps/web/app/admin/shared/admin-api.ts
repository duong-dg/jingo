import{adminLoginPath}from'../../../lib/admin-login-path';
export async function adminApi(path:string,body?:unknown){
  const response=await fetch(`/api/v1/admin/${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Jingo-Admin':'1'},cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok){if(response.status===401)window.location.assign(window.location.pathname==='/quay'?'/quay':adminLoginPath());throw new Error(Array.isArray(result.message)?result.message.join('\n'):result.message||'Không xử lý được yêu cầu.');}return result;
}
export function slugify(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
