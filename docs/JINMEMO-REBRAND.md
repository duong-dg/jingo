# Chuyển bản test sang JinMemo

Nhánh triển khai: `codex/jinmemo-rebrand`. Domain đã đăng ký: `jinmemo.com`.

Code đổi nhận diện thành JinMemo trên website Việt/Anh, admin, quầy, CTV, email, vé PDF, trang in, metadata và ảnh chia sẻ mặc định. Wordmark tạm là `jinmemo`, giữ màu xanh/cam hiện có; icon chuyển thành J với các nét ghi chú và apple icon Jm. Không cần chờ thiết kế logo mới để thử hệ thống.

## Dữ liệu giữ lại

Không đổi tên database, bảng, Docker project/volume, npm workspace, cookie, header bảo mật, khóa mã hóa, mã đơn/QR hoặc localStorage. Đặc biệt không tạo database/volume `jinmemo` thay thế `jingo` và không chạy `docker compose down -v`.

Migration `jinmemo_brand_v1` chỉ cập nhật tên JinGo trong title/description của SEO trang chủ, tên gửi SMTP nếu đang đúng `JinGo`, và nội dung nhận diện ở trang liên hệ mặc định. Có transaction/lock và chỉ chạy một lần. Không thay đổi sản phẩm, giá, bài blog, bản dịch sản phẩm/bài viết, slug, ảnh, đơn hàng hay thông tin khách. Vì vậy 4 sản phẩm giá chuẩn và 3 bài blog hiện có được giữ nguyên. Không xóa đơn test.

Email gửi thực tế, tài khoản SMTP, mật khẩu và email liên hệ vẫn giữ nguyên cho tới khi bạn tạo và xác nhận mailbox mới. `support@jinmemo.com` không tự tồn tại chỉ vì mua domain. Thay tại Admin → Trang → Liên hệ và Cài đặt → Email & SMTP khi mailbox đã hoạt động. Ảnh SEO tùy chỉnh đã lưu vẫn giữ nguyên: nếu ảnh có logo JinGo, thay trong Admin → Cài đặt → SEO trang chủ hoặc bỏ ảnh tùy chỉnh để dùng ảnh mặc định mới.

## Cập nhật trên Ubuntu

Tạo bản sao database/media trước, dùng bộ sao lưu nếu đã cài. Nếu chưa cài thành công, sao lưu thủ công trước khi triển khai migration; giữ `.env` riêng, không gửi vào chat.

```bash
cd ~/jingo
git status --short
```

Nếu chỉ có `compose.yaml` chỉnh riêng cho server, giữ lại trước khi chuyển nhánh:

```bash
cp compose.yaml "$HOME/jingo-compose-before-jinmemo.yaml"
git stash push -m "server-compose-before-jinmemo" -- compose.yaml
git fetch origin
git switch --track origin/codex/jinmemo-rebrand
git stash pop
```

Nếu nhánh local đã có, dùng `git switch codex/jinmemo-rebrand` rồi `git pull --ff-only`. Chỉ `stash pop` khi bạn thực sự vừa stash. Nếu có conflict, xử lý trước khi build; giữ port web cho NPM và volume backup readonly đang dùng. Không ghi đè `.env` bằng `.env.example`.

Trong `.env`, sửa đúng một giá trị:

```dotenv
PUBLIC_BASE_URL=https://jinmemo.com
```

Giữ `POSTGRES_*`, `DATABASE_URL`, `ADMIN_PROXY_SECRET` và toàn bộ khóa cũ. Bản test tiếp tục `SEO_INDEXING=false` cho tới khi bạn quyết định mở index.

```bash
sudo docker compose config --quiet
sudo docker compose --progress plain build api
sudo docker compose up -d --force-recreate web api worker
sudo docker compose logs --tail=60 api
```

Không cần chuyển thư mục `~/jingo`, tên repo hoặc project Docker. Nhánh này chưa tự merge vào main.

## NPM và thanh toán test

NPM phải có Proxy Host `jinmemo.com`, chứng chỉ HTTPS hợp lệ, upstream JinGo hiện tại. Cấu hình Advanced phải giữ header IP có xác thực và allowlist SePay như host cũ. Nếu có host `www.jinmemo.com`, chuyển hướng về `https://jinmemo.com`; chưa chuyển hướng toàn bộ host cũ trước khi các callback test đã đổi.

URL phía JinMemo được tạo theo `PUBLIC_BASE_URL`; cấu hình bên nhà cung cấp vẫn cần sửa riêng:

- SePay OAuth token: `https://jinmemo.com/api/v1/payments/sepay/oauth/token`
- SePay webhook: `https://jinmemo.com/api/v1/payments/sepay/webhook`
- VNPay return/IPN: sao chép URL mới hiển thị tại Admin → Thanh toán → Cổng thanh toán (bao gồm cổng thẻ nếu dùng).
- PayPal webhook/return: lấy URL từ phần hướng dẫn PayPal trong admin. Không đổi Client ID/Secret chỉ để đổi thương hiệu; cấu hình webhook đúng domain và Webhook ID đúng môi trường.

Không tự bật LIVE, không đổi khóa, không tự xác nhận tiền. Không redirect POST webhook từ domain cũ để thay cho cấu hình provider. Sau khi provider đã gọi domain mới, đối chiếu log NPM, OAuth 200 và kết quả đối soát/đơn test thực sự cập nhật.

## Kiểm tra sau khi cập nhật

1. Trang chủ và tiếng Anh hiển thị JinMemo; menu mobile không tràn; favicon/ảnh chia sẻ mới (trình duyệt và mạng xã hội có thể cache ảnh cũ).
2. 4 sản phẩm, giá/ngày/gói và 3 bài blog vẫn đủ, slug/ảnh/bản dịch không đổi. SEO trang chủ đã đổi tên; nội dung tự viết trong bài không bị sửa hàng loạt.
3. Đăng nhập lại trên domain mới (cookie khác domain), OTP/email thử nhận được. Quầy và CTV vẫn có quyền đúng.
4. Tạo đơn test, thử thanh toán TEST, webhook đối soát đúng và khách thấy trạng thái mới. URL trong email trỏ `jinmemo.com`.
5. Xuất một vé PDF/in quầy mới mang JinMemo, QR đối tác vẫn quét/giải mã cùng payload. File PDF đã tạo trước đó vẫn là file cũ; không tự tái tạo hoặc sửa QR trong kho.
6. Kiểm tra HTTPS, các link chia sẻ và backup vẫn hoạt động. Khi sẵn sàng mới thiết lập 301 từng đường dẫn domain cũ sang domain mới và cập nhật Search Console.

Không có quyền SSH/NPM/DNS trong repository: việc đổi `.env`, NPM, hộp thư và cấu hình provider phải thực hiện trên server/tài khoản của bạn. Code đã chuẩn bị nhưng không chứng minh server đã được cập nhật.
