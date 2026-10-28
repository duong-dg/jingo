'use client';
import { useEffect, useState } from 'react';
import { downloadTicketFile, type TicketFile } from '../../lib/ticket-files';
import { useLocale } from '../components/locale-context';
export function CustomerTicketFiles({ code, accessKey, email, shared = false }: { code: string; accessKey: string; email: string; shared?: boolean }) {
  const en = useLocale() === 'en', [files, setFiles] = useState<TicketFile[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState('');
  const endpoint = shared ? '/api/v1/deliveries/files' : '/api/v1/orders/files';
  const body = { code: code.trim().toUpperCase(), ...(accessKey.trim() ? { accessKey: accessKey.trim() } : { email: email.trim() }) };
  useEffect(() => { let active = true; setFiles([]); setError(''); fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(); if (active) setFiles(data.data); }).catch(() => { if (active) setError(en ? 'Could not load ticket files. Refresh your booking to try again.' : 'Chưa tải được danh sách file vé. Tra cứu lại để thử tiếp.'); }); return () => { active = false; }; }, [code, accessKey, email, en, shared]);
  if (!files.length && !error) return null;
  return <section className="customer-ticket-files"><h3>{en ? 'Ticket files' : 'File vé đính kèm'}</h3><p className="order-muted">{en ? 'Download and present these files following the supplier instructions.' : 'Tải file và xuất trình theo hướng dẫn của nhà cung cấp.'}</p>{files.map(f => <div className="customer-ticket-file" key={f.id}><strong>{f.name}</strong><small>{Math.ceil(f.bytes / 1024)} KB</small><button className="outline-button" disabled={!!busy} onClick={async () => { setBusy(f.id); setError(''); try { await downloadTicketFile(endpoint + '/' + f.id + '/download', body); } catch { setError(en ? 'This file is unavailable. Refresh your booking or contact JinGo.' : 'File không còn khả dụng. Tra cứu lại hoặc liên hệ JinGo.'); } finally { setBusy(''); } }}>{busy === f.id ? (en ? 'Downloading…' : 'Đang tải…') : (en ? 'Download ticket' : 'Tải file vé')}</button></div>)}{error && <p className="order-error" role="alert">{error}</p>}</section>;
}
