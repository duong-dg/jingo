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

Các mục 1–5 thuộc phạm vi đã thống nhất. Đã có sản phẩm/giá/ảnh/loại/blog/admin chủ và luồng yêu cầu đặt, thu thủ công, giao mã. Các phần còn thiếu gồm inventory hold, file vé riêng tư, refund, cổng thanh toán (POS cho quản trị bổ sung ở 0.9) và thông báo SMS/push; CMS còn thiếu revision history, preview riêng, workflow dịch đầy đủ và phân quyền biên tập viên.

## Cập nhật 0.7

Gói vé có timeSlots tùy chọn, dùng ngày đặt + giờ bắt đầu GMT+7 để kiểm tra cutoff tại cùng hàm báo giá cho khách/CTV và lúc tạo đơn. Snapshot giữ suất giờ độc lập với thay đổi lịch sau này. Email mới bắt buộc; đơn cũ không bị cập nhật ngược.

SMTP trong admin, bí mật AES-256-GCM với khóa file ẩn trong volume media. Outbox PostgreSQL cùng transaction đơn, API polling mỗi 10 giây, claim FOR UPDATE SKIP LOCKED và lease 2 phút; retry tối đa 5 lần rồi admin có thể đưa lại vào hàng đợi. Gửi theo at-least-once, có thể trùng email nếu SMTP nhận rồi tiến trình chết trước khi ghi SENT. Không dùng thông báo email làm căn cứ thu tiền/giữ chỗ. Sao lưu cả DB và volume gồm .smtp-key.

## Cập nhật 0.8

Bảng giá CTV mới pricingMode=DIRECT: rule.amount là giá JinGo bán cho CTV, thiếu rule thì chặn báo giá thay vì fallback giá lẻ. Nhóm không có pricingMode giữ cách giảm cũ; chuyển đổi là thao tác admin chủ động. Catalog CTV lọc gói và nhóm khách theo giá đã cấp, không trả giá lẻ.

Xóa/lưu trữ đơn dùng bảng jingo_order_archives liên kết order_id, không DELETE đơn hoặc ledger. ARCHIVE/RESTORE qua cùng transaction, row lock, version và request ID của thao tác đơn. Xóa đơn UNPAID chưa giao vé đổi sang CANCELLED; khôi phục không đổi trạng thái kinh doanh. PAID/CREDIT giữ nguyên tiền/nợ/vé. API admin mặc định lọc active, archived=true xem thùng rác; khách và CTV vẫn tra cứu theo quyền gốc.

## Cập nhật 0.9

Điểm đến là adjacency list lưu trong jingo_destinations (parentId, thứ tự, trạng thái, version). Khóa hàng 009_destination_lock chung cho đổi cây và lưu sản phẩm để kiểm tra vòng lặp, độ sâu, cấp cha và sản phẩm tham chiếu trong cùng transaction. Migration danh mục chạy một lần có khóa, giữ nguyên nhãn cũ và gắn ID; client đang mở cần tải lại nếu gặp version conflict. Lọc cấp cha mở rộng descendant theo ID.

Đơn POS dùng OrdersService.create và cùng báo giá/khóa ngày/cutoff/demo guard/snapshot/email outbox; ngữ cảnh quầy + admin nằm trong request hash và jingo_pos_orders, client công khai không tự đặt kênh bán. Quầy phải active khi tạo đơn. Thu tiền là thao tác PAY riêng có method BANK/CASH, method lưu theo payment_id; tiền mặt dùng reference server CASH:requestId, tất cả giữ idempotency và version. Các khoản ngân hàng cũ được phân loại BANK. Mọi thao tác POS/điểm đến/báo cáo đều cần admin, in phiếu đọc API riêng có auth và no-store.

Báo cáo đọc trong transaction REPEATABLE READ, ngày biên Asia/Ho_Chi_Minh [from00:00,to+1day00:00), tối đa 367 ngày. Không lọc archives và không dùng danh sách đơn limit200. Đơn hủy không vào giá trị đặt; receipts tính theo thời điểm thanh toán, trả nợ CTV là dòng riêng không cộng trùng; công nợ hiện tại áp dụng FIFO toàn hệ thống. Đây là báo cáo vận hành, chưa có refund/giá vốn/lợi nhuận, ca quầy (phân quyền nhân viên POS bổ sung ở 0.10). Bộ kiểm thử pg-mem không thay kiểm tra concurrency và triển khai PostgreSQL thật.

## Cập nhật 0.10

Nhân viên POS nằm trong jingo_pos_users, độc lập khỏi jingo_admins/CTV. JSON data chỉ giữ hồ sơ, trạng thái, counterIds và permissions; password_hash là cột riêng không trả qua API. Mọi thay đổi nhân viên dùng version + FOR UPDATE, audit và thu hồi session STAFF trong cùng transaction. Login POS giữ khóa SHARE hồ sơ tới khi ghi session để không tạo phiên từ mật khẩu cũ sau transaction reset.

PosModule chỉ xuất API /pos có cookie jingo_pos path /api/v1/pos và CSRF header riêng. Actor ADMIN được xác minh bằng credential quản trị nhưng không phát cookie admin; actor STAFF đọc lại trạng thái/quyền/quầy mỗi request. AdminGuard gốc và admin APIs không đổi. Order POS chỉ xử lý khi ánh xạ quầy thuộc phạm vi actor, không nhận actor/role từ body. OrdersService kiểm tra staff + quyền/quầy dưới khóa SHARE trong transaction ghi đơn/thu tiền/giao mã/hủy. Actor staff ghi audit dạng pos-user:ID.

Chi tiết POS là projection cho vận hành, không lộ sổ công nợ, lịch sử nội bộ, payment references hay metadata xác thực. Mã đã giao chỉ xuất hiện khi có PRINT hoặc DELIVER; in cần PRINT và cùng phạm vi quầy. Danh sách của nhân viên là các đơn POS thuộc quầy được gán, không phải chỉ đơn tự tạo. Quyền thu tiền không tự cấp quyền giao/in mã, và hủy chỉ được với đơn chưa thanh toán theo rule chung. Kiểm thử pg-mem bao gồm quyền, IDOR, CSRF, giả mạo role, cookie scope, reset/khóa/reassign và chống gọi thẳng service ngoài scope; chưa kiểm tra concurrency bằng PostgreSQL thật.

Mã truy cập khách cho đơn POS mới được sinh phía server, mã client gửi chỉ tham gia idempotency và không mở được vé. Khóa thật được mã hóa cho email outbox, không trả cho nhân viên. Tra cứu POS công khai bằng mã đơn + email chỉ trả trạng thái, ẩn tickets và gắn ticketAccess=EMAIL_LINK; link email có khóa thật vẫn xem mã. Nhờ đó quyền in/xem mã không bị vượt qua bằng API tra cứu công khai. Đơn web tiếp tục tra bằng email như cũ.

## Inventory (v0.11.0)

Separate configs, capacity buckets (product/variant/date/optional slot), and one allocation per order. All guest types consume the same pool. New orders allocate even while limits are disabled. Migration 011 backfills existing snapshots once; unresolved variants/slots count conservatively across matching pools until classified by an admin.

Order creation and capacity changes acquire the same product row lock inside a READ COMMITTED transaction. Creation rechecks request id after the lock, validates fresh remaining stock, and inserts the order and allocation atomically. Day and slot limits both apply. Quotes are advisory and never reserve. Cancellation releases the allocation idempotently in the order transaction. Paid or credit archive retains stock; restoring cancelled orders does not reacquire it. No pending-order TTL.

Admin bulk edits use optimistic config versions and reject capacity below occupied units. Public, POS and partner quotes expose remaining units; only admin routes edit capacity. External supplier inventory remains a future adapter. pg-mem integration covers lifecycle and date isolation but cannot prove PostgreSQL row-lock concurrency.

## Admin order search (0.11.1)

GET /admin/orders validates query parameters and filters in PostgreSQL. Literal case-insensitive substring search covers booking code and contact name/phone/email with bound parameters. Optional booking/payment/channel/date filters combine with the active/archive scope. Creation-date boundaries use Asia/Ho_Chi_Minh midnight; visit dates compare ISO snapshot dates. No new POS or CTV access is granted.

Grouped totals and the selected page read within one REPEATABLE READ transaction. Rows sort by created_at DESC,id DESC with a supporting index and bounded page size (max100). Statistics cover all matching rows, not just the selected page; PAID value is booked order value. This does not replace the receipts report. Page overflow clamps to the last page after archival or concurrent changes. Offset pagination can shift between separate requests when new orders arrive.

## Bulk delivery (0.12.0)

Admin order detail and POS order detail share TicketDeliveryEditor and a pure draft parser. Bulk mode splits only on newlines, trims outer whitespace and ignores blank lines. Single mode preserves internal multiline supplier payloads. Preview validates duplicate input, codes already shown in that order, per-code covers, remaining guests, per-code length and a conservative 80KB serialized-ticket limit under the default HTTP body cap. Code case and interior contents remain unchanged.

Existing DELIVER accepts up to150 tickets. Under the order row lock, it now preflights duplicate hashes within the batch and hashes already issued globally before inserting. The unique hash constraint still arbitrates concurrent deliveries across different orders; PostgreSQL rolls back the complete transaction on conflict. Existing version, request hash, audit, guest limit, payment and POS permissions apply. One DELIVER creates one outbox event only when SMTP is enabled and the order uses the customer-mail channel. No supplier validity lookup is implied. Tests use pg-mem; actual PostgreSQL cross-order concurrency remains to be verified.
