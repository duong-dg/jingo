# Vé điện tử JinGo

- Giao mã vé đối tác cho đơn đã thanh toán/công nợ CTV trước, sau đó mở chi tiết đơn → File vé riêng tư → Tạo vé thương hiệu JinGo.
- Tải PDF hoặc ảnh vé gốc tối đa 5 MB; chọn trang (PDF tối đa 50 trang) và QR tương ứng. Mỗi lần tạo ứng với một mã vé đã giao, không làm tăng số khách. Với file nhiều trang, làm riêng từng mã/trang để tránh gán nhầm.
- Hệ thống render trang giới hạn 2000px, tìm QR rồi giữ vùng ảnh QR gốc; không thay bằng mã đặt chỗ JinGo. Có thể nhập payload QR do đối tác cấp khi thực sự có payload; không suy ra từ dòng mã chữ.
- Tải bản xem trước, đối chiếu gói/ngày/số khách và quét thử trước khi xác nhận giao. QR được giữ tách khỏi logo; không vẽ logo hoặc hiệu ứng lên QR. Mẫu PDF không có giá vốn/giá CTV.
- File JinGo được lưu riêng tư như file vé khác. Quầy cần quyền PRINT và đúng quầy để tải. CTV chỉ xem đơn của mình; khách dùng cơ chế nhận vé hiện có. Thu hồi file chặn tải tiếp, không xóa bản khách đã tải/in.
- Giao PDF JinGo xếp hàng email TICKET_READY nếu SMTP bật. Người nhận là email liên hệ trên đơn; CTV có bản sao BCC tới email tài khoản. CTV cần điền email khách lúc đặt nếu muốn giao thẳng khách. File gốc CTV chưa bật chia sẻ không được đính kèm cho khách. Tổng đính kèm tối đa 12 MB; file còn lại tải trong trang nhận vé.
- Có thể lưu PDF/ảnh gốc riêng bằng phần đính kèm file hiện có; file chọn để trích QR không tự được lưu thành một file gốc thứ hai. Không sửa file nhà cung cấp. File gốc có thể chứa giá hoặc thông tin nội bộ; kiểm tra trước khi cho khách tải.
- Docker cài fonts-dejavu-core để PDF có tiếng Việt. Khi chạy Node trực tiếp, cài font này hoặc đặt TICKET_FONT_PATH tới font TTF phù hợp.
- Kiểm thử kỹ thuật xác nhận QR quét lại đúng payload. Khả năng dùng vé JinGo qua cổng thực tế còn phụ thuộc điều kiện chấp nhận của đơn vị tổ chức; kiểm tra với đối tác trước khi phát hành hàng loạt.
