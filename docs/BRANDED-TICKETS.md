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


## Quầy: tải file → Tiếp → In vé JinGo

Sau khi thu đủ tiền, phần Xuất vé JinGo chỉ yêu cầu PDF/ảnh đối tác và nút Tiếp. Không nhập mã, chọn trang hay chỉ định số QR thủ công. API `/admin/orders/:orderId/files/batch` và `/pos/orders/:orderId/files/batch` tự quét tối đa 50 trang, 150 QR, file 5 MB. Quét toàn trang và các vùng chồng lấp để nhận nhiều QR cạnh nhau; QR trùng nội dung trong cùng file chỉ xuất một lần. Mỗi QR tương ứng một khách, một mã JGV và một trang A5 trong PDF JinGo. Giữ nguyên hình QR gốc để quét vào cổng; mã JGV là mã quản lý JinGo.

Không suy đoán số khách cho QR dùng chung nhiều người. Nếu đối tác cấp một QR cho cả nhóm, dùng phần xử lý bổ sung để nhập đúng số khách. File không đọc được QR hoặc số QR vượt khách còn chưa giao sẽ báo lỗi, không tạo vé hay email. Với file hỗn hợp nhiều gói/ngày, phải tải đúng file của từng dòng đơn để tránh gắn nhầm thông tin.

Tạo vé, cấp mã, lưu PDF riêng tư, kiểm tra quyền DELIVER/quầy, cập nhật giá vốn và xếp hàng một email TICKET_READY nằm trong cùng giao dịch. Lỗi sẽ rollback và dọn file mới. Tải lại cùng file trả về PDF đã tạo, không cấp mã hay gửi email trùng. Mã JGV xác định từ nội dung QR, nên không thể cấp cùng QR sang đơn khác qua luồng này. Email dùng SMTP đang bật và email liên hệ của đơn; đối với đơn quầy, file đính kèm là file gốc đối tác. Luồng tự động lưu cả file gốc và PDF JinGo nhiều trang để in.

Nút In vé JinGo mở PDF riêng tư để chọn In từ trình xem PDF của trình duyệt. Các thao tác đính kèm/giao mã cũ nằm trong phần File đã giao và xử lý bổ sung, mặc định thu gọn.


### PDF nhiều vé và thời gian chờ

Web cho phép proxy API chờ tối đa 120 giây (mặc định Next là 30 giây) để quét PDF nhiều trang. Lỗi phản hồi text/HTML từ proxy được hiển thị bằng thông báo HTTP dễ hiểu; không hiện JSON SyntaxError. Khi chưa xác nhận kết quả, cập nhật đơn và kiểm tra file trước khi xuất lại vì API có thể đã hoàn tất phía sau. Reverse proxy bên ngoài cần có thời gian chờ phù hợp với cấu hình web. Kiểm tra tự động bao gồm booking 8 khách, PDF 8 trang/8 QR, và phản hồi lỗi text HTTP 500/504.


## Lưu file gốc, email khách và dọn đầu tháng

Luồng tự động tại quầy lưu cả file gốc đối tác và bản in JinGo. Email khách tại quầy chỉ đính kèm file gốc; bản JinGo giữ để in. File gốc được giữ nguyên bytes, gồm PDF/PNG/JPG/WebP. Các luồng web/CTV giữ quy tắc chia sẻ và gửi email hiện có.

Theo lịch Việt Nam, đầu mỗi tháng tự xóa file ORIGINAL của các tháng trước tháng liền kề. Ví dụ ngày 1/12 xóa file tải lên đến hết 31/10, giữ toàn bộ tháng 11. File tải bất cứ ngày nào trong tháng 10 đều hết hạn lúc 00:00 ngày 1/12. Lịch tính theo created_at, không theo ngày dùng vé. API kiểm tra mỗi giờ và khi khởi động để chạy bù nếu máy chủ ngừng ở thời điểm chuyển tháng; mỗi lượt tối đa 500 file. PDF BRANDED, mã QR/mã vé, dữ liệu booking, doanh thu và lịch sử không bị xóa. Tự xóa chỉ xóa file trong kho riêng có UUID được theo dõi, đánh dấu deleted_at, thu hồi quyền tải và ghi audit. Giao diện hiện ngày hết hạn tải file gốc; giữ dòng lịch sử sau khi file bị xóa.

Quy tắc này thay thế đề xuất giữ 30 ngày sau ngày sử dụng. File gốc đã gửi dưới dạng đính kèm vẫn nằm trong email khách sau khi bản trên server hết hạn.
