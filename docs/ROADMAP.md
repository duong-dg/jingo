# JinGo — tiến độ để đưa vào vận hành

## Đã có

- Vé/tour, loại sản phẩm, cây điểm đến, ảnh/nội dung, lịch giá theo nhóm khách/ngày/mùa, khóa ngày và suất giờ.
- Đặt vé, thu đủ chuyển khoản/tiền mặt thủ công, mã vé từng phần hoặc hàng loạt, in phiếu, tra cứu và email có hàng đợi thử lại.
- Tồn dùng chung Web/POS/CTV, cấp theo ngày/suất; hủy đơn chưa thu trả tồn, có chuyển dữ liệu đơn cũ.
- POS riêng, tài khoản nhân viên và quyền theo quầy; giá CTV trực tiếp, hạn mức/công nợ/trả nợ.
- Blog/chuyên mục/SEO, Việt–Anh và quản trị bản dịch; nhân bản sản phẩm thành nháp.
- Tìm/lọc/phân trang đơn toàn bộ dữ liệu, xuất CSV, báo cáo doanh thu vận hành.
- Nhà cung cấp: hồ sơ nội bộ, liên kết sản phẩm, lưu trữ có kiểm tra tham chiếu (0.16).

## Các hạng mục tiếp theo

1. **Kho mã và file vé riêng tư:** nhập mã theo nhà cung cấp/gói, phát hiện trùng, cấp mã đúng đơn, tải vé có kiểm quyền; tránh dùng thư viện ảnh công khai cho file vé.
2. **Hoàn hủy:** yêu cầu hủy, ghi xác nhận nhà cung cấp, vô hiệu hóa mã theo khả năng đối tác, hoàn tiền đúng người mua hoặc CTV, điều chỉnh sổ công nợ và báo cáo. Tách trạng thái yêu cầu/đã hoàn; không coi bấm hủy là ngân hàng đã trả tiền.
3. **Ca quầy:** mở/đóng ca, tiền đầu ca, tổng thu tiền mặt/CK, tiền bàn giao và chênh lệch, phân quyền chốt ca và lịch sử sửa.
4. **Giá vốn/đối soát nhà cung cấp:** đã có lô nhiều NCC, phân bổ giá vốn, công nợ/ghi tiền trả và lợi nhuận gộp (0.19). Đã có cảnh báo nguồn sắp hết/hết hạn và danh sách đơn thiếu nguồn (0.20). Còn trả trước, chứng từ/đối soát và điều chỉnh hoàn tiền; không làm trả lô vì vé nhập không được trả NCC. Thiết kế đã có: lưu nguồn cung và giá vốn theo thời điểm bán; báo cáo phải giữ đúng lịch sử khi đổi nhà cung cấp sản phẩm. Liên kết sản phẩm là nguồn mặc định; nguồn/giá vốn thực tế theo từng lô phân bổ.
5. **Khuyến mãi/voucher:** đã có cấu hình và checkout web bán lẻ, giữ/trả lượt và snapshot tiền giảm (0.18). Còn điều kiện riêng sản phẩm/gói/kênh, cộng dồn, khuyến mãi CTV/POS và hoàn tiền: thời hạn, điều kiện gói/ngày/kênh, giới hạn lượt, chống dùng trùng và quy tắc với giá CTV.
6. **Cổng thanh toán:** kết nối cổng được chọn với tài khoản merchant/sandbox, xác thực chữ ký callback, chống thông báo trùng, đối soát số tiền và hoàn tiền theo quy trình của cổng. Cần thông tin merchant trước khi kiểm thử kết nối thực.
7. **Nội dung/quản trị:** lịch sử phiên bản bài viết, xem trước bản nháp, thêm ngôn ngữ, trang chính sách/điều khoản và phân quyền biên tập.
8. **Vận hành:** quy trình sao lưu cả PostgreSQL/ảnh/khóa SMTP, thử khôi phục, giám sát, giới hạn truy cập sau reverse proxy và kiểm thử mua đồng thời trên PostgreSQL thật.

## Quyết định giữ nguyên

- Đơn chưa thanh toán không tự hết hạn. Chưa áp dụng TTL trả tồn tự động vì luồng nhận đơn và xử lý thủ công đã được chốt.
- API tồn/mã vé nhà cung cấp triển khai khi sản lượng đủ; giai đoạn này nhập và giao thủ công.
- Vé đã nhập không trả lại nhà cung cấp; cảnh báo tồn/hết hạn để chủ động mua và bán.
- Khách sạn là module sau, không ghép vào mô hình vé hiện tại. Mobile app tái sử dụng API khi web vận hành ổn định.
- Bộ kiểm thử pg-mem không thay thế thử concurrency, backup/restore và kết nối dịch vụ thật trên máy triển khai.

Danh sách này mô tả phần còn phải làm; không phải xác nhận các hạng mục chưa đánh dấu đã hoạt động.
