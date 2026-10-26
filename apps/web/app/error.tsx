'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="section"><h1>Chưa tải được trải nghiệm.</h1><p>Vui lòng kiểm tra API đã chạy và thử lại.</p><button className="button" onClick={reset}>Thử lại</button></main>;
}
