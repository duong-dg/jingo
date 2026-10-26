# JinGo — kiến trúc và phạm vi

## Quyết định kiến trúc

Modular monolith, TypeScript, Next.js frontend và NestJS REST API. Một repository với ba ứng dụng web/api/worker. PostgreSQL là nguồn dữ liệu chính; Redis cho queue/cache; file vé riêng tư dùng object storage khi triển khai nghiệp vụ. App di động sau này dùng cùng API. Chưa triển khai khách sạn hoặc API nhà cung cấp.

## Trạng thái hiện tại (0.2)

- Web tiếng Việt responsive: danh mục database, chi tiết và popup chọn vé, ngày nhanh, hạng/gói, stepper nhóm khách và tổng tiền từ API. Chưa có tạo đơn/giỏ hàng/thanh toán.
- Admin /admin: login/logout cookie HttpOnly, phiên hash PostgreSQL hết hạn 8 giờ, giới hạn đăng nhập sai, kiểm tra nguồn mutation và header chống CSRF. Chủ tài khoản tạo qua env, mật khẩu scrypt; chưa có quản lý nhiều vai trò.
- PostgreSQL: product config JSONB, slug unique, version optimistic locking, audit cùng transaction, bảng admin/session và migration marker. Giá/lịch/khóa lưu trong product document để cập nhật nguyên tử; booking, inventory và ledger sau này cần bảng quan hệ riêng.
- Admin tạo/sửa/nháp/xuất bản sản phẩm, gói và nhóm giá, điều kiện khách, SEO, lịch giá, ngày khóa và nháp tiếng Anh. Ngày khóa chặn cả endpoint rates lẫn quotes.
- Public chỉ đọc sản phẩm xuất bản, không trả bản dịch nháp/lịch nội bộ. Seed ba sản phẩm mẫu một lần, không ghi đè khi restart.
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

Tiếng Việt mặc định, tiếng Anh là ngôn ngữ bổ sung đầu tiên. Admin đã có tab nhập bản dịch tiếng Anh dạng nháp liên kết cùng sản phẩm. Chưa có route tiếng Anh, dịch tự động hoặc workflow WPML đầy đủ; các mục sau là thiết kế đích.

- Tách bản dịch nội dung khỏi thực thể thương mại. Product/variant giữ ID cố định; bảng product_translation và variant_translation có khóa (entity_id, locale). Giá, tồn, mã đối tác và vé không nhân bản theo ngôn ngữ.
- Post, destination, category, menu, trang chính sách và trường SEO có bản dịch liên kết với thực thể gốc. Slug unique theo loại nội dung + locale. Lưu lịch sử slug để chuyển hướng 301.
- Admin hiển thị các cột ngôn ngữ cùng biểu tượng chưa dịch/nháp/cần cập nhật/đã xuất bản, thêm bản dịch ngay trên nội dung gốc. Editor xem nguyên bản và bản dịch cạnh nhau, sao chép cấu trúc, preview trước khi publish.
- Trạng thái xuất bản độc lập mỗi ngôn ngữ. Source revision thay đổi sẽ đánh dấu bản dịch cần cập nhật; không tự ghi đè nội dung đã biên tập. Điều kiện sử dụng/chính sách cần bản dịch được duyệt trước khi mở bán ngôn ngữ tương ứng.
- URL công khai thống nhất /vi/... và /en/... khi bật locale routing; đường dẫn ban đầu chưa có locale phải chuyển hướng có chủ đích. Người dùng đổi ngôn ngữ vẫn ở đúng sản phẩm/bài tương ứng, giữ ngày/gói/số khách hợp lệ.
- Mỗi trang có html lang, title/description, canonical tự trỏ ngôn ngữ đó, hreflang qua lại chỉ giữa bản dịch đã publish và x-default. Không đưa trang chưa dịch vào sitemap hoặc tạo trang tiếng Anh chứa nguyên văn tiếng Việt.
- Chuỗi giao diện dùng dictionary key; không hard-code khắp component. Nội dung CMS dùng bảng dịch. Định dạng ngày/tiền qua Intl; đổi ngôn ngữ không tự đổi tiền tệ hoặc giá giao dịch.
- API trả locale và availableLocales, tìm cùng sản phẩm bằng ID ổn định. App di động dùng lại nội dung dịch và API này.
- Email, voucher JinGo và thông báo theo locale lưu trên booking; mã/QR vé gốc đối tác giữ nguyên. Không chỉnh nội dung vé gốc theo cách làm mất hiệu lực.
- Có thể thêm gợi ý dịch máy sau này qua một adapter, luôn lưu nháp để con người duyệt; chưa tích hợp dịch vụ hoặc phát sinh chi phí dịch tự động.

Các mục 1–5 thuộc phạm vi đã thống nhất; phần sản phẩm/giá/admin chủ đã triển khai như trên, các nghiệp vụ đặt hàng/tài chính chưa hoàn thành.
