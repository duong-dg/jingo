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
