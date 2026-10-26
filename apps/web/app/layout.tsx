import type { Metadata } from 'next';
import Link from 'next/link';
import './styles.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: { default: 'JinGo — Mỗi chuyến đi, một câu chuyện', template: '%s | JinGo' },
  description: 'Khám phá vé tham quan, show diễn và tour địa phương cùng JinGo.',
  robots: { index: false, follow: false }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>
    <a className="skip-link" href="#main">Đến nội dung</a>
    <header className="header"><Link className="logo" href="/">jin<span>go</span><i>↗</i></Link>
      <nav aria-label="Điều hướng chính"><Link href="/#experiences">Vé & trải nghiệm</Link><Link href="/#local">Tour địa phương</Link><Link href="/cam-nang">Cẩm nang</Link></nav>
      <span className="header-note">Đi gần hơn. Trải nghiệm nhiều hơn.</span>
    </header>
    <div className="demo-banner">Bản phát triển · Sản phẩm và giá minh họa · Chưa nhận đặt vé hoặc thanh toán</div>
    {children}
    <footer><Link className="logo" href="/">jin<span>go</span>↗</Link><p>Những hành trình đáng nhớ, bắt đầu từ đây.</p><small>JinGo · Nền tảng đang phát triển</small></footer>
  </body></html>;
}
