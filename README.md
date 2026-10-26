# JinGo

Nền dự án website bán vé/tour, POS và CTV. Đây là scaffold phát triển, chưa phải hệ thống bán hàng thật.

## Chạy local

Yêu cầu Node.js >=22 và npm. Tại thư mục gốc:

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
- Swagger (development): http://localhost:4000/api/docs
- Products: http://localhost:4000/api/v1/products

Web và API mẫu chưa cần PostgreSQL/Redis. Worker cần Redis; cấu hình REDIS_URL trong môi trường shell trước khi chạy `npm run dev:worker`. File `.env` gốc dùng cho Docker Compose; lệnh Node local không tự đọc file đó.

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

Compose mặc định chỉ publish web ở loopback 3100, không chiếm 80/443 của JinHunt, không public database/Redis. API/DB/Redis có healthcheck; `/health` hiện chỉ phản ánh API sống, chưa phải readiness kết nối DB. Các giới hạn RAM là mức khởi đầu, cần đo khi chạy cùng JinHunt.

Image nền hiện chứa cả ba workspace và công cụ build để đơn giản giai đoạn đầu. Trước production thật sẽ tách image gọn, build trên CI và deploy theo tag cố định. Không chạy site công khai để nhận thanh toán trước khi hoàn thành authentication, database, booking, payment, kho vé, backup và kiểm tra bảo mật.

## Sao lưu

Volume Docker không phải backup. Trước khi có dữ liệu thật cần lập lịch pg_dump, backup file vé riêng tư, lưu ngoài server và thử restore. Không chạy `docker compose down -v` trên môi trường có dữ liệu cần giữ.

Xem [kiến trúc và tiến độ](docs/ARCHITECTURE.md).
