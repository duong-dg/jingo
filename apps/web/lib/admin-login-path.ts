export function adminLoginPath(){try{const value=sessionStorage.getItem('jingo-admin-entry')||'';if(/^\/jingo-[a-f0-9]{24}$/.test(value))return value;}catch{}return '/admin';}
export function rememberAdminEntry(path:string){if(/^\/jingo-[a-f0-9]{24}$/.test(path))try{sessionStorage.setItem('jingo-admin-entry',path);}catch{}}
