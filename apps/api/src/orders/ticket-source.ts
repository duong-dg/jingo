export type SupplierTicketDetails={expirationDate?:string;servicePackage?:string;usageTime?:string;supplierCode?:string;agency?:string};
const labels=[['expirationDate','Hạn\\s+sử\\s+dụng|Expiration\\s+date|Expiry\\s+date|Valid\\s+(?:until|to)'],['servicePackage','Tên\\s+gói(?:\\s+dịch\\s+vụ)?|Service\\s+Package|Ticket\\s+type'],['usageTime','Thời\\s+gian|Time'],['supplierCode','Code(?:\\s*/\\s*Mã\\s*vé)?|Mã\\s*vé|Ticket\\s+(?:code|number)'],['agency','Đại\\s*lý\\s*hợp\\s*tác|Cooperative\\s*agent|Partner\\s*agency']]as const;
export function supplierDetailsFromText(text:string):SupplierTicketDetails{
 const pattern=new RegExp('(?<![\\p{L}\\p{N}])('+labels.map(([,label])=>label).join('|')+')(?:\\s*[:/–-]?\\s*)','giu'),matches=[...text.matchAll(pattern)],values=new Map<string,Set<string>>();
 for(let i=0;i<matches.length;i++){const match=matches[i],key=labels.find(([,label])=>new RegExp('^(?:'+label+')$','iu').test(match[1]))?.[0];if(!key)continue;let value=text.slice(match.index!+match[0].length,matches[i+1]?.index??text.length).trim().replace(/^[\s/:–-]+/,'');if(!value)continue;
 if(key==='expirationDate'){value=value.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/)?.[0]||'';}
 else if(key==='usageTime')value=value.replace(/\s*\n\s*/g,' / ').replace(/\s+/g,' ').trim();else value=value.split('\n')[0].replace(/\s+/g,' ').trim();
 if(!value||value.length>(key==='usageTime'?180:100)||/https?:\/\//i.test(value))continue;
 if(key==='supplierCode'&&!/^[A-Za-z0-9][A-Za-z0-9 /._:-]{2,99}$/.test(value))continue;
 if(!values.has(key))values.set(key,new Set());values.get(key)!.add(value);
 }
 return Object.fromEntries([...values].filter(([,v])=>v.size===1).map(([k,v])=>[k,[...v][0]]));
}
export function pdfTicketText(items:any[]){const rows=new Map<number,{x:number;text:string}[]>();for(const item of items){if(typeof item.str!=='string'||!item.str.trim()||!Array.isArray(item.transform))continue;const y=Math.round(item.transform[5]/3)*3;const line=rows.get(y)||[];line.push({x:item.transform[4],text:item.str});rows.set(y,line);}return[...rows].sort(([a],[b])=>b-a).map(([,line])=>line.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join('\n');}
