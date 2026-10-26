import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Cẩm nang du lịch' };
export default function Journal() {
  return <main id="main" className="section"><p className="eyebrow">CẨM NANG JINGO</p><h1>Chuyện trên đường đi.</h1><p className="lead">Nơi dành cho kinh nghiệm du lịch và những hành trình địa phương.</p><div className="notice">Chưa có bài viết xuất bản. Chức năng quản lý và xuất bản nội dung sẽ được bổ sung trong giai đoạn CMS.</div><Link className="text-link" href="/">← Trở về khám phá</Link></main>;
}
