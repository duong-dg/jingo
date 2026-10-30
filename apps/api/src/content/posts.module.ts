import{englishSlug,reserveEnglishPost}from'./localized-slugs';
import{comparePosts}from'./post-comparison';
import{z}from'zod';
import{markTranslation,translated}from'./translations';
import{BadRequestException,Body,ConflictException,Controller,Get,Injectable,Module,NotFoundException,Param,Query,Post as HttpPost,Req,Res,UseGuards}from'@nestjs/common';
import type{Request,Response}from'express';
import{randomUUID}from'node:crypto';
import{DatabaseService}from'../database/database.module';
import{AdminGuard,AuthModule}from'../admin/auth.module';
import{MediaModule,MediaService}from'./media.module';
import{Post,postSchema,cleanContent,contentImageIds}from'./content.schema';
import{reserveSlug}from'./slug-alias';
@Injectable()
export class PostsService{
  constructor(private readonly db:DatabaseService,private readonly media:MediaService){}
  private unpack(row:{data:Post;version:number;updated_at:Date}){return{...row.data,version:row.version,updatedAt:new Date(row.updated_at).toISOString()};}
  private visible(post:Post){return post.status==='PUBLISHED'&&(!post.publishedAt||new Date(post.publishedAt).getTime()<=Date.now());}
  async list(admin=false){const result=await this.db.pool.query('SELECT data,version,updated_at FROM jingo_posts ORDER BY updated_at DESC');return result.rows.map(row=>this.unpack(row)).filter(post=>admin||this.visible(post));}
  async categories(){const saved=await this.db.pool.query('SELECT name FROM jingo_post_categories ORDER BY name');const posts=await this.list(true);return [...new Set(['Cẩm nang',...saved.rows.map(row=>row.name as string),...posts.map(post=>post.category)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));}
  async categoryDictionary(){return new Map<string,string|null>((await this.db.pool.query('SELECT name,english_name FROM jingo_post_categories')).rows.map(r=>[r.name,r.english_name]));}
  categoryEnglishFrom(dictionary:Map<string,string|null>,name:string,legacy?:string){const value=dictionary.get(name);return value!==undefined&&value!==null?value.trim()||name:legacy?.trim()||(name==='Cẩm nang'?'Travel guide':name);}
  async categoryEnglish(name:string,legacy?:string){return this.categoryEnglishFrom(await this.categoryDictionary(),name,legacy);}
  async categoryTranslations(){const[names,rows,posts]=await Promise.all([this.categories(),this.db.pool.query('SELECT name,english_name,version FROM jingo_post_categories'),this.list(true)]);return names.map(name=>{const row=rows.rows.find(r=>r.name===name),legacy=posts.find(p=>p.category===name&&p.english?.category?.trim())?.english?.category;return{name,englishName:row?.english_name??legacy??(name==='Cẩm nang'?'Travel guide':''),version:row?.version||0};});}
  async saveCategoryTranslation(body:unknown,actor:string){const parsed=z.object({name:z.string().trim().min(1).max(100),englishName:z.string().trim().max(100),version:z.number().int().min(0)}).strict().safeParse(body);if(!parsed.success)throw new BadRequestException('Tên chuyên mục tiếng Anh tối đa 100 ký tự.');const input=parsed.data;if(!(await this.categories()).includes(input.name))throw new NotFoundException('Chuyên mục không còn tồn tại.');const client=await this.db.pool.connect();try{await client.query('BEGIN');if(input.version===0)await client.query('INSERT INTO jingo_post_categories(name,english_name)VALUES($1,$2)',[input.name,input.englishName]);else{const changed=await client.query('UPDATE jingo_post_categories SET english_name=$1,version=version+1 WHERE name=$2 AND version=$3',[input.englishName,input.name,input.version]);if(!changed.rowCount)throw new ConflictException('Chuyên mục đã thay đổi. Tải lại trước khi lưu.');}await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'post-category.translate',input.name]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');if((e as{code?:string}).code==='23505')throw new ConflictException('Chuyên mục đã thay đổi. Tải lại trước khi lưu.');throw e;}finally{client.release();}return this.categoryTranslations();}
  async addCategory(body:unknown){const name=typeof body==='object'&&body!==null&&'name'in body&&typeof body.name==='string'?body.name.trim():'';if(!name||name.length>100)throw new BadRequestException('Tên chuyên mục cần 1–100 ký tự.');await this.db.pool.query('INSERT INTO jingo_post_categories(name)VALUES($1) ON CONFLICT(name) DO NOTHING',[name]);return this.categories();}
  async categoryAction(body:unknown,adminId:string){
   const parsed=z.discriminatedUnion('action',[z.object({action:z.literal('RENAME'),name:z.string().trim().min(1).max(100),newName:z.string().trim().min(1).max(100)}).strict(),z.object({action:z.literal('DELETE'),name:z.string().trim().min(1).max(100)}).strict()]).safeParse(body);
   if(!parsed.success)throw new BadRequestException('Chọn chuyên mục và thao tác hợp lệ.');const input=parsed.data;
   if(input.name==='Cẩm nang')throw new BadRequestException('Giữ chuyên mục mặc định Cẩm nang để nhận bài khi xóa chuyên mục khác.');
   const target=input.action==='RENAME'?input.newName:'Cẩm nang';if(target===input.name)return this.categories();
   const client=await this.db.pool.connect();try{await client.query('BEGIN');
    const categories=await client.query('SELECT name,english_name,version FROM jingo_post_categories ORDER BY name FOR UPDATE'),posts=await client.query('SELECT id,data,version,updated_at FROM jingo_posts ORDER BY id FOR UPDATE');
    if(!categories.rows.some(r=>r.name===input.name)&&!posts.rows.some(r=>r.data.category===input.name))throw new NotFoundException('Chuyên mục không còn tồn tại.');
    if(input.action==='RENAME'&&[...categories.rows.map(r=>r.name),...posts.rows.map(r=>r.data.category)].some(n=>n!==input.name&&n.toLocaleLowerCase('vi')===target.toLocaleLowerCase('vi')))throw new ConflictException('Tên chuyên mục đã tồn tại.');
    await client.query('INSERT INTO jingo_post_categories(name)VALUES($1) ON CONFLICT(name) DO NOTHING',[target]);
    if(input.action==='RENAME'){const prior=categories.rows.find(r=>r.name===input.name);const legacy=posts.rows.find(r=>r.data.category===input.name&&r.data.english?.category?.trim())?.data.english?.category;await client.query('UPDATE jingo_post_categories SET english_name=$1,version=$2 WHERE name=$3',[prior?.english_name??legacy??null,(prior?.version||0)+1,target]);}
    for(const row of posts.rows.filter(r=>r.data.category===input.name)){
     const data={...row.data,category:target};if(data.english&&input.action==='DELETE')data.english={...data.english,category:this.categoryEnglishFrom(new Map(categories.rows.map(r=>[r.name,r.english_name])),target)};markTranslation('POST',data);
     await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(post_id,version) DO NOTHING',[row.id,row.version,JSON.stringify(row.data),'legacy','BASELINE',row.updated_at]);
     await client.query('UPDATE jingo_posts SET data=$1,version=version+1,updated_at=now() WHERE id=$2',[JSON.stringify(data),row.id]);
     const changed=(await client.query('SELECT version,updated_at FROM jingo_posts WHERE id=$1',[row.id])).rows[0];
     await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6)',[row.id,changed.version,JSON.stringify(data),adminId,'CATEGORY_'+input.action,changed.updated_at]);
    }
    await client.query('DELETE FROM jingo_post_categories WHERE name=$1',[input.name]);
    await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),adminId,'post-category.'+input.action.toLowerCase(),input.name]);await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}return this.categories();
  }
  async trash(id:string,body:unknown,adminId:string){
   const parsed=z.object({version:z.number().int().positive(),trashed:z.boolean()}).strict().safeParse(body);if(!parsed.success)throw new BadRequestException('Thao tác thùng rác không hợp lệ.');
   const client=await this.db.pool.connect();try{await client.query('BEGIN');const row=(await client.query('SELECT data,version,updated_at FROM jingo_posts WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy bài viết.');if(row.version!==parsed.data.version)throw new ConflictException('Bài viết đã thay đổi. Tải lại trước khi xóa/khôi phục.');
    if(parsed.data.trashed?row.data.status==='TRASH':row.data.status!=='TRASH')throw new ConflictException('Trạng thái bài viết đã thay đổi.');
    const data={...row.data,status:parsed.data.trashed?'TRASH':'DRAFT',publishedAt:null},reason=parsed.data.trashed?'TRASH':'UNTRASH';
    await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(post_id,version) DO NOTHING',[id,row.version,JSON.stringify(row.data),'legacy','BASELINE',row.updated_at]);
    await client.query('UPDATE jingo_posts SET data=$1,version=version+1,updated_at=now() WHERE id=$2',[JSON.stringify(data),id]);const saved=(await client.query('SELECT version,updated_at FROM jingo_posts WHERE id=$1',[id])).rows[0];
    await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6)',[id,saved.version,JSON.stringify(data),adminId,reason,saved.updated_at]);
    await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),adminId,'post.'+reason.toLowerCase(),id]);await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}return this.byId(id);
  }
  async find(slug:string,admin=false,lang?:string){if(lang==='en'){const current=(await this.db.pool.query("SELECT data,version,updated_at FROM jingo_posts WHERE data->'english'->>'slug'=$1",[slug])).rows[0]||(await this.db.pool.query('SELECT p.data,p.version,p.updated_at FROM jingo_slug_aliases a JOIN jingo_posts p ON p.id=a.entity_id WHERE a.kind=$1 AND a.slug=$2',['POST_EN',slug])).rows[0];if(current){const post=this.unpack(current);if(!admin&&!this.visible(post))throw new NotFoundException();return post;}}let result=await this.db.pool.query('SELECT data,version,updated_at FROM jingo_posts WHERE slug=$1',[slug]);if(!result.rowCount)result=await this.db.pool.query('SELECT p.data,p.version,p.updated_at FROM jingo_slug_aliases a JOIN jingo_posts p ON p.id=a.entity_id WHERE a.kind=$1 AND a.slug=$2',['POST',slug]);const post=result.rowCount?this.unpack(result.rows[0]):undefined;if(!post||!admin&&!this.visible(post))throw new NotFoundException('Bài viết chưa xuất bản hoặc không tồn tại.');return post;}
  async byId(id:string){const row=(await this.db.pool.query('SELECT data,version,updated_at FROM jingo_posts WHERE id=$1',[id])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy bài viết.');return this.unpack(row);}
  async revisions(id:string){await this.byId(id);return(await this.db.pool.query('SELECT version,data,saved_by,reason,created_at FROM jingo_post_revisions WHERE post_id=$1 ORDER BY version DESC LIMIT 50',[id])).rows.map(r=>({version:r.version,title:r.data.title,status:r.data.status,reason:r.reason,savedBy:r.saved_by,createdAt:r.created_at}));}
  async preview(id:string,lang='vi',revision?:string){if(!['vi','en'].includes(lang))throw new BadRequestException('Ngôn ngữ không hợp lệ.');let post=await this.byId(id);if(revision!==undefined){if(!/^[1-9][0-9]{0,8}$/.test(revision))throw new BadRequestException('Phiên bản không hợp lệ.');const saved=(await this.db.pool.query('SELECT data,version,created_at FROM jingo_post_revisions WHERE post_id=$1 AND version=$2',[id,Number(revision)])).rows[0];if(!saved)throw new NotFoundException('Không tìm thấy phiên bản.');post={...saved.data,version:saved.version,updatedAt:new Date(saved.created_at).toISOString()};}if(lang==='en'&&!post.english?.title?.trim())throw new BadRequestException('Chưa có tiêu đề bản dịch tiếng Anh để xem trước.');
   const source=lang==='en'?post.english!:post;return{id:post.id,slug:post.slug,title:source.title,excerpt:source.excerpt,contentHtml:cleanContent(source.contentHtml),category:lang==='en'?await this.categoryEnglish(post.category,post.english?.category):post.category,author:post.author,cover:post.cover,publishedAt:post.publishedAt,seoTitle:source.seoTitle,seoDescription:source.seoDescription,relatedProductIds:post.relatedProductIds,updatedAt:post.updatedAt,version:post.version,status:post.status,preview:true,locale:lang,translationStatus:post.english?.status||'MISSING'};
  }
  async compare(id:string,query:unknown){const parsed=z.object({from:z.coerce.number().int().min(1).max(999999999),to:z.coerce.number().int().min(1).max(999999999),lang:z.enum(['vi','en']).default('vi')}).strict().safeParse(query);if(!parsed.success)throw new BadRequestException('Chọn hai phiên bản và ngôn ngữ hợp lệ.');const current=await this.byId(id),{from,to,lang}=parsed.data;
   const snapshot=async(version:number)=>{if(current.version===version)return current;const row=(await this.db.pool.query('SELECT data FROM jingo_post_revisions WHERE post_id=$1 AND version=$2',[id,version])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy phiên bản của bài viết này.');return row.data as Post;};const before=await snapshot(from),after=await snapshot(to);return{id,from,to,lang,...comparePosts(before,after,lang)};
  }
  async restore(id:string,body:unknown,adminId:string){const parsed=z.object({version:z.number().int().min(1),revision:z.number().int().min(1)}).strict().safeParse(body);if(!parsed.success)throw new BadRequestException('Chọn phiên bản khôi phục hợp lệ.');const current=await this.byId(id);if(current.version!==parsed.data.version)throw new ConflictException('Bài viết đã thay đổi. Tải lại trước khi khôi phục.');const saved=(await this.db.pool.query('SELECT data FROM jingo_post_revisions WHERE post_id=$1 AND version=$2',[id,parsed.data.revision])).rows[0];if(!saved)throw new NotFoundException('Không tìm thấy phiên bản.');const payload={...saved.data,id,slug:current.slug,version:parsed.data.version,status:'DRAFT',publishedAt:null,...(saved.data.english?{english:{...saved.data.english,status:'DRAFT'}}:{})};return this.save(payload,adminId,'RESTORE');}
  async save(body:unknown,adminId:string,reason='SAVE'){
    const parsed=postSchema.safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('\n'));
    const post=parsed.data;post.contentHtml=cleanContent(post.contentHtml);
    if(post.english)post.english.contentHtml=cleanContent(post.english.contentHtml);markTranslation('POST',post);
    if(post.status==='PUBLISHED'&&!post.contentHtml.replace(/<[^>]*>/g,'').trim())throw new BadRequestException('Bài xuất bản cần nội dung chữ.');
    if(post.status==='PUBLISHED'&&!post.publishedAt)post.publishedAt=new Date().toISOString();
    await this.media.validateIds([...(post.cover?[post.cover.id]:[]),...contentImageIds(post.contentHtml),...contentImageIds(post.english?.contentHtml||'')]);
    for(const id of new Set(post.relatedProductIds)){const row=await this.db.pool.query('SELECT id FROM jingo_products WHERE id=$1',[id]);if(!row.rowCount)throw new BadRequestException('Sản phẩm liên quan không tồn tại.');}
    const client=await this.db.pool.connect();try{await client.query('BEGIN');await client.query("SELECT id FROM jingo_migrations WHERE id='041_english_urls_lock' FOR UPDATE");
      const current=post.version?await client.query('SELECT slug,data,version,updated_at FROM jingo_posts WHERE id=$1 FOR UPDATE',[post.id]):null;
      if(current?.rows[0]&&reason!=='TRANSLATE'&&reason!=='RESTORE'){post.english=current.rows[0].data.english;markTranslation('POST',post);}
      if(post.english&&current?.rows[0]&&current.rows[0].data.category!==post.category){const categories=await client.query('SELECT name,english_name FROM jingo_post_categories');post.english.category=this.categoryEnglishFrom(new Map(categories.rows.map(r=>[r.name,r.english_name])),post.category);}
      if(current?.rows[0]){const row=current.rows[0];await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(post_id,version) DO NOTHING',[post.id,row.version,JSON.stringify(row.data),'legacy','BASELINE',row.updated_at]);}
      if(post.english?.title){const slug=String(post.english.slug||current?.rows[0]?.data.english?.slug||englishSlug(post.english.title)||post.slug);post.english.slug=slug;await reserveEnglishPost(client,post.id,slug,current?.rows[0]?.data.english?.slug||current?.rows[0]?.slug);}
      await reserveSlug(client,'POST',post.id,post.slug,current?.rows[0]?.slug);
      if(post.version===0)await client.query('INSERT INTO jingo_posts(id,slug,data)VALUES($1,$2,$3)',[post.id,post.slug,JSON.stringify(post)]);
      else{const updated=await client.query('UPDATE jingo_posts SET slug=$1,data=$2,version=version+1,updated_at=now() WHERE id=$3 AND version=$4',[post.slug,JSON.stringify(post),post.id,post.version]);if(!updated.rowCount)throw new ConflictException('Bài viết đã thay đổi ở cửa sổ khác. Tải lại trước khi lưu.');}
      const revision=(await client.query('SELECT data,version,updated_at FROM jingo_posts WHERE id=$1',[post.id])).rows[0];await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6)',[post.id,revision.version,JSON.stringify(revision.data),adminId,reason,revision.updated_at]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),adminId,reason==='RESTORE'?'post.restore':'post.save',post.id]);await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK');if((e as{code?:string}).code==='23505')throw new ConflictException('Mã hoặc đường dẫn bài viết đã tồn tại.');throw e;}finally{client.release();}
    return this.find(post.slug,true);
  }
}
function publicPost(post:Post&{updatedAt:string},lang?:string,categoryEnglish?:string){const{english,version,...published}=post;const languages=translated('POST',post)?['vi','en']:['vi'];return{...published,slug:lang==='en'?english?.slug||post.slug:post.slug,localePaths:{vi:'/cam-nang/'+post.slug,...(languages.includes('en')?{en:'/en/blog/'+(english?.slug||post.slug)}:{})},...(lang==='en'?{title:english!.title,excerpt:english!.excerpt,contentHtml:english!.contentHtml,category:categoryEnglish??english!.category,seoTitle:english!.seoTitle,seoDescription:english!.seoDescription,cover:post.cover?{...post.cover,alt:english!.title}:null}:{}),languages};}
@Controller('posts')class PublicPostsController{
  constructor(private readonly posts:PostsService){}
  @Get()async list(@Query('lang')lang?:string){const dictionary=lang==='en'?await this.posts.categoryDictionary():new Map<string,string|null>();return{data:(await this.posts.list()).filter(post=>lang!=='en'||translated('POST',post)).map(post=>{const{contentHtml,...summary}=publicPost(post,lang,this.posts.categoryEnglishFrom(dictionary,post.category,post.english?.category));return summary;})};}
  @Get(':slug')async detail(@Param('slug')slug:string,@Query('lang')lang?:string){const post=await this.posts.find(slug,false,lang);if(lang==='en'&&!translated('POST',post))throw new NotFoundException('Translation unavailable.');return{data:publicPost(post,lang,lang==='en'?await this.posts.categoryEnglish(post.category,post.english?.category):undefined)};}
}
@Controller('admin/posts')@UseGuards(AdminGuard)class AdminPostsController{
  constructor(private readonly posts:PostsService){}
  @Get()async list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return{data:await this.posts.list(true)};}
  @Get('categories/translations')async categoryTranslations(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return{data:await this.posts.categoryTranslations()};}
  @HttpPost('categories/translation')async categoryTranslation(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.posts.saveCategoryTranslation(body,req.admin.id)};}
  @Get('categories')async categories(){return{data:await this.posts.categories()};}
  @Get(':id/preview')async preview(@Param('id')id:string,@Query('lang')lang:string|undefined,@Query('revision')revision:string|undefined,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');return{data:await this.posts.preview(id,lang,revision)};}
  @Get(':id/compare')async compare(@Param('id')id:string,@Query()query:unknown,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');return{data:await this.posts.compare(id,query)};}
  @Get(':id/revisions')async revisions(@Param('id')id:string,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return{data:await this.posts.revisions(id)};}
  @HttpPost(':id/restore')async restore(@Param('id')id:string,@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.posts.restore(id,body,req.admin.id)};}
  @HttpPost('categories/actions')async categoryAction(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.posts.categoryAction(body,req.admin.id)};}
  @HttpPost(':id/trash')async trash(@Param('id')id:string,@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.posts.trash(id,body,req.admin.id)};}
  @HttpPost('categories')async addCategory(@Body()body:unknown){return{data:await this.posts.addCategory(body)};}
  @HttpPost()async save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.posts.save(body,req.admin.id)};}
}
@Module({imports:[AuthModule,MediaModule],providers:[PostsService],exports:[PostsService],controllers:[PublicPostsController,AdminPostsController]})export class PostsModule{}
