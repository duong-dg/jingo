# SEO trang chủ và bản dịch blog

Admin → Cài đặt → SEO trang chủ (`/admin/seo`) quản lý tiêu đề, mô tả Việt/Anh và ảnh chia sẻ trang chủ. Cấu hình lưu trong `jingo_settings`, yêu cầu admin/CSRF, kiểm tra version và ảnh từ thư viện media. API công khai chỉ trả dữ liệu metadata, không trả thông tin tài khoản hay khóa.

Trang `/` và `/en` dùng tiêu đề absolute để tránh lặp hậu tố JinGo, description, canonical và hreflang/x-default riêng, Open Graph, Twitter summary_large_image và JSON-LD Organization/WebSite. `PUBLIC_BASE_URL` phải là domain HTTPS chính thức. `SEO_INDEXING=true` là công tắc mở lập chỉ mục hiện có; cấu hình SEO mới không tự mở indexing trên dữ liệu mẫu. Robots/sitemap và các trang admin/đặt vé/tra cứu giữ quy tắc hiện tại.

Favicon `/icon.svg` dùng chữ J, nền xanh và mũi tên cam. `/apple-icon` cung cấp PNG 180×180. `/share/home` cung cấp ảnh PNG JinGo 1200×630 khi chưa chọn ảnh chia sẻ. Các hình này được tạo bằng SVG/Next ImageResponse, không gọi dịch vụ ngoài.

Bài blog tiếng Anh độc lập với việc lưu nội dung Việt: giữ nguyên bản Anh đã lưu dù đổi tiêu đề, nội dung, chuyên mục hoặc SEO Việt. Form nguồn không ghi đè bản Anh; thao tác dịch tại phần dịch cũ hoặc trang Ngôn ngữ & bản dịch mới thay đổi nó. Bản Anh trước đây tự bị gắn NEEDS_REVIEW được xem là đã xuất bản trở lại; bản DRAFT do người dùng chọn vẫn ẩn. Bài nguồn chưa xuất bản/thùng rác vẫn ẩn cả hai ngôn ngữ. Quy trình khôi phục phiên bản thành nháp vẫn cần kiểm tra trước khi xuất bản. Vé/tour và loại sản phẩm giữ cơ chế rà soát bản dịch khi nguồn đổi.

Kiểm tra: thay nguồn blog và thử gửi bản Anh cũ từ form nguồn không làm đổi nội dung/status Anh; phần dịch vẫn sửa/gỡ được. SEO API kiểm tra xác thực, CSRF, version và ảnh. Metadata hai ngôn ngữ, title/canonical/share/schema được kiểm tra; favicon/PNG chia sẻ và Apple icon được render bằng web build local.
