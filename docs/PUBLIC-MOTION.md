# Animation giao diện công khai

PublicMotion thêm chuyển động bằng CSS và IntersectionObserver, không thêm dependency. Trang chủ có hiệu ứng mở đầu ở chữ, mặt trời và lớp núi; các khối nội dung/thẻ mới bên dưới màn hình hiện một lần khi cuộn. Thẻ và ảnh có hover nhẹ trên thiết bị có chuột, nút có phản hồi màu/bóng và mũi tên. Header thêm bóng khi cuộn; lịch và menu mobile mở nhanh.

Không áp dụng cho admin, CTV, quầy, checkout/giỏ, tra cứu hoặc trang nhận vé. Không thêm độ trễ cho tăng/giảm số lượng hay gửi đơn. Nội dung SSR luôn hiện khi JavaScript tắt; chỉ khối nằm dưới viewport mới được đánh dấu chờ hiệu ứng. Keyboard focus làm phần tử chờ hiện ngay. prefers-reduced-motion tắt hiệu ứng và bỏ đánh dấu chờ, kể cả khi thay đổi tùy chọn trong lúc đang mở trang. Observer, listener và requestAnimationFrame được dọn khi đổi trang. Không có animation chạy lặp vô hạn hoặc parallax theo con trỏ.

Kiểm tra bằng build web, trang mẫu local trên viewport desktop 1440px và mobile 319/390px: không tràn ngang, thẻ hiện đầy đủ sau khi cuộn, console không báo lỗi. Chế độ giảm chuyển động có CSS fallback và listener tự dọn nội dung chờ; không cần thư viện chuyển động hoặc dịch vụ bên ngoài.
