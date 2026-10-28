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
3. **Ca quầy:** đã có mở/chốt ca, tiền đầu ca, khoản thu CASH/BANK gắn theo ca, bàn giao/chênh lệch, quyền SHIFT và snapshot/audit (0.21). Đã thêm in biên bản bàn giao/phụ lục và xuất khoản thu CSV (0.24). Đã có bổ sung/rút/chi tiền mặt, chứng từ, sổ thu/chi CSV và biên bản có tổng điều chỉnh (0.27). Còn xác nhận người nhận bàn giao và chỉnh sai theo chứng từ.
4. **Giá vốn/đối soát nhà cung cấp:** đã có lô nhiều NCC, phân bổ giá vốn, công nợ/ghi tiền trả và lợi nhuận gộp (0.19). Đã có cảnh báo nguồn sắp hết/hết hạn và danh sách đơn thiếu nguồn (0.20). Đã thêm sổ đối soát theo kỳ, đầu/cuối kỳ, số dư chạy và CSV (0.25). Đã có nguồn lấy theo đơn không nhập số lượng, giá vốn/công nợ theo số vé chốt và sổ mua bất biến (0.29). Đã có sửa/thùng rác nguồn giữ giá vốn cũ (0.30), lịch sử lấy vé theo nguồn và CSV riêng (0.31). Còn trả trước, xác nhận/chỉnh chứng từ và điều chỉnh hoàn tiền; không làm trả lô vì vé nhập không được trả NCC. Thiết kế đã có: lưu nguồn cung và giá vốn theo thời điểm bán; báo cáo phải giữ đúng lịch sử khi đổi nhà cung cấp sản phẩm. Liên kết sản phẩm là nguồn mặc định; nguồn/giá vốn thực tế theo từng lô phân bổ.
5. **Khuyến mãi/voucher:** đã có cấu hình và checkout web bán lẻ, giữ/trả lượt và snapshot tiền giảm (0.18). Đã thêm điều kiện sản phẩm/gói (0.23). Đã có khoảng ngày sử dụng và thứ áp dụng, kiểm tra khi báo giá/lập đơn (0.26). Còn điều kiện kênh, cộng dồn, khuyến mãi CTV/POS và hoàn tiền: thời hạn, điều kiện gói/ngày/kênh, giới hạn lượt, chống dùng trùng và quy tắc với giá CTV.
6. **Cổng thanh toán:** kết nối cổng được chọn với tài khoản merchant/sandbox, xác thực chữ ký callback, chống thông báo trùng, đối soát số tiền và hoàn tiền theo quy trình của cổng. Cần thông tin merchant trước khi kiểm thử kết nối thực.
7. **Nội dung/quản trị:** đã có xem trước bài nháp/Việt–Anh, lịch sử phiên bản và khôi phục thành nháp (0.22). Đã có so sánh hai phiên bản theo từng mục, Việt–Anh và xem nội dung/HTML (0.28). Còn tự lưu, thêm ngôn ngữ, trang chính sách/điều khoản và phân quyền biên tập.
8. **Vận hành:** quy trình sao lưu cả PostgreSQL/ảnh/khóa SMTP, thử khôi phục, giám sát, giới hạn truy cập sau reverse proxy và kiểm thử mua đồng thời trên PostgreSQL thật.

## Quyết định giữ nguyên

- Đơn chưa thanh toán không tự hết hạn. Chưa áp dụng TTL trả tồn tự động vì luồng nhận đơn và xử lý thủ công đã được chốt.
- API tồn/mã vé nhà cung cấp triển khai khi sản lượng đủ; giai đoạn này nhập và giao thủ công.
- Vé đã nhập không trả lại nhà cung cấp; cảnh báo tồn/hết hạn để chủ động mua và bán.
- Khách sạn là module sau, không ghép vào mô hình vé hiện tại. Mobile app tái sử dụng API khi web vận hành ổn định.
- Bộ kiểm thử pg-mem không thay thế thử concurrency, backup/restore và kết nối dịch vụ thật trên máy triển khai.

Danh sách này mô tả phần còn phải làm; không phải xác nhận các hạng mục chưa đánh dấu đã hoạt động.
