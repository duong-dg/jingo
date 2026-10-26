export type CustomerType = 'ADULT' | 'CHILD' | 'SENIOR';
export interface Variant {
  id: string;
  name: string;
  prices: Partial<Record<CustomerType, number>>;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  destination: string;
  type: string;
  description: string;
  demo?: boolean;
  variants: Variant[];
}

// Illustrative data only. Not supplier prices or live availability.
export const products: Product[] = [
  { id: 'demo-memories', slug: 'ky-uc-hoi-an', name: 'Ký Ức Hội An', destination: 'Hội An', type: 'TICKET',
    description: 'Khám phá câu chuyện phố Hội qua một đêm biểu diễn. Dữ liệu và giá minh họa.',
    variants: [
      { id: 'eco', name: 'Eco', prices: { ADULT: 400000, CHILD: 200000 } },
      { id: 'high', name: 'High', prices: { ADULT: 550000, CHILD: 275000 } },
      { id: 'vip', name: 'VIP', prices: { ADULT: 700000, CHILD: 350000 } }
    ] },
  { id: 'demo-bana', slug: 'ba-na-hills', name: 'Bà Nà Hills', destination: 'Đà Nẵng', type: 'TICKET',
    description: 'Một ngày khám phá trên mây. Dữ liệu và giá minh họa.',
    variants: [{ id: 'standard', name: 'Vé tham quan', prices: { ADULT: 900000, CHILD: 750000, SENIOR: 750000 } }] },
  { id: 'demo-local', slug: 'kham-pha-hoi-an', name: 'Một ngày khám phá Hội An', destination: 'Hội An', type: 'TOUR',
    description: 'Trải nghiệm địa phương cùng hành trình trong ngày. Dữ liệu và giá minh họa.',
    variants: [{ id: 'shared', name: 'Tour ghép', prices: { ADULT: 650000, CHILD: 450000 } }] }
];
