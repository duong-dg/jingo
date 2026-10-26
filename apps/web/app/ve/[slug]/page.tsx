import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookingPanel } from './booking-panel';

interface Product { id: string; slug: string; name: string; destination: string; description: string; variants: { id: string; name: string; prices: Partial<Record<'ADULT' | 'CHILD' | 'SENIOR', number>> }[] }
async function getProduct(slug: string): Promise<Product | null> {
  const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/api/v1/products/${encodeURIComponent(slug)}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Không thể tải sản phẩm.');
  return (await response.json()).data;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.name || 'Không tìm thấy trải nghiệm' };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  return <main id="main" className="section"><Link className="text-link" href="/">← Tất cả trải nghiệm</Link><div className="product-layout"><article><p className="eyebrow">{product.destination} · TRẢI NGHIỆM</p><h1>{product.name}</h1><p className="lead">{product.description}</p><div className="product-art" aria-hidden="true">↗</div><h2>Trước khi bạn đặt</h2><p>Đây là sản phẩm minh họa để kiểm tra luồng lựa chọn ngày, hạng vé và nhóm khách.</p><div className="notice">Giờ hoạt động, điều kiện tuổi/chiều cao, quyền lợi và chính sách đổi hủy cần được xác nhận với nhà cung cấp trước khi mở bán thật. Giá mẫu không phải báo giá của nhà cung cấp.</div></article><BookingPanel product={product}/></div></main>;
}
