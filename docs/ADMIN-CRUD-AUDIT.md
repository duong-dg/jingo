# Rà soát sửa/xóa dữ liệu quản trị

| Hạng mục | Sửa | Xóa / ngừng sử dụng |
| --- | --- | --- |
| Bài blog | Nội dung, SEO, lịch đăng, bản dịch, lịch sử phiên bản | Xóa vào thùng rác, ẩn trang công khai; khôi phục thành nháp |
| Chuyên mục blog | Đổi tên và cập nhật bài liên quan | Xóa, chuyển bài sang Cẩm nang; giữ lịch sử và giữ nguyên bản tiếng Anh |
| Sản phẩm vé/tour | Thông tin, ảnh, gói, giá, lịch, SEO, dịch | Lưu trữ/ngừng bán; lọc lưu trữ và khôi phục thành nháp; giữ đơn cũ |
| Loại sản phẩm | Form sửa | Trạng thái Lưu trữ; chặn khi còn sản phẩm đang tham chiếu |
| Điểm đến | Tên, cây cha/con, dịch, thứ tự | Trạng thái Lưu trữ; kiểm tra điểm con và sản phẩm đang sử dụng |
| Nhà cung cấp | Form sửa liên hệ/thông tin | Lưu trữ; kiểm tra ràng buộc sử dụng |
| Nguồn vé / giá vốn | Form sửa và lịch sử | Xóa nguồn chưa phát sinh; nguồn đã dùng giữ lịch sử/lưu trữ |
| Nhóm giá CTV | Giá gói/đối tượng/ngày | Trạng thái Lưu trữ |
| CTV | Tài khoản, nhóm giá, hạn mức | Tạm dừng bán / khóa đăng nhập; giữ đơn và công nợ |
| Nhân viên quầy | Thông tin, quầy, quyền | Khóa tài khoản, kết thúc phiên; giữ giao dịch đã tạo |
| Quầy | Tên và trạng thái | Lưu trữ, chặn khi còn ca mở |
| Voucher | Giá trị, phạm vi, hạn dùng, giới hạn | Tắt hoạt động; giữ lượt sử dụng và đơn đã giảm giá |
| Đơn hàng | Thông tin/hành động nghiệp vụ có kiểm soát | Hủy theo điều kiện; lưu trữ/khôi phục, giữ số tiền báo cáo |
| Kho mã / file vé | Cấp mã, file, chia sẻ | Thu hồi mã/quyền tải; file gốc có lịch dọn riêng |
| Tồn vé | Giới hạn theo ngày/gói/giờ | Điều chỉnh giới hạn / bỏ giới hạn; giữ phân bổ theo đơn |
| Ca, thanh toán, công nợ, đối soát | Ghi nhận theo nghiệp vụ | Không xóa dữ liệu tài chính đã phát sinh |
| SMTP, cổng thanh toán | Cấu hình và khóa | Bật/tắt, giữ nhật ký; không có xóa cấu hình vô điều kiện |

Các mục đang có trạng thái Lưu trữ/Khóa dùng form sửa hiện có, không thêm nút xóa cứng làm mất liên kết lịch sử. Ảnh được gỡ khỏi nội dung/gói bằng trình chọn ảnh; file dùng chung không xóa khi gỡ một tham chiếu.

Các thao tác mới yêu cầu phiên admin và kiểm tra CSRF, optimistic version, ghi audit. Bài viết chuyển thùng rác giữ phiên bản và slug. Khôi phục bài/sản phẩm không tự xuất bản. Đổi/xóa chuyên mục tăng version và lưu lịch sử các bài bị đổi để cửa sổ sửa cũ không ghi đè im lặng. Chuyên mục mặc định Cẩm nang không xóa.
