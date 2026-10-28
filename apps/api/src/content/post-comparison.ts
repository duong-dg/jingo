import{cleanContent,type Post}from'./content.schema';
export function comparePosts(before:Post,after:Post,lang:'vi'|'en'){
 const source=(post:Post)=>lang==='en'?post.english:post;
 const a=source(before),b=source(after);
 const fields:{key:string;label:string;kind:'text'|'html';before:string;after:string;changed:boolean}[]=[];
 const add=(key:string,label:string,left:unknown,right:unknown,kind:'text'|'html'='text')=>{const from=String(left??''),to=String(right??'');fields.push({key,label,kind,before:from,after:to,changed:from!==to});};
 add('title','Tiêu đề',a?.title,b?.title);add('excerpt','Mô tả ngắn',a?.excerpt,b?.excerpt);add('content','Nội dung',cleanContent(a?.contentHtml||''),cleanContent(b?.contentHtml||''),'html');add('seoTitle','Tiêu đề SEO',a?.seoTitle,b?.seoTitle);add('seoDescription','Mô tả SEO',a?.seoDescription,b?.seoDescription);add('category','Chuyên mục',a?.category,b?.category);
 add('slug','Đường dẫn',before.slug,after.slug);add('author','Tác giả',before.author,after.author);add('status','Trạng thái bài',before.status,after.status);add('publishedAt','Lịch xuất bản',before.publishedAt,after.publishedAt);
 const cover=(p:Post)=>p.cover?p.cover.id+' · '+p.cover.alt:'';add('cover','Ảnh đại diện (mã ảnh · mô tả)',cover(before),cover(after));add('related','Mã sản phẩm liên quan',(before.relatedProductIds||[]).join('\n'),(after.relatedProductIds||[]).join('\n'));
 if(lang==='en')add('translationStatus','Trạng thái bản dịch',before.english?.status||'MISSING',after.english?.status||'MISSING');
 return{fields,changedCount:fields.filter(f=>f.changed).length};
}
