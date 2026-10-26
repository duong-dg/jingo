import Link from 'next/link';

const experiences = [
  { slug: 'ky-uc-hoi-an', name: 'Ký Ức Hội An', place: 'Hội An', category: 'SHOW DIỄN', icon: '◒', className: 'memories', price: '200.000', note: 'Một đêm, ngàn câu chuyện phố Hội' },
  { slug: 'ba-na-hills', name: 'Bà Nà Hills', place: 'Đà Nẵng', category: 'VÉ THAM QUAN', icon: '⌁', className: 'hills', price: '750.000', note: 'Chạm mây, khám phá những điều mới' },
  { slug: 'kham-pha-hoi-an', name: 'Một ngày khám phá Hội An', place: 'Hội An', category: 'TOUR LOCAL', icon: '☼', className: 'local', price: '450.000', note: 'Đi cùng người địa phương, thấy một Hội An khác' }
];
export default function Home() {
  return <main id="main">
    <section className="hero"><div className="hero-copy"><p className="eyebrow">ĐI ĐỂ CÓ CHUYỆN KỂ</p><h1>Chuyến đi nhỏ.<br/><em>Kỷ niệm lớn.</em></h1><p>Vé vui chơi, những đêm diễn đáng nhớ và tour địa phương.<br className="desktop"/> Tìm trải nghiệm dành riêng cho hành trình của bạn.</p><a href="#experiences" className="button">Khám phá trải nghiệm <span>↗</span></a><div className="hero-foot"><span>01 — MIỀN TRUNG</span><span>Đà Nẵng · Hội An</span></div></div>
      <div className="hero-art" role="img" aria-label="Minh họa phong cảnh núi và mặt trời"><div className="sun"/><div className="mountain back"/><div className="mountain front"/><div className="art-label">Những điều đẹp đẽ<br/>đang chờ bạn ngoài kia.<span>16°03′ N · 108°12′ E</span></div><span className="vertical-label">THE LOCAL EXPERIENCE</span></div>
    </section>
    <div className="promise"><span>↗ Khám phá theo cách của bạn</span><span>◎ Thông tin rõ ràng</span><span>◇ Trải nghiệm địa phương</span></div>
    <section className="section" id="experiences"><div className="section-heading"><div><p className="eyebrow">CHỌN MỘT ĐIỀU ĐÁNG NHỚ</p><h2>Bạn muốn đi đâu hôm nay?</h2></div><span className="muted">Bộ sưu tập trải nghiệm mẫu</span></div>
      <div className="cards">{experiences.map((item) => <Link href={`/ve/${item.slug}`} className="card" key={item.slug} id={item.className === 'local' ? 'local' : undefined}><div className={`card-art ${item.className}`}><span className="badge">{item.category}</span><span className="card-icon" aria-hidden="true">{item.icon}</span><span className="place">↗ {item.place}</span></div><div className="card-body"><h3>{item.name}</h3><p>{item.note}</p><div className="card-bottom"><span>Từ <strong>{item.price}đ</strong><small> / khách · giá mẫu</small></span><span className="round-arrow">↗</span></div></div></Link>)}</div>
    </section>
    <section className="journal"><div><p className="eyebrow">MỘT CHÚT CẢM HỨNG</p><h2>Đi như người địa phương.</h2><p>Góc cẩm nang dành cho kinh nghiệm, lịch trình và những điểm đến đáng khám phá.</p></div><Link href="/cam-nang" className="button secondary">Ghé cẩm nang ↗</Link></section>
  </main>;
}
