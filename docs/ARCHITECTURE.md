# JinGo — kiến trúc và phạm vi

## Quyết định kiến trúc

Modular monolith, TypeScript, Next.js frontend và NestJS REST API. Một repository với ba ứng dụng web/api/worker. PostgreSQL là nguồn dữ liệu chính; Redis cho queue/cache; file vé riêng tư dùng object storage khi triển khai nghiệp vụ. App di động sau này dùng cùng API. Chưa triển khai khách sạn hoặc API nhà cung cấp.

## Trạng thái hiện tại (0.4)

- Web tiếng Việt responsive: danh mục, chọn vé trực tiếp trên trang, checkout yêu cầu đặt và tra cứu bằng mã + khóa riêng. Chưa có giỏ hàng hoặc cổng thanh toán.
- Admin /admin: login/logout cookie HttpOnly, phiên hash PostgreSQL hết hạn 8 giờ, giới hạn đăng nhập sai, kiểm tra nguồn mutation và header chống CSRF. Chủ tài khoản tạo qua env, mật khẩu scrypt; chưa có quản lý nhiều vai trò.
- PostgreSQL: product config JSONB, slug unique, version optimistic locking, audit cùng transaction, bảng admin/session và migration marker. Giá/lịch/khóa lưu trong product document để cập nhật nguyên tử; booking, inventory và ledger sau này cần bảng quan hệ riêng.
- Admin tạo/sửa/nháp/xuất bản sản phẩm, gói và nhóm giá, điều kiện khách, SEO, lịch giá, ngày khóa và nháp tiếng Anh. Ngày khóa chặn cả endpoint rates lẫn quotes.
- Public chỉ đọc sản phẩm xuất bản, không trả bản dịch nháp/lịch nội bộ. Seed ba sản phẩm mẫu một lần, không ghi đè khi restart.
- Media module: admin guard trước multipart parsing, giới hạn file 5 MB, kiểm tra chữ ký và decode bằng Sharp, bỏ metadata và chuyển WebP. Một job tối ưu ảnh tại một thời điểm để giới hạn RAM. Volume ảnh marketing công khai tách khỏi vé riêng tư sẽ triển khai sau.
- CMS: trình soạn Tiptap, sanitizer HTML phía server, bài/SEO/chuyên mục/ảnh/sản phẩm liên quan, nháp và hẹn giờ. Không cần worker cho lịch đăng: public read lọc thời gian hiện tại. Có frontend Việt–Anh và trung tâm dịch song song ở phiên bản 0.6.
- Product types là taxonomy do admin tạo, khác bookingKind TICKET/TOUR. Kiểm tra tham chiếu khi lưu và chặn lưu trữ loại đang dùng. Alias URL theo ID và giao dịch cùng thay đổi nội dung, web redirect 308.
- Public blog SSR, mục lục, BlogPosting, canonical/OpenGraph; sitemap/robots đọc env runtime. Indexing opt-in, mặc định không lập chỉ mục. Admin/checkout/tra cứu luôn noindex.
- Bảng quan hệ orders/payments/tickets/actions: snapshot bất biến, request idempotency, version optimistic locking và khóa hàng khi xử lý. Xác nhận nguồn cung thủ công, ghi nhận thu đủ chuyển khoản một lần, giao mã từng phần/đủ và hủy đơn chưa thu. Chưa giữ tồn hoặc gọi ngân hàng.
- Public không trả thông tin liên hệ, lịch sử nội bộ hoặc khoản thu. Khóa tra cứu 256-bit chỉ lưu hash; URL dùng fragment, no-referrer/no-store. Chưa có email/OTP để gửi hoặc khôi phục khóa. Public API giới hạn 100 yêu cầu/phút/remote address; sau reverse proxy có thể dùng chung hạn mức, cần thiết kế rate limit phân tán khi mở rộng.
- Worker chỉ xử lý job diagnostic. Chưa có thông báo, xuất PDF hoặc job nghiệp vụ.
- Compose truyền DATABASE_URL và bootstrap admin. API yêu cầu PostgreSQL. Máy phát triển chưa có Docker/PostgreSQL thật; kiểm thử tích hợp chạy pg-mem, cần smoke test và backup/restore trên Ubuntu.
- Mọi trang đang noindex để tránh lập chỉ mục dữ liệu mẫu. Chỉ mở index sau khi nội dung thật, canonical, sitemap và robots được kiểm tra.

## Các module nghiệp vụ sẽ triển khai

1. Identity: admin, quản lý, thu ngân, CTV, khách; kiểm quyền ở backend, CTV chỉ xem dữ liệu của mình.
2. Catalog: supplier, product, variant, customer policy, điểm đến và nội dung.
3. Pricing: bảng giá cơ bản, nhóm giá CTV, lịch giá tháng/mùa/ngày/thứ, cost và sell price, preview/conflict detection.
4. Availability: local date/timezone, ngày khóa, suất/chuyến, pool tồn chung, cutoff, hold TTL; hạn mức nội bộ không đồng nghĩa tồn được đối tác bảo đảm.
5. Booking: snapshot giá/chính sách, item, người tham gia, yêu cầu xác nhận, giao từng phần.
6. Payment: chuyển khoản duyệt tay, cổng thanh toán, idempotency, hoàn tiền và đối soát.
7. Credit: hạn mức CTV, kỳ hạn, sổ phát sinh bất biến, điều chỉnh thay vì sửa số dư.
8. Fulfillment: code/file đối tác, kho mã, cấp vé thủ công hoặc từ kho, voucher tour, lịch sử in. Không tạo QR vào cổng từ code khi chưa được đối tác xác nhận định dạng.
9. POS: điểm bán, quầy, ca, tiền đầu ca, thu/chi, chốt ca, chênh lệch.
10. CMS/SEO: draft, preview, publish/schedule, author, revision, metadata, canonical, redirects, sitemap, liên kết sản phẩm, structured data phù hợp.
11. Operations: yêu cầu hỗ trợ, hàng đợi việc, audit log, cảnh báo, báo cáo đa kênh.
12. Promotions: điều kiện, giới hạn lượt, quyền kênh, quy tắc cộng dồn và phân bổ giảm giá.

## Bất biến nghiệp vụ

- Integer VND, server tính tiền; giao dịch đã chốt lưu snapshot bất biến.
- Ngày sử dụng theo múi giờ điểm đến; timestamp sự kiện theo UTC.
- Ưu tiên lịch giá được xác định rõ; cùng ưu tiên cùng phạm vi thì từ chối, không chọn ngẫu nhiên.
- Không áp dụng đủ ba nhóm khách cho mọi gói. Giá trống khác 0đ; khóa ngày độc lập bảng giá.
- Tồn được dùng chung web/POS/CTV; giữ chỗ và cấp mã bằng transaction có kiểm tra đồng thời.
- Trạng thái booking, payment, fulfillment và refund tách biệt. Payment success không tự đồng nghĩa confirmed hoặc issued.
- Mỗi thao tác tiền/cấp vé có idempotency và ràng buộc unique; dùng transactional outbox khi ghi DB và gửi queue.
- Đơn CTV ghi đúng số phải trả cho JinGo. Giá CTV tự bán không phải doanh thu JinGo.
- Hủy theo snapshot chính sách từng gói; chưa xác nhận hủy không đánh dấu mã nhà cung cấp đã vô hiệu.
- Tour chưa có allotment phải chờ đối tác xác nhận. Mã JinGo tạo chỉ là mã đặt chỗ.
- File vé không public, link có hạn, xác minh quyền; không log mã vé hoặc dữ liệu khách nhạy cảm.

## Thứ tự triển khai

1. Schema + migrations + authentication/RBAC + audit.
2. Quản trị sản phẩm/bảng giá/lịch khóa, kiểm tra quy tắc và tồn.
3. Booking + holds + chuyển khoản + kho/giao vé thủ công, tra cứu có bảo vệ.
4. POS/ca + CTV/giá/công nợ + báo cáo đối soát.
5. CMS SEO, khuyến mãi, payment gateway và QA hành trình đầy đủ.
6. Sau khi vận hành: API supplier; mobile app; hotel là module riêng.

## Đa ngôn ngữ kiểu WPML (yêu cầu đã chốt)

Phiên bản 0.6 triển khai tiếng Việt ở URL cũ, tiếng Anh ở /en. Nội dung dịch nằm trong JSON english của product/post/type, liên kết qua ID gốc và dùng chung version/audit. Chưa tách bảng theo locale; khi thêm nhiều ngôn ngữ có thể di chuyển cấu trúc này qua bảng dịch mà giữ nguyên ID thương mại.

- /admin/ban-dich có trình dịch song song, trạng thái và bước xác nhận xuất bản; giá/tồn/mã vé dùng chung. Trường gói/điều kiện bám theo ID variant.
- SHA-256 nội dung nguồn xác định bản dịch cần cập nhật; giá và lịch không tham gia hash. Nguồn đổi thì English tạm ẩn, không ghi đè bản dịch. Optimistic version chống mất cập nhật.
- API lang=en chỉ trả nội dung đã duyệt, nguồn đang công khai và tới giờ xuất bản. Không fallback nguyên văn tiếng Việt. Danh sách trả languages để dựng liên kết tương ứng.
- /en routes dùng lại component và nghiệp vụ Việt; dictionary dịch UI. Proxy ghi đè locale header theo URL, root html/lang và context theo request; chuyển ngôn ngữ tải tài liệu mới để không giữ context của ngôn ngữ cũ.
- Canonical/hreflang/sitemap theo bản đã xuất bản; slug chung và alias cũ giữ chuyển hướng 308 trong cùng ngôn ngữ. Không tự chuyển theo Accept-Language để giữ URL ổn định.
- Checkout/lookup có giao diện English; đơn lưu locale và snapshot tên/điều kiện/chính sách. Mã vé và hướng dẫn thủ công không tự dịch. CTV/admin vẫn Việt.
- Chưa có dịch máy, slug riêng mỗi locale, thêm ngôn ngữ qua admin, bản dịch voucher/email hoặc dịch các trang chính sách tùy chỉnh. Có thể bổ sung sau; chưa có phí API dịch.

Các mục 1–5 thuộc phạm vi đã thống nhất. Đã có sản phẩm/giá/ảnh/loại/blog/admin chủ và luồng yêu cầu đặt, thu thủ công, giao mã. Các phần còn thiếu gồm inventory hold, file vé riêng tư, refund, POS, cổng thanh toán và thông báo SMS/push; CMS còn thiếu revision history, preview riêng, workflow dịch đầy đủ và phân quyền biên tập viên.

## Cập nhật 0.7

Gói vé có timeSlots tùy chọn, dùng ngày đặt + giờ bắt đầu GMT+7 để kiểm tra cutoff tại cùng hàm báo giá cho khách/CTV và lúc tạo đơn. Snapshot giữ suất giờ độc lập với thay đổi lịch sau này. Email mới bắt buộc; đơn cũ không bị cập nhật ngược.

SMTP trong admin, bí mật AES-256-GCM với khóa file ẩn trong volume media. Outbox PostgreSQL cùng transaction đơn, API polling mỗi 10 giây, claim FOR UPDATE SKIP LOCKED và lease 2 phút; retry tối đa 5 lần rồi admin có thể đưa lại vào hàng đợi. Gửi theo at-least-once, có thể trùng email nếu SMTP nhận rồi tiến trình chết trước khi ghi SENT. Không dùng thông báo email làm căn cứ thu tiền/giữ chỗ. Sao lưu cả DB và volume gồm .smtp-key.
