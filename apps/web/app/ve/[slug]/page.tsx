import type{Metadata}from'next';
import{notFound,permanentRedirect}from'next/navigation';
import Link from'next/link';
import{BookingPanel}from'./booking-panel';
import{Product,imageUrl,siteBase,indexing,contentApi}from'../../../lib/content-api';
import{ProductGallery}from'../../components/product-gallery';
import'./ticket.css';
async function getProduct(slug:string){try{return await contentApi<Product>(`products/${encodeURIComponent(slug)}`);}catch(e){if((e as{status?:number}).status===404)return null;throw e;}}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const{slug}=await params;const product=await getProduct(slug);return{title:product?.seoTitle||product?.name||'Không tìm thấy trải nghiệm',description:product?.seoDescription||product?.description,alternates:{canonical:new URL(`/ve/${slug}`,siteBase()).toString()},robots:{index:!!product&&indexing()&&!product.demo,follow:true},openGraph:{title:product?.seoTitle||product?.name,description:product?.seoDescription||product?.description,images:product?.cover?[{url:new URL(imageUrl(product.cover),siteBase()).toString(),alt:product.cover.alt||product.name}]:[]}};}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
  const requested=(await params).slug;const product=await getProduct(requested);if(!product)notFound();if(product.slug!==requested)permanentRedirect(`/ve/${product.slug}`);
  return <main id="main" className="section"><Link className="text-link" href="/">← Tất cả trải nghiệm</Link><div className="product-layout"><article><p className="eyebrow">{product.destination} · {product.typeSlug?<Link href={`/loai/${product.typeSlug}`}>{product.typeName}</Link>:product.typeName||'TRẢI NGHIỆM'}</p><h1>{product.name}</h1><p className="lead product-description">{product.description}</p><ProductGallery cover={product.cover} images={product.gallery} name={product.name}/>{product.detailHtml&&<div className="prose" dangerouslySetInnerHTML={{__html:product.detailHtml}}/>}<h2>Trước khi bạn đặt</h2><p>Chọn ngày sử dụng, hạng vé và nhóm khách để kiểm tra mức giá tương ứng.</p><div className="notice">Giờ hoạt động, điều kiện tuổi/chiều cao, quyền lợi và chính sách đổi hủy cần được xác nhận với nhà cung cấp trước khi mở bán thật.{product.demo&&' Giá mẫu không phải báo giá của nhà cung cấp.'}</div></article><BookingPanel product={product}/></div></main>;
}
