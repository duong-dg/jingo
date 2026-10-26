# JinGo

Website bán vé/tour và quản trị sản phẩm. Phiên bản 0.4 thêm ảnh sản phẩm, thư viện ảnh, loại sản phẩm tùy chỉnh và CMS blog. Giữ nguyên luồng yêu cầu đặt, tra cứu, thu chuyển khoản thủ công và giao mã vé. Chưa có cổng thanh toán, công nợ, POS, kho file vé riêng tư hoặc hoàn tiền.

## Ảnh, loại sản phẩm và blog (0.4)

- `/admin`: tab Hình ảnh cho ảnh đại diện và tối đa 20 ảnh thông tin, sắp xếp thứ tự và mô tả alt. Tab Nội dung soạn quyền lợi/lịch trình/thông tin bằng trình định dạng có chèn ảnh. Trang chi tiết có gallery phóng lớn; danh sách hiển thị ảnh đại diện.
- `/admin/loai-san-pham`: tạo/sửa loại như vé cáp treo, show diễn, tour đảo. Loại có tên/URL riêng, nhưng cách xử lý đặt vẫn chọn TICKET hoặc TOUR. Loại đang có sản phẩm không được lưu trữ để tránh đứt liên kết.
- `/admin/bai-viet`: soạn thảo định dạng, ảnh bìa/ảnh trong bài, chuyên mục, tác giả, giới thiệu, sản phẩm liên quan, SEO, nháp và hẹn giờ theo giờ Việt Nam. Có ô nhập bản dịch tiếng Anh dạng nháp; chưa có route tiếng Anh/auto dịch hoặc workflow WPML hoàn chỉnh.
- `/cam-nang` và `/cam-nang/[slug]`: danh sách, chuyên mục, bài viết, mục lục từ H2/H3, thời gian đọc, khối vé liên quan lấy tên/giá hiện tại. Bài nháp và bài chưa đến giờ không xuất hiện ở API/trang công khai hoặc sitemap.
- `/loai/[slug]`: trang nhóm sản phẩm; trang chủ có các nút nhóm. Đổi URL sản phẩm, bài viết hoặc loại sẽ lưu alias theo ID, trang web chuyển hướng 308 tới URL hiện tại; không tạo chuỗi chuyển hướng.

Ảnh upload chỉ nhận JPG, PNG, WebP thật, tối đa 5 MB và 25 triệu điểm ảnh. Server kiểm tra chữ ký file, giải mã, bỏ metadata, resize tối đa 1920px và chuyển WebP. Thư viện dùng cho ảnh giới thiệu **công khai**, không dùng chứa mã vé riêng của khách. Nội dung HTML được lọc phía server; ảnh trong nội dung chỉ lấy từ thư viện này.

File nằm trong Docker volume `jingo_media_data` gắn tại `/app/data/media` của API, metadata nằm ở PostgreSQL. Rebuild/recreate container giữ nguyên ảnh. Phải sao lưu cả volume ảnh lẫn database; chỉ sao lưu database không đủ phục hồi ảnh. Không chạy `docker compose down -v` để cập nhật. Local dev ghi vào `apps/api/data/media` (đã gitignore), hoặc đặt MEDIA_DIR trong `.env`.

Nếu upload báo 413 khi dùng Nginx/OpenResty/Nginx Proxy Manager, cấu hình `client_max_body_size 8m;` cho riêng domain JinGo trong reverse proxy, rồi kiểm tra/reload proxy. API vẫn giữ giới hạn file 5 MB. Không thay cấu hình proxy của JinHunt.

SEO có title/description, canonical, Open Graph, BlogPosting, sitemap và robots. Mặc định `SEO_INDEXING=false` để không index nội dung mẫu. Khi domain và nội dung thật sẵn sàng, thêm `SEO_INDEXING=true` vào `.env`, rồi `docker compose up -d web`. Xem `/robots.txt` và `/sitemap.xml`; admin, API nghiệp vụ, checkout và tra cứu không index. Riêng ảnh công khai được cho phép crawl. Các chức năng này không bảo đảm thứ hạng tìm kiếm.

Sau cập nhật, health phải hiện `0.4.0`. Không có dữ liệu mẫu mới ghi đè sản phẩm/đơn cũ. Hai loại mặc định được bổ sung nếu thiếu. Kiểm tra upload, lưu sản phẩm, bài nháp/hẹn giờ, đổi URL và ảnh sau restart trên Ubuntu trước khi vận hành rộng. Backup/restore PostgreSQL và volume ảnh chưa được chạy trên server của bạn.

## Luồng đặt vé và xử lý đơn (0.3)

1. Admin cấu hình sản phẩm thật, giá và điều kiện; bỏ chọn “Sản phẩm minh họa” khi sẵn sàng nhận yêu cầu. Vé mẫu không nhận đơn kể cả gọi API trực tiếp.
2. Khách chọn ngày/gói/nhóm khách, điền liên hệ và gửi yêu cầu. Server tính lại giá, kiểm tra ngày khóa, ngày đã qua và sản phẩm xuất bản. Đây là yêu cầu chờ kiểm tra, không giữ tồn/chỗ tự động.
3. Khách nhận mã đơn và link tra cứu có khóa riêng. Khóa nằm trong fragment URL, không gửi trong query string/log request; API chỉ lưu hash. Khách cần lưu link, chưa có gửi email/SMS tự động hoặc khôi phục khóa bằng OTP.
4. Vào `/admin/don-hang`, mở đơn, xác nhận sau khi có nguồn vé/chỗ. Nhập hướng dẫn công khai cho khách gồm quyền lợi, chính sách áp dụng và thông tin chuyển khoản thực tế; ghi chú nội bộ được lưu riêng.
5. Đối chiếu ngân hàng, nhập đúng tổng tiền và mã giao dịch để xác nhận thu đủ tiền. Đây là ghi sổ thủ công, không phải API ngân hàng. Chưa hỗ trợ thiếu/thừa tiền hoặc nhiều lần thanh toán. Mã giao dịch không được dùng lại cho đơn khác.
6. Giao từng mã nhà cung cấp hoặc voucher tour, nhập số khách mã đó áp dụng và hướng dẫn. Có thể giao từng phần; tổng số khách đã giao không vượt đơn. Mã vé đã giao không được cấp trùng. Khách bấm cập nhật trên trang tra cứu để nhận mã.
7. Chỉ hủy trực tiếp yêu cầu chưa thu tiền. Đơn đã thu tiền cần quy trình hoàn tiền riêng, hiện thao tác hủy bị chặn để không làm mất dấu khoản thu.

Giá/tên gói/điều kiện lúc đặt được lưu snapshot; sửa giá sau không thay đổi đơn cũ. Phiên bản đơn chống ghi đè, request ID chống tạo đơn/ghi thu/giao vé trùng khi retry; sổ thu, thao tác và audit cập nhật trong transaction. Trình duyệt lưu khóa idempotency và hash payload trong sessionStorage để retry sau lỗi mạng, không lưu thông tin liên hệ trong cache này.

Trang đơn hiển thị 200 đơn gần nhất; tổng đã thu trên màn hình chỉ tính danh sách đó, chưa phải báo cáo doanh thu đầy đủ. Chưa có giao file vé PDF/ảnh riêng tư, QR tự sinh, hạn mức tồn, xác nhận từ API đối tác, thông báo tự động, refund hoặc đối soát ngân hàng. Người giữ link tra cứu có quyền xem mã vé nên không chia sẻ công khai.

Sau khi cập nhật container, `/api/v1/health` phải trả version `0.4.0`. Trên Ubuntu cần kiểm tra trọn luồng bằng một sản phẩm thử riêng và thông tin thử, không dùng giao dịch ngân hàng thật để thử phần mềm. Bộ test local dùng pg-mem; chưa thay thế kiểm tra transaction/concurrency và backup trên PostgreSQL thật.

## Cập nhật trên Ubuntu đã chạy bản cũ

Sao lưu database và giữ bản `.env` trước khi cập nhật. Nếu bạn đã sửa dòng `ports` trong compose.yaml để NAT cổng 3100, giữ lại thay đổi đó khi pull. Nên đặt tùy chỉnh triển khai trong file override riêng hoặc dùng reverse proxy hiện tại.

```bash
git pull --ff-only
nano .env
```

Thêm tài khoản admin của bạn và đặt PUBLIC_BASE_URL chính xác bằng URL dùng để mở web (gồm http/https và cổng nếu có):

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YOUR_OWN_LONG_RANDOM_PASSWORD
PUBLIC_BASE_URL=https://your-domain.example
```

Mật khẩu ít nhất 12 ký tự, không dùng giá trị minh họa trên. Nếu chứa ký tự đặc biệt của dotenv/Compose thì đặt trong dấu nháy đơn. ADMIN_PASSWORD tạo tài khoản lần đầu, không đổi mật khẩu tài khoản đã tồn tại. Không có tài khoản mặc định và không có đăng ký công khai. Có thể bỏ ADMIN_PASSWORD khỏi `.env` sau khi tạo tài khoản thành công; tài khoản và phiên lưu trong PostgreSQL. Giữ bảo mật file `.env`.

```bash
docker compose up -d --build
docker compose logs --tail=80 api
```

Mở `https://your-domain.example/admin`, đăng nhập bằng tài khoản đã thiết lập. API tự tạo bảng và nhập ba sản phẩm mẫu một lần; khởi động lại không ghi đè dữ liệu đã sửa. Có thể chuyển sản phẩm mẫu sang nháp và tạo sản phẩm thật. Nếu gặp lỗi nguồn yêu cầu, kiểm tra PUBLIC_BASE_URL và recreate API bằng `docker compose up -d`.

Admin hỗ trợ sản phẩm/ảnh/nội dung/giá/lịch khóa, loại sản phẩm, blog, SEO, bản dịch nháp và đơn tại `/admin/don-hang`. Chưa có POS hoặc quản lý nhiều nhân viên.

Sau triển khai, kiểm tra đăng nhập, lưu giá, tải lại trang, chặn ngày khóa và restart API để xác minh dữ liệu còn nguyên.

## Chạy local

Yêu cầu Node.js >=22, npm và PostgreSQL. Copy `.env.example` thành `.env`, thiết lập DATABASE_URL cùng ADMIN_EMAIL/ADMIN_PASSWORD; local web dùng PUBLIC_BASE_URL=http://localhost:3000. API đọc `.env` gốc khi chạy dev.

Nếu có Docker và chưa có PostgreSQL local:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres redis
```

Tại thư mục gốc:

```powershell
npm ci
npm run dev:api
```

Mở terminal thứ hai:

```powershell
npm run dev:web
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/v1/health
- Admin: http://localhost:3000/admin
- Swagger (development): http://localhost:4000/api/docs
- Products: http://localhost:4000/api/v1/products

API cần PostgreSQL; không có chế độ lưu giả thay cho database trong production. Worker cần Redis; cấu hình REDIS_URL trong shell trước khi chạy `npm run dev:worker`. Bộ kiểm thử dùng pg-mem tách biệt dữ liệu thật; không thay thế kiểm tra triển khai PostgreSQL trên Ubuntu.

```powershell
npm test
npm run typecheck
npm run build
```

## Ubuntu chạy cạnh JinHunt

1. Kiểm tra dịch vụ hiện có, RAM trống, dung lượng và cổng 3100 trước khi triển khai; không cài lại server.
2. Cài Docker Engine và Compose plugin; chuyển source và lockfile lên server.
3. `cp .env.example .env`, đặt mật khẩu PostgreSQL ngẫu nhiên mạnh. Trong giai đoạn scaffold, dùng ký tự URL-safe cho mật khẩu để tránh sai DATABASE_URL. Đặt PUBLIC_BASE_URL theo domain.
4. `docker compose config --quiet` rồi `docker compose up -d --build`.
5. Reverse proxy hiện tại trỏ domain JinGo đến `127.0.0.1:3100` nếu proxy chạy trên host. Nếu proxy ở container, nối thêm mạng dùng chung và trỏ `web:3000` bằng alias riêng, không dùng localhost của container proxy.
6. Chỉ dùng `docker compose -f compose.yaml -f compose.edge.yaml up -d --build` khi chưa có dịch vụ dùng cổng 80/443; đặt SITE_ADDRESS thành domain để Caddy cấp HTTPS.

Compose mặc định chỉ publish web ở loopback 3100, không chiếm 80/443 của JinHunt, không public database/Redis. API chỉ bắt đầu phục vụ sau khi khởi tạo database thành công; `/health` phản ánh tiến trình sống, chưa theo dõi DB mất kết nối sau khởi động. Các giới hạn RAM là mức khởi đầu, cần đo khi chạy cùng JinHunt.

Image nền hiện chứa cả ba workspace và công cụ build để đơn giản giai đoạn đầu. Trước vận hành rộng sẽ tách image gọn, build trên CI và deploy theo tag cố định. Luồng hiện tại cần người vận hành kiểm tra nguồn vé, ngân hàng và mã đã giao; chuẩn bị backup, kiểm tra bảo mật và chạy thử PostgreSQL thật trước khi dùng dữ liệu kinh doanh.

## Sao lưu

Volume Docker không phải backup. Trước khi có dữ liệu thật cần lập lịch pg_dump, backup file vé riêng tư, lưu ngoài server và thử restore. Không chạy `docker compose down -v` trên môi trường có dữ liệu cần giữ.

Xem [kiến trúc và tiến độ](docs/ARCHITECTURE.md).
