# SEO trang chủ và bản dịch blog

Admin → Cài đặt → SEO trang chủ (`/admin/seo`) quản lý tiêu đề, mô tả Việt/Anh và ảnh chia sẻ trang chủ. Cấu hình lưu trong `jingo_settings`, yêu cầu admin/CSRF, kiểm tra version và ảnh từ thư viện media. API công khai chỉ trả dữ liệu metadata, không trả thông tin tài khoản hay khóa.

Trang `/` và `/en` dùng tiêu đề absolute để tránh lặp hậu tố JinGo, description, canonical và hreflang/x-default riêng, Open Graph, Twitter summary_large_image và JSON-LD Organization/WebSite. `PUBLIC_BASE_URL` phải là domain HTTPS chính thức. `SEO_INDEXING=true` là công tắc mở lập chỉ mục hiện có; cấu hình SEO mới không tự mở indexing trên dữ liệu mẫu. Robots/sitemap và các trang admin/đặt vé/tra cứu giữ quy tắc hiện tại.

Favicon `/icon.svg` dùng chữ J, nền xanh và mũi tên cam. `/apple-icon` cung cấp PNG 180×180. `/share/home` cung cấp ảnh PNG JinGo 1200×630 khi chưa chọn ảnh chia sẻ. Các hình này được tạo bằng SVG/Next ImageResponse, không gọi dịch vụ ngoài.

Bài blog tiếng Anh độc lập với việc lưu nội dung Việt: giữ nguyên bản Anh đã lưu dù đổi tiêu đề, nội dung, chuyên mục hoặc SEO Việt. Form nguồn không ghi đè bản Anh; thao tác dịch tại phần dịch cũ hoặc trang Ngôn ngữ & bản dịch mới thay đổi nó. Bản Anh trước đây tự bị gắn NEEDS_REVIEW được xem là đã xuất bản trở lại; bản DRAFT do người dùng chọn vẫn ẩn. Bài nguồn chưa xuất bản/thùng rác vẫn ẩn cả hai ngôn ngữ. Quy trình khôi phục phiên bản thành nháp vẫn cần kiểm tra trước khi xuất bản. Vé/tour và loại sản phẩm giữ cơ chế rà soát bản dịch khi nguồn đổi.

Kiểm tra: thay nguồn blog và thử gửi bản Anh cũ từ form nguồn không làm đổi nội dung/status Anh; phần dịch vẫn sửa/gỡ được. SEO API kiểm tra xác thực, CSRF, version và ảnh. Metadata hai ngôn ngữ, title/canonical/share/schema được kiểm tra; favicon/PNG chia sẻ và Apple icon được render bằng web build local.


## Ảnh và nội dung khi dán link lên mạng xã hội

Các trang công khai (vé, blog, điểm đến, trang nội dung/liên hệ và các trang danh sách) cung cấp Open Graph và Twitter card. Thứ tự ảnh: ảnh bìa riêng → ảnh trong SEO trang chủ → `/share/home` PNG 1200×630. Tiêu đề và mô tả dùng bản dịch hiện tại của trang. Chỉnh ảnh/mô tả riêng tại trang tương ứng; ảnh dùng chung tại Cài đặt → SEO trang chủ.

Ảnh media dành cho chia sẻ dùng `/api/v1/media/:id/share.jpg`, JPEG 1200×630, giữ đủ ảnh trên nền sáng thay vì cắt mất nội dung. Bản WebP hiển thị trên website giữ nguyên. JPEG được tạo từ UUID có sẵn trong thư viện, cache trong MEDIA_DIR và trả cache immutable; không nhận URL tùy ý, không gửi ảnh ra dịch vụ khác. Tối đa hai chuyển đổi cùng lúc mỗi tiến trình API; các yêu cầu cùng ảnh dùng chung tác vụ.

Next htmlLimitedBots giữ danh sách mặc định và thêm Zalo/Telegram/Facebot/meta-externalagent/Pinterest để metadata nằm trong head ban đầu, tránh bot bỏ qua metadata stream ở cuối body. robots.txt cho phép các bot chia sẻ đọc trang công khai và ảnh ngay cả khi SEO_INDEXING chưa bật; các khu vực quản trị, API (ngoại trừ media), quầy, CTV, giỏ/đặt vé và tra cứu vẫn bị disallow. Công tắc Google/search indexing không tự bật vì yêu cầu sửa preview.

Kiểm tra triển khai: PUBLIC_BASE_URL là domain HTTPS chính thức; HTML với User-Agent Zalo/1.0, facebookexternalhit/1.1 và TelegramBot phải có og:title/og:description/og:image trong head; URL ảnh trả 200 image/jpeg hoặc image/png, không cần đăng nhập. Build production local đã kiểm tra 18 tổ hợp bot/trang, PNG mặc định và robots.txt; API kiểm tra JPEG cùng lúc/cache/UUID không tồn tại. Kết quả hiển thị cuối cùng còn do mạng xã hội và cache của họ. Sau khi cập nhật, có thể cần yêu cầu lấy lại link qua công cụ debug của mạng xã hội hoặc gửi lại link; bài đăng cũ không tự được thay hình ngay.
