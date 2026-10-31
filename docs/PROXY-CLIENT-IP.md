# IP khách và giới hạn truy cập qua NPM

JinGo nhận IP khách từ Nginx Proxy Manager khi hai header `X-Jingo-Edge-Secret` và `X-Jingo-Client-IP` hợp lệ. Secret dùng tên biến cũ `ADMIN_PROXY_SECRET` để tương thích phần nhật ký đăng nhập đã có. Không dùng `trust proxy=true`, X-Forwarded-For hay X-Real-IP làm nguồn tin độc lập.

## Trên máy JinGo

1. Cập nhật mã và build API. Nếu `.env` đã có `ADMIN_PROXY_SECRET` ngẫu nhiên từ bước nhật ký đăng nhập, dùng lại giá trị đó. Không gửi secret vào chat/log/Git.
2. Nếu chưa có, chạy `openssl rand -hex 32`, thêm `ADMIN_PROXY_SECRET=<giá trị vừa tạo>` vào `.env`. Khác với khóa SePay/SMTP. Không chạy file `.conf` như lệnh shell.
3. Recreate API để nhận biến mới; compose đã có sẵn mapping ADMIN_PROXY_SECRET:

```bash
cd ~/jingo
git pull --ff-only
sudo docker compose --progress plain build api
sudo docker compose up -d --force-recreate web api worker
```

Nếu giữ nguyên secret thì chỉ cần cập nhật/build như thường. Chỉ sửa NPM mà chưa có biến trong API sẽ không kích hoạt việc tin IP khách.

## Trên Nginx Proxy Manager

Mở Proxy Hosts → jingo.io.vn → Advanced / Custom Nginx Configuration.

1. Sao chép nội dung `deploy/nginx/client-ip.conf` (xem bằng `cat deploy/nginx/client-ip.conf` trên máy JinGo).
2. Thay `CHANGE_ME_WITH_64_RANDOM_HEX` bằng **đúng cùng ADMIN_PROXY_SECRET**. Giữ upstream `172.16.150.171:3100`, sửa nếu địa chỉ máy JinGo thay đổi.
3. Giữ nguyên block whitelist SePay hiện có. Block mới là prefix `location /api/`, **không thêm `^~`**, nên block regex SePay vẫn có hiệu lực. Không thay toàn bộ Advanced bằng file này và không thêm một `location /api/` thứ hai nếu đã có: gộp vào block cũ.
4. Nếu còn block admin-only từ `admin-ip-metadata.conf`, có thể bỏ block admin-only đó vì `/api/` mới đã bao gồm admin. Nếu giữ thì phải có cùng secret và cùng `$realip_remote_addr`. Không sửa block SePay để làm việc này.
5. Save, kiểm tra host Online. Trên **proxyserver**, không phải JinGo:

```bash
sudo docker exec proxy-app-1 nginx -t
```

File trong repo chỉ là mẫu; git pull không tự sửa cấu hình NPM. Code và NPM đều cần được cập nhật. Nếu cấu hình NPM lỗi, bỏ block `/api/` vừa thêm để quay về cấu hình cũ; không xóa whitelist SePay.

NPM ghi đè hai header bằng secret của nó và `$realip_remote_addr`, là địa chỉ TCP gốc trước khi real_ip_header có thể bị header khách tác động. Yêu cầu NPM nhận khách trực tiếp qua destination NAT. Nếu có CDN/proxy trung gian hoặc source NAT, địa chỉ này có thể là máy trung gian; phải thiết kế trust chain riêng. Không thay bằng header người ngoài tự gửi. Cổng API/Postgres/Redis không mở ra Internet; cổng web chỉ cho tuyến proxy/mạng quản trị cần thiết theo firewall của hệ thống.

## Hạn mức hiện tại

Các hạn mức sau áp dụng theo IP đã xác thực, cửa sổ 60 giây và từng nhóm trong controller tương ứng:

| Thao tác | Yêu cầu/phút/IP |
|---|---:|
| Tạo đơn lẻ / tạo giỏ | 30 mỗi endpoint |
| Tra cứu đơn lẻ / tra cứu giỏ (bao gồm kiểm tra thanh toán) | 240 mỗi endpoint |
| Tạo yêu cầu thanh toán | 30 |
| Xác nhận PayPal sau khi quay về | 60 |
| SePay OAuth token | 100, ngân sách độc lập |

Tải/list file vé và link nhận vé CTV vẫn giữ hạn mức 100/phút/controller đã có, nay dùng cùng cách xác thực IP. Chúng không sử dụng chung ngân sách đặt vé hoặc kiểm tra thanh toán. Thông báo ngân hàng/IPN/webhook không bị trừ vào ngân sách checkout hay tra cứu; kiểm tra chữ ký, whitelist SePay và chống ghi thu trùng vẫn độc lập.

Khi vượt hạn mức mới, trả 429 kèm `Retry-After` theo giây và `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Tách thao tác giúp tra cứu định kỳ không làm mất lượt đặt vé. Khách dùng chung IP công cộng (cùng mạng/NAT) vẫn chia sẻ hạn mức của IP đó; đây không phải định danh cá nhân.

Header thiếu/sai secret, IP sai định dạng, danh sách nhiều IP hoặc scoped IPv6 không được tin; API dùng IP socket dự phòng. Nếu chưa cấu hình NPM, nhiều khách vẫn có thể chung IP proxy. IPv4-mapped IPv6 và các cách viết cùng địa chỉ IPv6 được chuẩn hóa để không tạo thêm quota. Secret không xuất hiện trong response/journal. Giữ nguyên bảo vệ password/OTP đăng nhập hiện có.

Limiter public dùng bộ nhớ có giới hạn 10.000 khóa/controller và dọn cửa sổ hết hạn; restart reset ngân sách. Thiết kế này dùng cho một API hiện tại, chưa phải limiter phân tán. Khi tăng nhiều API replica phải bổ sung limiter chung/edge. Riêng giới hạn đăng nhập admin vẫn lưu PostgreSQL.

## Kiểm tra sau triển khai

- Đăng nhập admin: nhật ký phải ghi `VERIFIED_PROXY` và IP khách thay vì IP container. Bật định vị IP là lựa chọn riêng, không bắt buộc.
- Gọi thử request tra cứu sai định dạng (không tạo đơn/thu tiền), kiểm tra header giới hạn:

```bash
curl -i -sS -X POST https://jingo.io.vn/api/v1/carts/lookup \
  -H 'Content-Type: application/json' --data '{}'
```

HTTP 400 là bình thường vì body thử không có mã đơn, đồng thời phải thấy `X-RateLimit-Limit: 240`. Dùng hai kết nối Wi-Fi/4G để đối chiếu IP riêng. Tự thay X-Real-IP/X-Forwarded-For/X-Jingo-Client-IP qua NPM không được làm đổi quota; NPM phải ghi đè chúng.

- Thử thanh toán SePay như trước và xem log webhook/OAuth. Whitelist vẫn phải từ chối IP ngoài danh sách, không đưa `/api/` thành block `^~`.
- Kiểm thử tự động: giả header/secret, Unicode header, IPv4/IPv6, cô lập khách/nhóm, hết hạn, bộ nhớ đầy và HTTP thực qua Nest. Không thay thế nghiệm thu NPM đang chạy thật.

Nguồn Nginx: https://nginx.org/en/docs/http/ngx_http_realip_module.html#embedded_variables · https://nginx.org/en/docs/http/ngx_http_core_module.html#location
