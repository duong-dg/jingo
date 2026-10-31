# PayPal · USD

## Cấu hình

Admin → Thanh toán → Cổng thanh toán → PayPal. Mỗi cổng có nút lưu riêng. PayPal mặc định tắt, có thể nhập thông tin sau.

1. Tạo ứng dụng REST trong PayPal Developer bằng tài khoản doanh nghiệp đủ điều kiện nhận thanh toán. Chọn Sandbox để thử, Live khi chạy thật.
2. Nhập Client ID và Client Secret của ứng dụng. Secret mã hóa bằng khóa SMTP hiện có, không gửi ra trình duyệt; ô trống giữ secret đã lưu. Giữ bản sao khóa mã hóa khi chuyển server.
3. Tạo Webhook URL `https://<domain>/api/v1/payments/paypal/webhook`, đăng ký `CHECKOUT.ORDER.APPROVED` và `PAYMENT.CAPTURE.COMPLETED`. Nhập **Webhook ID** PayPal cấp, không phải Client ID.
4. Nhập tỷ giá **1 USD = … VND** (số nguyên, 100–1.000.000). 25.000 là giá trị ví dụ mặc định, không phải báo giá tự động. Người quản trị chịu trách nhiệm cập nhật tỷ giá.
5. Bật cổng và lưu. TEST chỉ mở qua mục thử kết nối trong admin, không hiện cho khách. Môi trường TEST/LIVE dùng chung với các cổng khác; làm theo hướng dẫn tắt cổng còn lại và nhập khóa mới khi đổi môi trường.
6. LIVE yêu cầu PUBLIC_BASE_URL là HTTPS. Không áp whitelist IP SePay cho đường dẫn PayPal. Webhook PayPal xác minh chữ ký qua API PayPal, không dựa vào IP hoặc nội dung tự khai.

## Số tiền và xác nhận

Giá vé/đơn/công nợ/báo cáo vẫn VND. Số USD = VND / tỷ giá, làm tròn đến cent gần nhất bằng số nguyên (BigInt), không tính bằng số thực trên server. Mỗi yêu cầu giữ VND, tỷ giá, số cent, tài khoản và môi trường đã chốt. Đổi tỷ giá không đổi yêu cầu cũ; lần tạo mới sau khi lưu dùng tỷ giá mới. Khách thấy ước tính ở checkout, sau đó xác nhận số USD thực tế tại nút mở PayPal trước khi trả tiền. Không cộng thêm phí PayPal cho khách.

Máy chủ tạo Orders v2 `CAPTURE`, không cần địa chỉ giao hàng. Stable PayPal-Request-Id cho tạo/capture và mapping duy nhất giữa mã PayPal với yêu cầu JinGo giúp thử lại an toàn. Không nhận giá USD, tỷ giá hay trạng thái thanh toán từ trình duyệt.

Sau khi khách duyệt, trang `/thanh-toan/paypal` POST xác nhận tới server. Webhook APPROVED cũng có thể kích hoạt capture nếu khách không quay lại. Server đọc trực tiếp order từ PayPal, kiểm tra reference/custom/invoice ID, số USD và tiền tệ trước capture; kiểm tra đơn còn hiệu lực/chưa thu tiền, cấu hình và hạn yêu cầu. Server đọc lại trạng thái capture hoàn tất trước ghi thu. Return URL, APPROVED và PENDING tự chúng không xác nhận đã thu tiền.

Webhook xác minh đầy đủ header bằng endpoint verify-webhook-signature với Webhook ID đã lưu. Không tải cert_url do request cung cấp. Chỉ gọi hostname PayPal cố định, timeout và không theo redirect. Webhook COMPLETED tiếp tục đọc order/capture từ API, đối chiếu đúng mapping. Capture ID là mã giao dịch duy nhất; webhook/return lặp không tạo thêm khoản thu hoặc email. TEST ghi sự kiện TEST, không tạo khoản thu thật.

Giao dịch sai tiền/tài khoản, hết hạn hoặc đơn đã thu/hủy/lưu trữ chuyển REVIEW. Rate thay đổi không khiến đơn cũ vào REVIEW. Đổi khóa/tài khoản/webhook hoặc tắt cổng trong lúc nhận tiền cần kiểm tra riêng. Giao dịch chậm sau hết hạn không tự ghi thu. Nhật ký hiển thị VND và USD đã chốt, có bộ lọc PayPal. Chức năng gắn giao dịch thủ công hiện chỉ hỗ trợ SePay chuyển khoản LIVE.

## Giới hạn và nghiệm thu

- Chưa tự động hoàn tiền, tính phí PayPal, chargeback/tranh chấp hoặc đối soát số tiền rút về ngân hàng. Theo dõi và xử lý trên tài khoản PayPal; không coi doanh thu gộp là tiền ròng sau phí. Chưa đăng ký sự kiện refund/reversal.
- Trước LIVE, dùng Sandbox thật kiểm tra duyệt, hủy, pending, webhook retry, đóng trình duyệt trước return và giỏ nhiều gói. Chưa có merchant credentials thì chỉ có thể kiểm thử bằng API giả lập.
- Test tự động dùng pg-mem và mock API PayPal, không thay thế thử Sandbox thật hoặc kiểm thử tranh chấp PostgreSQL đồng thời.

Tài liệu chính thức: https://developer.paypal.com/api/orders/v2/ · https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post · https://developer.paypal.com/api/codes/currency/
