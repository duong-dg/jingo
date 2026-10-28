# JinGo — kiến trúc và phạm vi

Tiến độ hiện tại và các phần còn thiếu: [ROADMAP.md](ROADMAP.md). Các mục phiên bản bên dưới ghi lại từng giai đoạn triển khai.

## Quyết định kiến trúc

Modular monolith, TypeScript, Next.js frontend và NestJS REST API. Một repository với ba ứng dụng web/api/worker. PostgreSQL là nguồn dữ liệu chính; Redis cho queue/cache; file vé riêng tư dùng object storage khi triển khai nghiệp vụ. App di động sau này dùng cùng API. Chưa triển khai khách sạn hoặc API nhà cung cấp.

## Lịch sử nền tảng (0.4)

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

## Order email status (0.13.0)

Admin-only GET /admin/orders/:orderId/emails returns no-store, a scoped latest100 queue projection and enabled/eligible/reason metadata. It excludes mail keys, SMTP config secrets, message bodies and customer-access tokens. POST /admin/orders/:orderId/emails/:id/retry uses AdminGuard/CSRF and verifies ownership before changing state. Both scoped and existing global retries lock the job, require FAILED + enabled SMTP + customer-mail eligibility, reset to PENDING and audit atomically. An immediate duplicate retry cannot reset an active job. Order financial version and ticket/inventory state are untouched. SMTP SENT means transport acceptance, not inbox delivery. Tests enqueue only; no real email is sent by the order-mail fixture.

## Admin order CSV (0.14.0)

Admin-only GET /admin/orders/export shares validated filters/SQL predicates with the paginated list but ignores page/pageSize. One SELECT provides a consistent result snapshot and fetches at most10001 rows; above10000 returns an error before emitting a CSV attachment. No silent truncation or repeated paginated reads. The frontend uses the applied filter snapshot and downloads a no-store UTF-8 BOM CSV. Columns explicitly project order/contact/snapshot fields, excluding ticket codes, customer-access keys and internal notes. Cells are quoted/escaped and spreadsheet formula prefixes neutralized; phone numbers are text. Booking value is distinct from receipt-based revenue.

## Product duplication (0.15.0)

A client-side deep clone creates an unsaved draft, then uses the existing authenticated/validated product save API. New UUIDs replace product, variant, slot and rule IDs; all rule/closure product and variant references are rebound. Source object remains untouched. Published status resets to DRAFT, version to0, SEO title to the default and English content is omitted. Images reference existing media-library assets. Inventory, partner net-price mappings, orders and ticket codes live separately and are not copied. UI requires saving existing source/translation edits before duplication and clearly states that the clone still needs saving.

## Suppliers (0.16.0)

Admin-only jingo_suppliers stores contact information/notes and optimistic versions. Products optionally reference supplierId; existing products stay valid without a supplier. Product save and supplier archive acquire the same migration-marker mutex in READ COMMITTED transactions so an archive cannot race a new product association. Archive is blocked while any draft or published product references the supplier. Public catalog projections remove supplierId; POS/CTV product DTOs already project explicit fields. This is current catalog attribution, not historical supplier cost/debt tracking. Supplier data is not translated or exposed as customer-facing content.

## Voucher configuration (0.17.0)

Admin-only voucher CRUD stores canonical uppercase unique codes, immutable code identity, integer discount terms, validity dates, planned usage cap and enabled flag. Strict validation, version locking and audit are enforced. The list explicitly reports checkoutEnabled:false. Frontend math is illustrative only; no public voucher lookup, quote/order discount or redemption accounting is implemented in this phase. Enabling config cannot change a booking total.

## Retail voucher redemption (0.18.0)

VouchersModule is injected into public quotes and OrdersService. Orders optionally accept one normalized voucherCode; POS/partner contexts reject it. Product row lock precedes voucher row FOR UPDATE in READ COMMITTED. Fresh active-use COUNT and terms checks run before inserting an immutable discount snapshot and jingo_voucher_uses allocation in the same order transaction. Quotes do not lock/reserve. Admin terms changes lock the same voucher and cannot lower maxUses below occupied uses.

Unpaid cancellation first releases inventory (product lock), then voucher (voucher lock); released flag makes this idempotent. Paid/CREDIT archival retains usage. Restore keeps the cancellation. Order idempotency is checked before fresh voucher validation, so retrying a committed request still succeeds after expiry/cap/disable. Guest lines retain retail unit prices; total and receipt amounts use net total; discount/subtotal are explicitly rendered and exported. Existing financial reports already sum snapshot.total. Actual PostgreSQL concurrent-order verification is still required; pg-mem validates lifecycle and API rules only.

## Supply lots and supplier payments (0.19.0)

Immutable receipt lots bind supplier/product/variant/guest group, validity dates and fixed unit cost/received quantity; names are snapshotted at receipt. Lot receipt recognizes full supplier liability. Enable/priority changes are versioned; archive/config/receipt share the supplier-catalog mutex, receipt/payment also lock the supplier row. Source stock is a cross-date pool distinct from customer day capacity.

Admin order allocation locks order then product then source lot rows in READ COMMITTED, preflights the whole plan and writes cost allocations atomically. Automatic priority: priority ASC, unit cost ASC, receipt time ASC, id ASC. Manual allocation may cover part of an order; auto fills the rest. Idempotency uses supply_actions and immutable receipt IDs/hashes. DELIVER invokes the same planner for products with source lots after normal financial/code/quantity checks, before inserts, within the order transaction. Unpaid cancellation returns pool units with released=true; supplier receipt liabilities remain. Costs are internal side tables, not public order snapshots.

Supplier payments are immutable, use request hash/id plus unique outgoing reference, and enforce no overpayment under the supplier row lock. They record actual money paid, never initiate bank transfers. Profit reporting reads one REPEATABLE READ snapshot: PAID/CREDIT noncancelled orders created in the Vietnam date range, only fully costed orders contribute recognized revenue/cost/gross margin. Uncosted rows remain visible. Receipt liabilities/payments are global. No supplier advance/receipt reversal/refund workflow or code-vault fulfilment yet. PostgreSQL concurrency and backup/restore still require real-server verification.

## Cảnh báo nguồn vé (0.20)

GET admin/supply/alerts là read-only, AdminGuard, no-store, validate threshold/days/page. Ngày hiện tại theo Asia/Ho_Chi_Minh; phân loại lô bằng hàm thuần với ưu tiên hết hạn → hết vé → sắp hết hạn → sắp hết. Không cảnh báo lô tắt/chưa tới ngày hoặc lô hết hạn đã dùng hết. Tổng hợp số thiếu theo nhóm khách của snapshot trừ allocation chưa release, bỏ đơn hủy/lưu trữ, thứ tự created_at/id và phân trang 25. REPEATABLE READ giữ các lần đọc nhất quán trên PostgreSQL; pg-mem chỉ kiểm logic. Không sửa tồn, tiền, đơn hoặc allocation. Chưa có push/email; tổng hợp hiện đọc các đơn/allocations đang có, cần SQL aggregation/index review khi quy mô lớn. Vé nhập không trả NCC theo quyết định nghiệp vụ.

## Ca quầy (0.21)

ShiftsModule độc lập OrdersModule; POS controller dùng PosAuth, admin dùng AdminGuard. SHIFT là quyền riêng, không mặc định thêm cho user cũ; staff chỉ chốt ca mình mở, admin có thể chốt thay. Các truy vấn chi tiết không trả liên hệ hoặc khóa nhận vé khách.

`jingo_pos_shifts` giữ thông tin mở/chốt, hash retry và summary chốt. `jingo_pos_open_shifts` có PK counter_id/unique shift_id giữ một ca mở mỗi quầy; `jingo_pos_shift_receipts` có PK payment_id để mỗi khoản thu thuộc tối đa một ca. Mở/chốt khóa quầy trước user/shift. PAY khóa order → counter → staff; attach payment trong transaction PAY sau tạo payment/method. Như vậy close giữ counter lock thì không có khoản thu mới chèn vào ca đang chốt. Orders.create không gắn ca, không dựa timestamp để cộng lại. Counter archive cũng khóa counter và chặn nếu đang có ca. PosUsers.save đang khóa counter SHARE trước user UPDATE, giữ cùng thứ tự counter/user với mở/chốt/PAY.

Ca chốt lưu tổng CASH, BANK, expectedCash, countedCash, difference, receiptCount bất biến. Không có tiền chi/rút/hoàn hoặc điều chỉnh sau chốt. Ca tùy chọn: PAY không có ca mở vẫn ghi thu bình thường và không gắn ca về sau. Kiểm thử pg-mem xác nhận logic, chưa chứng minh row-lock concurrency PostgreSQL thật.

## Preview & revision bài viết (0.22)

`jingo_post_revisions` PK(post_id,version) giữ snapshot nội dung và metadata sau mỗi save; save bản dịch cũng đi qua PostsService.save. Trước update, giữ baseline nếu version hiện tại chưa có lịch sử. INSERT revision/audit nằm cùng transaction cập nhật post, CAS version chống mất dữ liệu. Restore kiểm expected version, lấy snapshot theo cùng post_id, giữ slug hiện tại, ép DRAFT/publishedAt=null và English DRAFT, gọi pipeline save/validate/sanitize để tạo version mới. Không đưa lịch sử vào DTO public.

GET admin/posts/:id/preview và revisions dùng AdminGuard; preview chỉ trả một ngôn ngữ đã sanitize, hỗ trợ revision có kiểm phạm vi. Preview client không có nội dung private trong server HTML/RSC; API private/no-store và X-Robots-Tag, proxy thêm header noindex/noarchive cho trang. ArticleView được dùng chung public/preview; JSON-LD chỉ ở public page. Không token/public share, không sửa trạng thái khi preview. Public products được lấy riêng sau xác thực bài, không đưa sản phẩm nháp vào preview. Assets thư viện media vẫn công khai, không thay đổi mô hình bảo mật media.

## Phạm vi voucher (0.23)

JSON voucher thêm scope ALL/PRODUCTS/VARIANTS và targets [{productId,variantId?}], mặc định ALL/[] cho dữ liệu cũ. Save validate shape/dedup/reference; không có migration đổi dữ liệu đã ghi. Hàm voucherApplies dùng đúng cặp product/variant; scope riêng thiếu selection/targets hoặc scope lạ fail closed. Pricing và Orders.create truyền productId/variantId đã kiểm catalog; discount kiểm lại scope khi giữ khóa voucher tại tạo đơn. Snapshot đơn chỉ ghi code/amount/subtotal như trước, không lưu hoặc công khai targets. Thay scope không sửa đơn/usage đã ghi; request idempotence đã commit vẫn ưu tiên trả đơn cũ. Không thêm khóa catalog ở voucher save để tránh đảo thứ tự product → voucher của Orders.create. Catalog thay đổi sau cấu hình có thể khiến target lỗi thời; không fallback sang ALL.

## Tài liệu ca quầy (0.24)

GET admin/pos shifts/:id/print dùng detail đọc REPEATABLE READ với quyền ca/quầy, từ chối closedAt rỗng. Trang in chỉ có vỏ HTML trước khi tải dữ liệu private; không server-fetch bằng cookie/token URL, noindex. Bản chính lấy summary đã chốt; danh sách receipts là phụ lục tùy chọn, không tính lại summary. CSS named page shift-handover A4 để không đổi khổ in phiếu vé.

GET admin/pos shifts/:id/export dùng cùng quyền, CSV private/no-store + nosniff, Content-Disposition filename theo mã ca, X-Jingo-Export-Count. shiftCsv dùng csvCell đã có để escape/neutralize formula; chỉ receipt amount là giá trị tiền cần cộng, không lặp các tổng ca. Giới hạn 10k receipts, empty file header-only. Không tạo file thường trực/server public, không lưu tác vụ xuất vào financial ledger, không tự gửi email.

## Sổ NCC theo kỳ (0.25)

SupplierStatementsService đọc supplier + SUM trước kỳ + lots/payments trong kỳ ở REPEATABLE READ. Dùng [begin VN, dayAfterEnd VN), tính BigInt và chặn kết quả ngoài safe integer; SUM PostgreSQL numeric dạng chuỗi được parse nguyên. Index supplier_id/created_at trên cả hai bảng. Không lọc enabled/trạng thái NCC/đã phân bổ vì nghĩa vụ mua lô đã ghi là bất biến. Merge theo timestamp ms, tie PURCHASE trước PAYMENT rồi id, chạy số dư trước khi cắt trang. API validate UUID/from/to/page, tối đa 367 ngày/10k phát sinh; query LIMIT 10001 mỗi nguồn để phát hiện vượt, không trả báo cáo thiếu dòng.

GET admin/supply/statements/:id trả tổng và 50 dòng/trang, export trả toàn bộ cùng bộ lọc nhưng snapshot đọc mới. AdminGuard/private no-store, CSV nosniff/attachment/count. CSV có OPENING/CLOSING với cột tăng/giảm trống, từng movement duy nhất và cột running balance, dùng csvCell để escape/neutralize. Read-only, không ghi ledger/audit thu tiền và không gửi email. Không phải báo cáo lợi nhuận hay tồn khả dụng.

### Voucher theo ngày sử dụng (0.26)
`visitFrom`/`visitTo` là ngày lịch YYYY-MM-DD tùy chọn, bao gồm hai đầu; `visitWeekdays` dùng 0=Chủ nhật, 1–6=thứ Hai–Bảy, rỗng là mọi thứ. Điều kiện ngày sử dụng kết hợp AND với phạm vi sản phẩm/gói và ngày đặt vé. Quote và commit truyền ngày đã kiểm tra giá vào VouchersService; việc cấp lượt vẫn được khóa trong giao dịch lập đơn. Không đổi snapshot/retry đơn đã tạo.

### Thu/chi ca quầy (0.27)
Bảng `jingo_pos_cash_movements` lưu IN/OUT dương, người ghi, tham chiếu/lý do và hash request. Ghi thu/chi khóa quầy rồi ca theo cùng thứ tự với chốt ca, kiểm tra lại quyền SHIFT/phạm vi trong DB và chủ ca. Mỗi request ID duy nhất toàn hệ thống; retry cùng payload/actor/ca không ghi trùng kể cả sau chốt. Tăng version ca khi ghi để ngăn chốt trên tổng thu/chi cũ. Chốt tính tổng cashIn/cashOut và giữ snapshot; ca cũ thiếu trường mới hiển thị 0. Khoản thu bán vé/giá vốn/công nợ/hoàn tiền không bị thay đổi. Tối đa 10.000 chứng từ tiền mặt một ca; không cắt dữ liệu xuất. Concurrency vẫn cần kiểm tra trên PostgreSQL thật.

### So sánh phiên bản bài viết (0.28)
GET admin/posts/:id/compare nhận from/to nguyên dương và lang vi/en; tra snapshot theo cả post_id/version. Nếu trùng phiên bản hiện tại, dùng bản đã lưu hiện hành để hỗ trợ bài cũ chưa có revision baseline. Response chỉ chứa các trường so sánh được chọn, không lộ toàn bộ snapshot hay người lưu; HTML được cleanContent lại. UI render hai cột và đếm thay đổi theo trường; có mã HTML dạng text để đối chiếu định dạng/liên kết, không có thuật toán diff từng từ. Không mutate/lưu/khôi phục khi đọc. Request UI có sequence guard tránh kết quả cũ đè lựa chọn mới.
