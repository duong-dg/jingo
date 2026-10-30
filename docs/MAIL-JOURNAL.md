# Lịch sử gửi email

Admin → Cài đặt → Lịch sử gửi email (`/admin/email`). Tổng quan → Email gửi thất bại mở `/admin/email?status=FAILED`. Tìm theo mã đơn thành phần JG, mã đặt chỗ nhiều gói JC hoặc ID email; lọc trạng thái và event; 25 dòng/trang. Những email cũ, kể cả đơn đã lưu trữ, vẫn được tìm. Cấu hình SMTP giữ trang riêng; danh sách 100 thư gần nhất ở đó có liên kết sang toàn bộ lịch sử.

GET `/api/v1/admin/smtp/journal` dùng AdminGuard và private/no-store; validate status/event/q/page, tìm literal bằng tham số SQL, không coi %/_ là wildcard. COUNT và trang trong cùng REPEATABLE READ; page vượt giới hạn được đưa về trang cuối. Chỉ trả mã đơn/giỏ, order_id, job id/event/status/attempts/lỗi tổng quát và mốc giờ. Không trả contact, khóa tra cứu, SMTP credentials, nội dung thư hoặc file vé. Tất cả thời gian hiển thị Asia/Ho_Chi_Minh.

Nút gửi lại chỉ hiện cho FAILED, tái sử dụng endpoint/transaction/row lock/audit hiện có. SMTP tắt hoặc job không FAILED sẽ bị từ chối; retry đưa về PENDING và xóa lỗi/đặt lại số lần thử. Không gửi ngay từ thao tác UI, không tạo lại vé hay thu tiền. Không tự gửi lại hàng loạt hoặc gửi lại thư SENT. Thông báo SENT được gọi là đã xử lý gửi vì có thể là bước xử lý không có tệp vé hoặc SMTP đã nhận thư; không xác nhận khách đã nhận/inbox. UI giữ thông báo đưa vào hàng đợi và yêu cầu cập nhật trạng thái khi cần.

Kiểm thử gồm 132 job, FAILED cũ nằm ngoài 100 gần nhất, nhiều trang, tìm mã JC/JG/id, đơn lưu trữ, query sai, wildcard literal, chặn truy cập công khai/POS, không lộ dữ liệu riêng và từ chối retry khi SMTP tắt. Bộ kiểm thử email hiện có kiểm tra retry có scope/CSRF/audit và gửi SMTP giả lập; không gửi email thật.
