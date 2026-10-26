# JinGo

Website bán vé/tour và quản trị sản phẩm. Đã có đăng nhập admin, dữ liệu PostgreSQL, gói vé, giá theo nhóm khách/lịch, khóa ngày và popup chọn vé. Đơn hàng, thanh toán, kho/giao vé, POS, công nợ và CMS blog vẫn đang phát triển; chưa nhận giao dịch thật.

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

Admin hiện hỗ trợ: tạo/sửa/ẩn sản phẩm, hạng vé và giá từng nhóm, điều kiện tuổi/chiều cao, lịch giá và ngày khóa, xem giá đã lưu cho sản phẩm xuất bản, SEO cơ bản, lưu nháp bản dịch tiếng Anh. Chưa có upload ảnh, blog, đơn hàng hoặc quản lý nhiều nhân viên.

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

Image nền hiện chứa cả ba workspace và công cụ build để đơn giản giai đoạn đầu. Trước production thật sẽ tách image gọn, build trên CI và deploy theo tag cố định. Không mở nhận thanh toán trước khi hoàn thành booking, payment, kho vé, backup và kiểm tra bảo mật.

## Sao lưu

Volume Docker không phải backup. Trước khi có dữ liệu thật cần lập lịch pg_dump, backup file vé riêng tư, lưu ngoài server và thử restore. Không chạy `docker compose down -v` trên môi trường có dữ liệu cần giữ.

Xem [kiến trúc và tiến độ](docs/ARCHITECTURE.md).
