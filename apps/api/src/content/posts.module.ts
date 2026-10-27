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
  async addCategory(body:unknown){const name=typeof body==='object'&&body!==null&&'name'in body&&typeof body.name==='string'?body.name.trim():'';if(!name||name.length>100)throw new BadRequestException('Tên chuyên mục cần 1–100 ký tự.');await this.db.pool.query('INSERT INTO jingo_post_categories(name)VALUES($1) ON CONFLICT(name) DO NOTHING',[name]);return this.categories();}
  async find(slug:string,admin=false){let result=await this.db.pool.query('SELECT data,version,updated_at FROM jingo_posts WHERE slug=$1',[slug]);if(!result.rowCount)result=await this.db.pool.query('SELECT p.data,p.version,p.updated_at FROM jingo_slug_aliases a JOIN jingo_posts p ON p.id=a.entity_id WHERE a.kind=$1 AND a.slug=$2',['POST',slug]);const post=result.rowCount?this.unpack(result.rows[0]):undefined;if(!post||!admin&&!this.visible(post))throw new NotFoundException('Bài viết chưa xuất bản hoặc không tồn tại.');return post;}
  async byId(id:string){const row=(await this.db.pool.query('SELECT data,version,updated_at FROM jingo_posts WHERE id=$1',[id])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy bài viết.');return this.unpack(row);}
  async revisions(id:string){await this.byId(id);return(await this.db.pool.query('SELECT version,data,saved_by,reason,created_at FROM jingo_post_revisions WHERE post_id=$1 ORDER BY version DESC LIMIT 50',[id])).rows.map(r=>({version:r.version,title:r.data.title,status:r.data.status,reason:r.reason,savedBy:r.saved_by,createdAt:r.created_at}));}
  async preview(id:string,lang='vi',revision?:string){if(!['vi','en'].includes(lang))throw new BadRequestException('Ngôn ngữ không hợp lệ.');let post=await this.byId(id);if(revision!==undefined){if(!/^[1-9][0-9]{0,8}$/.test(revision))throw new BadRequestException('Phiên bản không hợp lệ.');const saved=(await this.db.pool.query('SELECT data,version,created_at FROM jingo_post_revisions WHERE post_id=$1 AND version=$2',[id,Number(revision)])).rows[0];if(!saved)throw new NotFoundException('Không tìm thấy phiên bản.');post={...saved.data,version:saved.version,updatedAt:new Date(saved.created_at).toISOString()};}if(lang==='en'&&!post.english?.title?.trim())throw new BadRequestException('Chưa có tiêu đề bản dịch tiếng Anh để xem trước.');
   const source=lang==='en'?post.english!:post;return{id:post.id,slug:post.slug,title:source.title,excerpt:source.excerpt,contentHtml:cleanContent(source.contentHtml),category:source.category,author:post.author,cover:post.cover,publishedAt:post.publishedAt,seoTitle:source.seoTitle,seoDescription:source.seoDescription,relatedProductIds:post.relatedProductIds,updatedAt:post.updatedAt,version:post.version,status:post.status,preview:true,locale:lang,translationStatus:post.english?.status||'MISSING'};
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
    const client=await this.db.pool.connect();try{await client.query('BEGIN');
      const current=post.version?await client.query('SELECT slug,data,version,updated_at FROM jingo_posts WHERE id=$1 FOR UPDATE',[post.id]):null;
      if(current?.rows[0]){const row=current.rows[0];await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(post_id,version) DO NOTHING',[post.id,row.version,JSON.stringify(row.data),'legacy','BASELINE',row.updated_at]);}
      await reserveSlug(client,'POST',post.id,post.slug,current?.rows[0]?.slug);
      if(post.version===0)await client.query('INSERT INTO jingo_posts(id,slug,data)VALUES($1,$2,$3)',[post.id,post.slug,JSON.stringify(post)]);
      else{const updated=await client.query('UPDATE jingo_posts SET slug=$1,data=$2,version=version+1,updated_at=now() WHERE id=$3 AND version=$4',[post.slug,JSON.stringify(post),post.id,post.version]);if(!updated.rowCount)throw new ConflictException('Bài viết đã thay đổi ở cửa sổ khác. Tải lại trước khi lưu.');}
      const revision=(await client.query('SELECT data,version,updated_at FROM jingo_posts WHERE id=$1',[post.id])).rows[0];await client.query('INSERT INTO jingo_post_revisions(post_id,version,data,saved_by,reason,created_at)VALUES($1,$2,$3,$4,$5,$6)',[post.id,revision.version,JSON.stringify(revision.data),adminId,reason,revision.updated_at]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),adminId,reason==='RESTORE'?'post.restore':'post.save',post.id]);await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK');if((e as{code?:string}).code==='23505')throw new ConflictException('Mã hoặc đường dẫn bài viết đã tồn tại.');throw e;}finally{client.release();}
    return this.find(post.slug,true);
  }
}
function publicPost(post:Post&{updatedAt:string},lang?:string){const{english,version,...published}=post;const languages=translated('POST',post)?['vi','en']:['vi'];return{...published,...(lang==='en'?{title:english!.title,excerpt:english!.excerpt,contentHtml:english!.contentHtml,category:english!.category,seoTitle:english!.seoTitle,seoDescription:english!.seoDescription,cover:post.cover?{...post.cover,alt:english!.title}:null}:{}),languages};}
@Controller('posts')class PublicPostsController{
  constructor(private readonly posts:PostsService){}
  @Get()async list(@Query('lang')lang?:string){return{data:(await this.posts.list()).filter(post=>lang!=='en'||translated('POST',post)).map(post=>{const{contentHtml,...summary}=publicPost(post,lang);return summary;})};}
  @Get(':slug')async detail(@Param('slug')slug:string,@Query('lang')lang?:string){const post=await this.posts.find(slug);if(lang==='en'&&!translated('POST',post))throw new NotFoundException('Translation unavailable.');return{data:publicPost(post,lang)};}
}
@Controller('admin/posts')@UseGuards(AdminGuard)class AdminPostsController{
  constructor(private readonly posts:PostsService){}
  @Get()async list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return{data:await this.posts.list(true)};}
  @Get('categories')async categories(){return{data:await this.posts.categories()};}
  @Get(':id/preview')async preview(@Param('id')id:string,@Query('lang')lang:string|undefined,@Query('revision')revision:string|undefined,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');return{data:await this.posts.preview(id,lang,revision)};}
  @Get(':id/revisions')async revisions(@Param('id')id:string,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return{data:await this.posts.revisions(id)};}
  @HttpPost(':id/restore')async restore(@Param('id')id:string,@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.posts.restore(id,body,req.admin.id)};}
  @HttpPost('categories')async addCategory(@Body()body:unknown){return{data:await this.posts.addCategory(body)};}
  @HttpPost()async save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.posts.save(body,req.admin.id)};}
}
@Module({imports:[AuthModule,MediaModule],providers:[PostsService],exports:[PostsService],controllers:[PublicPostsController,AdminPostsController]})export class PostsModule{}
