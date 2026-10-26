import Link from 'next/link';
import type {Metadata} from 'next';
import {Product,ProductType,contentApi,siteBase,indexing} from '../lib/content-api';
import {ProductCard} from './components/product-card';
export async function generateMetadata():Promise<Metadata>{return{alternates:{canonical:siteBase()},robots:{index:indexing(),follow:true}};}

export default async function Home() {
  let products: Product[] = []; let types:ProductType[]=[];
  let unavailable = false;
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/api/v1/products`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Catalog unavailable');
    products = (await response.json()).data; types=await contentApi<ProductType[]>('product-types');
  } catch { unavailable = true; }
  return <main id="main">
    <section className="hero"><div className="hero-copy"><p className="eyebrow">ĐI ĐỂ CÓ CHUYỆN KỂ</p><h1>Chuyến đi nhỏ.<br/><em>Kỷ niệm lớn.</em></h1><p>Vé vui chơi, những đêm diễn đáng nhớ và tour địa phương.<br className="desktop"/> Tìm trải nghiệm dành riêng cho hành trình của bạn.</p><a href="#experiences" className="button">Khám phá trải nghiệm <span>↗</span></a><div className="hero-foot"><span>01 — MIỀN TRUNG</span><span>Đà Nẵng · Hội An</span></div></div>
      <div className="hero-art" role="img" aria-label="Minh họa phong cảnh núi và mặt trời"><div className="sun"/><div className="mountain back"/><div className="mountain front"/><div className="art-label">Những điều đẹp đẽ<br/>đang chờ bạn ngoài kia.<span>16°03′ N · 108°12′ E</span></div><span className="vertical-label">THE LOCAL EXPERIENCE</span></div>
    </section>
    <div className="promise"><span>↗ Khám phá theo cách của bạn</span><span>◎ Thông tin rõ ràng</span><span>◇ Trải nghiệm địa phương</span></div>
    <section className="section" id="experiences"><div className="section-heading"><div><p className="eyebrow">CHỌN MỘT ĐIỀU ĐÁNG NHỚ</p><h2>Bạn muốn đi đâu hôm nay?</h2></div><span className="muted">Chọn trải nghiệm dành cho bạn</span></div>
      {unavailable && <p className="notice">Chưa tải được danh sách trải nghiệm. Vui lòng thử lại sau.</p>}{!unavailable && !products.length && <p className="notice">Các trải nghiệm đang được cập nhật.</p>}
      <nav className="type-chips" aria-label="Loại trải nghiệm">{types.map(type=><Link key={type.id} href={`/loai/${type.slug}`}>{type.name}</Link>)}</nav><div className="cards">{products.map((product,index)=><ProductCard key={product.id} product={product} index={index} anchorId={product.bookingKind==="TOUR"&&index===products.findIndex(item=>item.bookingKind==="TOUR")?"local":undefined}/>)}</div>
    </section>
    <section className="journal"><div><p className="eyebrow">MỘT CHÚT CẢM HỨNG</p><h2>Đi như người địa phương.</h2><p>Góc cẩm nang dành cho kinh nghiệm, lịch trình và những điểm đến đáng khám phá.</p></div><Link href="/cam-nang" className="button secondary">Ghé cẩm nang ↗</Link></section>
  </main>;
}
