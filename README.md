# JinGo

Website bán vé/tour với cây điểm đến, tìm kiếm/bộ lọc, quầy bán và in phiếu, báo cáo doanh thu–công nợ. Giữ chọn vé trực tiếp, suất giờ, email/SMTP, CTV, giá cấp, ảnh, loại sản phẩm và CMS blog. Đặt vé xác nhận ngay, thu thủ công bằng tiền mặt/chuyển khoản và giao mã qua email/link tra cứu. Chưa có cổng thanh toán, kho file vé riêng tư hoặc hoàn tiền.


## Giá bán trực tiếp cho CTV và thùng rác đơn hàng (0.8)

- /admin/nhom-gia: bảng giá mới mặc định DIRECT. Chọn sản phẩm / gói, nhập thẳng giá bán cho CTV cho người lớn, trẻ em, người cao tuổi. Không cần nhập chiết khấu. Để trống là chưa cấp giá, 0 là miễn phí; giá theo ngày/mùa là tùy chọn mở rộng.
- DIRECT không tự giảm hoặc lấy giá lẻ khi thiếu giá. Catalog CTV chỉ hiển thị gói/nhóm khách đã được cấp giá; server chặn nếu ngày sử dụng chưa có giá. Giá bán lẻ thay đổi không đổi giá DIRECT. Đơn cũ giữ snapshot giá đã đặt.
- Bảng giá cũ vẫn dùng công thức cũ để không đổi giá đang bán. Có nút chuyển sang nhập trực tiếp; nhập đủ giá cần bán rồi lưu. CTV cùng nhóm vẫn dùng chung bảng giá.
- /admin/don-hang: mở đơn để Xóa đơn hàng (chưa thanh toán) hoặc Lưu trữ đơn hàng (đã thu/ghi nợ). Thao tác đưa vào Thùng rác / lưu trữ, không xóa vĩnh viễn dữ liệu. Có nút Khôi phục đơn.
- Xóa đơn chưa thanh toán đồng thời hủy đơn và gửi thông báo hủy nếu có SMTP/khóa email. Khôi phục chỉ đưa về danh sách, không tự mở lại đơn đã hủy. Đơn đã thanh toán/ghi công nợ không bị đổi tiền, nợ hoặc vé đã giao; khách vẫn xem được vé, CTV vẫn xem lịch sử của họ.
- Đơn đang lưu trữ không nhận thêm thao tác xử lý cho tới khi admin khôi phục. Version, request ID và audit bảo vệ retry và thay đổi đồng thời. Tổng thu trong danh sách chỉ tính danh sách đang xem; chưa phải báo cáo hợp nhất toàn hệ thống.

Cập nhật tự tạo bảng lưu trữ; không xóa hoặc đổi trạng thái các đơn cũ khi khởi động. Bộ test kiểm tra giá trực tiếp, thiếu giá, giá 0, xóa/khôi phục, quyền admin, giữ vé/khoản thu/công nợ.

## Đặt vé và xác nhận ngay (0.7.2)

Khách bấm Đặt vé là tạo đơn CONFIRMED / UNPAID ngay, nhận thông báo thành công và email xác nhận nếu bật SMTP. Không cần bước admin xác nhận nguồn vé; không còn checkbox chờ kiểm tra ở form. Xác nhận đặt vé không đánh dấu đã thu tiền hoặc đã xuất vé. Giá, ngày khóa, giờ ngừng bán, email và chống trùng vẫn kiểm tra server.

Admin có thể thu tiền/ghi công nợ ngay từ đơn mới; Gửi / cập nhật hướng dẫn là thao tác tùy chọn, có audit và email. Giao mã vẫn yêu cầu PAID hoặc CREDIT, sau đó email báo khách mở link nhận vé. Đơn cũ REQUESTED giữ nguyên, có thao tác Tiếp nhận đơn cũ; không tự đổi dữ liệu hoặc khoản thu cũ. CTV cũng đặt ngay và dùng hạn mức được cấp mà không cần chờ bước xác nhận nguồn.

Kiểm thử bổ sung luồng thu tiền rồi giao vé trực tiếp từ đơn mới version 1, không qua CONFIRM hoặc INSTRUCTIONS; vẫn chặn giao vé trước khi thu/ghi nợ, kiểm tra sai số tiền và chống ghi thu trùng.

## Chỉnh giao diện chọn vé (0.7.1)

Tên nhóm khách và giá cùng dòng, giá màu cam và khoảng cách thu gọn. Bỏ câu điều kiện mặc định; điều kiện thực tế do admin nhập vẫn hiển thị. Một suất giờ tự chọn, ẩn bộ chọn và dòng giờ trên checkout; nhiều suất vẫn cho chọn. Thông tin giờ luôn giữ trong snapshot và email, cutoff server không thay đổi. Đơn cũ chưa có cờ hiển thị vẫn giữ dòng giờ khi tra cứu. Cấu hình suất giờ chuyển sang Lịch bán, có áp dụng chung hoặc từng gói; dữ liệu gói/giá cũ được giữ nguyên.

## Chọn vé, suất giờ và email (0.7)

- Trang vé hiện sẵn ngày, gói, giá người lớn/trẻ em/người cao tuổi và số lượng; không cần mở popup. Menu website sticky, giảm hiệu ứng rê chuột. Admin dùng menu trái trên desktop, menu thu gọn trên điện thoại; không còn hàng tab phân hệ phía trên.
- Admin > Sản phẩm > Lịch bán: cài lịch chung một lần cho mọi gói hoặc riêng từng gói, tối đa 30 suất giờ cho mỗi gói, có giờ bắt đầu và kết thúc tùy chọn. Để trống là dùng cả ngày. Suất lặp theo ngày sử dụng; ngày khóa/lịch giá vẫn áp dụng như cũ. Chưa cấu hình suất riêng từng thứ hoặc chuyến qua đêm.
- Tới đúng giờ bắt đầu (Asia/Ho_Chi_Minh, GMT+7), server chặn báo giá/tạo đơn mới cho suất đó, cả khách lẻ và CTV. Client kiểm tra lại mỗi 15 giây; kiểm tra server lúc tạo đơn là quyết định cuối. Ngày/gói/giờ được lưu cùng snapshot đơn, sửa lịch không đổi đơn cũ.
- Email khách bắt buộc ở form và API đặt vé; CTV dùng email tài khoản của họ. Đơn cũ không có email vẫn xem/xử lý được. Tab English cũ trong sản phẩm/bài viết có trình dịch trực tiếp, đồng bộ cùng trung tâm /admin/ban-dich; lưu nguồn trước khi dịch.
- /admin/smtp: điền máy chủ, cổng, TLS/STARTTLS, tài khoản, mật khẩu ứng dụng, tên và email gửi. Lưu rồi gửi thử đến địa chỉ của bạn; chỉ bật tự động khi đã kiểm tra. Không có thông tin SMTP hoặc dịch vụ email mặc định.
- Email bán lẻ được đưa vào outbox trong cùng transaction với tạo đơn/xác nhận/ghi thu/giao vé/hủy, chứa link tra cứu riêng để khách xem tình trạng và vé mới nhất. Gửi ở API qua bộ xử lý định kỳ 10 giây, không phụ thuộc worker Redis. Lỗi SMTP không làm mất đơn. Đơn CTV không tự gửi giá nhập ra email khách; CTV tiếp tục chia sẻ link nhận vé riêng.
- Outbox tự thử lại với khoảng chờ tăng dần, tối đa 5 lần; admin xem trạng thái và bấm gửi lại nếu thất bại. SENT nghĩa SMTP đã chấp nhận, không đảm bảo vào hộp thư đến. Nếu tiến trình chết sau khi SMTP nhận trước khi đánh dấu SENT, có thể nhận thư trùng; mã đơn/Message-ID giữ nguyên, không phát sinh thu tiền hoặc vé trùng.
- Mật khẩu SMTP và khóa tra cứu cần dùng cho email được mã hóa AES-256-GCM trong DB. Khóa mã hóa nằm ở file ẩn MEDIA_DIR/.smtp-key trong volume ảnh. Sao lưu cả database và toàn bộ volume, gồm file ẩn này; mất khóa thì không giải mã được SMTP/link cũ. Không đưa file này vào Git hoặc thư viện ảnh công khai. Đơn có trước bản 0.7 chưa lưu khóa email sẽ không được tự gửi link qua email.

Bộ test SMTP dùng transport giả, không gửi mail tới người thật. Cần kiểm tra SMTP thật, DNS SPF/DKIM và kết nối cổng gửi trên Ubuntu sau triển khai. Chưa kiểm tra tranh chấp hàng đợi trên PostgreSQL thật tại máy phát triển; bộ test dùng pg-mem với khóa mô phỏng.

## Việt–Anh và trung tâm bản dịch (0.6)

- Vào /admin/ban-dich: lọc vé/tour, bài viết, loại sản phẩm; xem tiếng Việt và nhập tiếng Anh song song. Có trạng thái Chưa dịch, Bản nháp, Cần cập nhật và Đã xuất bản. Bản dịch nháp cũ được giữ lại, cần bổ sung trường mới và duyệt trước khi xuất bản.
- Dịch cả điểm đến, nội dung định dạng, tên gói, điều kiện người lớn/trẻ em/người cao tuổi, chuyên mục và SEO. Giá, lịch bán, tồn và mã vé không nhân bản. Các trường tiền không nằm trong biểu mẫu dịch.
- Lưu nháp/gỡ bản English sẽ ẩn bản tiếng Anh. Muốn xuất bản phải tích xác nhận đã kiểm tra; backend kiểm tra nội dung và đủ gói/điều kiện. Nguồn cũng phải được xuất bản và tới giờ hẹn thì bản dịch mới xuất hiện.
- Website tiếng Việt giữ nguyên URL; /en là trang chủ tiếng Anh, /en/ve/slug, /en/cam-nang/slug và /en/loai/slug dùng chung slug. Menu chuyển ngôn ngữ giữ đúng nội dung; ngày/gói/số khách và khóa tra cứu được giữ khi chuyển ở bước đặt/tra cứu. Biểu mẫu liên hệ chưa gửi không tự sao chép khi đổi ngôn ngữ; hãy chọn ngôn ngữ trước khi điền.
- Nút chọn vé, đặt yêu cầu và tra cứu có giao diện tiếng Anh. Đơn tiếng Anh lưu locale, tên/điều kiện và thông báo chính sách tại lúc đặt. Nội dung hướng dẫn, ghi chú và mã vé do người vận hành/nhà cung cấp nhập được giữ nguyên; admin/CTV và trang nhận vé CTV vẫn tiếng Việt.
- Đổi tên, mô tả, nội dung, SEO, gói hoặc điều kiện nguồn sẽ đánh dấu Cần cập nhật, tạm ẩn tiếng Anh cho tới khi duyệt lại. Chỉ đổi giá không bắt dịch lại. Hash nội dung nguồn và phiên bản thực thể chống ghi đè bản mới trong cửa sổ khác; bản dịch cũ không bị tự ghi đè.
- Bản chưa dịch/nháp/cần cập nhật không xuất hiện ở danh sách, API English, sitemap hoặc hreflang; URL English trực tiếp trả 404. Không tự lấy nội dung tiếng Việt để giả làm bản tiếng Anh. Nội dung đã xuất bản có canonical theo ngôn ngữ, html lang, hreflang VI/EN/x-default và sitemap liên kết.
- Đây là quy trình dịch thủ công theo hướng WPML, chưa phải plugin WPML, chưa có dịch AI, dịch slug riêng, thêm ngôn ngữ tùy ý hay dịch menu/chính sách tùy chỉnh qua admin. Chuỗi giao diện nằm ở dictionary; hiện hỗ trợ vi/en. Chưa kết nối dịch vụ dịch hoặc phát sinh phí dịch.

Không cần biến môi trường hoặc database mới. Nội dung dịch lưu trong JSON của thực thể, dùng chung version/audit; không tạo lại sản phẩm, giá hoặc đơn cũ. Chạy kiểm tra luồng dịch và đặt một đơn thử sau khi cập nhật trên Ubuntu.

## Cộng tác viên và công nợ (0.5)

1. Tạo nhóm giá tại /admin/nhom-gia: giảm theo phần trăm hoặc số tiền trên giá thực tế của ngày đặt. Có thể đặt giá cấp riêng theo sản phẩm, gói, người lớn/trẻ em/người cao tuổi và khoảng ngày; quy tắc ưu tiên cao nhất thay thế mức giảm mặc định, không cộng dồn.
2. Tạo tài khoản tại /admin/ctv, gán nhóm giá và mật khẩu ban đầu ít nhất 12 ký tự. Công nợ mặc định tắt; quản trị viên tự cấp hạn mức và kỳ hạn. Không có đăng ký CTV công khai.
3. CTV đăng nhập /ctv, chỉ thấy giá JinGo cấp, đặt yêu cầu và theo dõi đơn của mình. CTV tự quyết định giá bán lại theo thỏa thuận, hệ thống không thu hoặc lưu giá bán lại.
4. Admin xác nhận nguồn vé. CTV có thể xác nhận dùng hạn mức; hoặc admin đối chiếu chuyển khoản rồi ghi thu đủ tiền như trước. Ghi nợ không phải khoản tiền mặt đã thu.
5. Admin giao mã vé. CTV tạo link /nhan-ve có khóa riêng để gửi khách: chỉ có thông tin trải nghiệm và mã vé, không hiện giá cấp CTV, liên hệ hay ghi chú nội bộ. Người giữ link xem được mã vé; không đăng công khai.
6. Admin ghi trả nợ tại sổ công nợ sau khi đối chiếu ngân hàng. Giao dịch trả nợ phân bổ khoản cũ trước, không cho trả vượt dư nợ và không tạo ví. Mã giao dịch dùng chung toàn hệ thống, không dùng lại giữa thu đơn và trả nợ.

Tài khoản tạm dừng vẫn xem đơn/nợ nhưng không đặt mới hoặc ghi nợ mới; khóa tài khoản chặn đăng nhập. Đổi mật khẩu/khóa thu hồi phiên. Giảm hạn mức hoặc tắt công nợ không xóa nợ cũ. Quá hạn chặn ghi nợ mới; thời điểm đến hạn bằng thời điểm ghi nợ cộng số ngày kỳ hạn, giao diện hiển thị giờ Việt Nam. Đơn đã ghi nợ không được hủy trực tiếp; hoàn tiền/điều chỉnh nợ cần quy trình riêng chưa có trong bản này.

Khóa dòng tài khoản và transaction bảo vệ hạn mức; request ID chống ghi nợ/trả nợ lặp. Bản cập nhật tự bổ sung bảng và nhập mã giao dịch cũ vào danh mục chống trùng, không đặt lại sản phẩm/đơn/ảnh. Tổng thu ở màn hình đơn chỉ tính đơn thanh toán trực tiếp trong danh sách, chưa phải báo cáo hợp nhất cả tiền trả nợ.

Kiểm thử local gồm 17 test, dùng pg-mem. Kiểm tra đồng thời trên PostgreSQL thật là bước riêng chưa chạy tại môi trường này. Chỉ dùng database thử riêng có tên dạng jingo_credit_test, không trỏ vào database vận hành:

```bash
JINGO_TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/jingo_credit_test npm run test:credit-postgres -w @jingo/api
```

Không có biến trên thì test báo SKIP. Chạy kiểm tra này và luồng đơn thử trước khi cấp công nợ thật. POS cho quản trị đã có ở 0.9; chưa tích hợp API kho đối tác hay cổng thanh toán tự động.

## Ảnh, loại sản phẩm và blog (0.4)

- `/admin`: tab Hình ảnh cho ảnh đại diện và tối đa 20 ảnh thông tin, sắp xếp thứ tự và mô tả alt. Tab Nội dung soạn quyền lợi/lịch trình/thông tin bằng trình định dạng có chèn ảnh. Trang chi tiết có gallery phóng lớn; danh sách hiển thị ảnh đại diện.
- `/admin/loai-san-pham`: tạo/sửa loại như vé cáp treo, show diễn, tour đảo. Loại có tên/URL riêng, nhưng cách xử lý đặt vẫn chọn TICKET hoặc TOUR. Loại đang có sản phẩm không được lưu trữ để tránh đứt liên kết.
- `/admin/bai-viet`: soạn thảo định dạng, ảnh bìa/ảnh trong bài, chuyên mục, tác giả, giới thiệu, sản phẩm liên quan, SEO, nháp và hẹn giờ theo giờ Việt Nam. Bản dịch chuyển sang trung tâm /admin/ban-dich, có xuất bản riêng và website /en.
- `/cam-nang` và `/cam-nang/[slug]`: danh sách, chuyên mục, bài viết, mục lục từ H2/H3, thời gian đọc, khối vé liên quan lấy tên/giá hiện tại. Bài nháp và bài chưa đến giờ không xuất hiện ở API/trang công khai hoặc sitemap.
- `/loai/[slug]`: trang nhóm sản phẩm; trang chủ có các nút nhóm. Đổi URL sản phẩm, bài viết hoặc loại sẽ lưu alias theo ID, trang web chuyển hướng 308 tới URL hiện tại; không tạo chuỗi chuyển hướng.

Ảnh upload chỉ nhận JPG, PNG, WebP thật, tối đa 5 MB và 25 triệu điểm ảnh. Server kiểm tra chữ ký file, giải mã, bỏ metadata, resize tối đa 1920px và chuyển WebP. Thư viện dùng cho ảnh giới thiệu **công khai**, không dùng chứa mã vé riêng của khách. Nội dung HTML được lọc phía server; ảnh trong nội dung chỉ lấy từ thư viện này.

File nằm trong Docker volume `jingo_media_data` gắn tại `/app/data/media` của API, metadata nằm ở PostgreSQL. Rebuild/recreate container giữ nguyên ảnh. Phải sao lưu cả volume ảnh lẫn database; chỉ sao lưu database không đủ phục hồi ảnh. Không chạy `docker compose down -v` để cập nhật. Local dev ghi vào `apps/api/data/media` (đã gitignore), hoặc đặt MEDIA_DIR trong `.env`.

Nếu upload báo 413 khi dùng Nginx/OpenResty/Nginx Proxy Manager, cấu hình `client_max_body_size 8m;` cho riêng domain JinGo trong reverse proxy, rồi kiểm tra/reload proxy. API vẫn giữ giới hạn file 5 MB. Không thay cấu hình proxy của JinHunt.

SEO có title/description, canonical, Open Graph, BlogPosting, sitemap và robots. Mặc định `SEO_INDEXING=false` để không index nội dung mẫu. Khi domain và nội dung thật sẵn sàng, thêm `SEO_INDEXING=true` vào `.env`, rồi `docker compose up -d web`. Xem `/robots.txt` và `/sitemap.xml`; admin, API nghiệp vụ, checkout và tra cứu không index. Riêng ảnh công khai được cho phép crawl. Các chức năng này không bảo đảm thứ hạng tìm kiếm.

Sau cập nhật, health phải hiện `0.10.0`. Không có dữ liệu mẫu mới ghi đè sản phẩm/đơn cũ. Hai loại mặc định được bổ sung nếu thiếu. Kiểm tra upload, lưu sản phẩm, bài nháp/hẹn giờ, đổi URL và ảnh sau restart trên Ubuntu trước khi vận hành rộng. Backup/restore PostgreSQL và volume ảnh chưa được chạy trên server của bạn.

## Luồng đặt vé và xử lý đơn (0.3)

1. Admin cấu hình sản phẩm thật, giá và điều kiện; bỏ chọn “Sản phẩm minh họa” khi sẵn sàng nhận yêu cầu. Vé mẫu không nhận đơn kể cả gọi API trực tiếp.
2. Khách chọn ngày/gói/nhóm khách, điền liên hệ và gửi yêu cầu. Server tính lại giá, kiểm tra ngày khóa, ngày đã qua và sản phẩm xuất bản. Đây là yêu cầu chờ kiểm tra, không giữ tồn/chỗ tự động.
3. Khách nhận mã đơn và link tra cứu có khóa riêng. Khóa nằm trong fragment URL, không gửi trong query string/log request; API kiểm tra bằng hash; từ bản 0.7 có thêm bản sao khóa đã mã hóa để gửi email giao dịch khi bật SMTP. Khách cần lưu link; chưa có SMS hoặc khôi phục khóa bằng OTP.
4. Vào `/admin/don-hang`, mở đơn, xác nhận sau khi có nguồn vé/chỗ. Nhập hướng dẫn công khai cho khách gồm quyền lợi, chính sách áp dụng và thông tin chuyển khoản thực tế; ghi chú nội bộ được lưu riêng.
5. Đối chiếu ngân hàng, nhập đúng tổng tiền và mã giao dịch để xác nhận thu đủ tiền. Đây là ghi sổ thủ công, không phải API ngân hàng. Chưa hỗ trợ thiếu/thừa tiền hoặc nhiều lần thanh toán. Mã giao dịch không được dùng lại cho đơn khác.
6. Giao từng mã nhà cung cấp hoặc voucher tour, nhập số khách mã đó áp dụng và hướng dẫn. Có thể giao từng phần; tổng số khách đã giao không vượt đơn. Mã vé đã giao không được cấp trùng. Khách bấm cập nhật trên trang tra cứu để nhận mã.
7. Chỉ hủy trực tiếp yêu cầu chưa thu tiền. Đơn đã thu tiền cần quy trình hoàn tiền riêng, hiện thao tác hủy bị chặn để không làm mất dấu khoản thu.

Giá/tên gói/điều kiện lúc đặt được lưu snapshot; sửa giá sau không thay đổi đơn cũ. Phiên bản đơn chống ghi đè, request ID chống tạo đơn/ghi thu/giao vé trùng khi retry; sổ thu, thao tác và audit cập nhật trong transaction. Trình duyệt lưu khóa idempotency và hash payload trong sessionStorage để retry sau lỗi mạng, không lưu thông tin liên hệ trong cache này.

Trang đơn hiển thị 200 đơn gần nhất; tổng đã thu trên màn hình chỉ tính danh sách đó, chưa phải báo cáo doanh thu đầy đủ. Chưa có giao file vé PDF/ảnh riêng tư, QR tự sinh, hạn mức tồn, xác nhận từ API đối tác, thông báo SMS/push, refund hoặc đối soát ngân hàng. Người giữ link tra cứu có quyền xem mã vé nên không chia sẻ công khai.

Sau khi cập nhật container, `/api/v1/health` phải trả version `0.10.0`. Trên Ubuntu cần kiểm tra trọn luồng bằng một sản phẩm thử riêng và thông tin thử, không dùng giao dịch ngân hàng thật để thử phần mềm. Bộ test local dùng pg-mem; chưa thay thế kiểm tra transaction/concurrency và backup trên PostgreSQL thật.

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

Admin hỗ trợ sản phẩm/ảnh/nội dung/giá/lịch khóa, loại sản phẩm, blog, SEO, bản dịch nháp và đơn tại `/admin/don-hang`. Có tài khoản nhân viên POS với quyền theo quầy tại /admin/nhan-vien-quay.

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

### v0.8.1 — chỉnh thao tác quản trị
- Bảng giá CTV: chọn nhiều gói bằng checkbox, mỗi gói có dòng giá riêng; lưu toàn bộ và báo số gói/mức giá.
- Bài viết mới tự tạo slug từ tiêu đề cho tới khi sửa tay; bài cũ giữ URL. Tạo chuyên mục ngay trong trình soạn bài, lưu dùng chung trong PostgreSQL.
- Thông báo lưu đặt ngay sau nút lưu ở các trình sửa sản phẩm, bài viết, loại sản phẩm, giá và tài khoản CTV.
- Menu thu gọn trên điện thoại; tra cứu bằng mã booking + email đã đặt, link có khóa cũ vẫn hoạt động. CTV tiếp tục tra đơn trong tài khoản; link chia sẻ vé giữ khóa riêng.

### v0.8.2 — chọn gói nhập giá và menu quản trị
- Chọn sản phẩm / gói vé và nhập giá CTV trực tiếp. Chuyển gói giữ giá các gói đã nhập; nút lưu gửi toàn bộ bảng. Giá thường và giá theo ngày/mùa được chỉnh riêng.
- Menu quản trị thu gọn theo Sản phẩm, Cộng tác viên, Blog, Cài đặt; Đơn hàng là mục riêng. Blog có trang chuyên mục dùng chung dữ liệu với trình soạn bài.
- Lịch chọn ngày đồng bộ ở trang vé, CTV và lịch quản trị, có chọn tháng/năm, hôm nay/ngày mai, giới hạn ngày. Bỏ nhãn Giờ Việt Nam trên giao diện; xử lý ngày và ngừng bán vẫn dùng Asia/Ho_Chi_Minh.

### v0.9.0 — điểm đến, quầy bán và báo cáo
- Điểm đến dạng cây tại /admin/diem-den, tối đa 10 cấp, chặn vòng lặp và lưu trữ mục còn được dùng. Migration một lần tạo danh mục từ tên điểm đến cũ, gắn destinationId và tăng version sản phẩm; giữ nguyên tên, giá và bản dịch.
- Sản phẩm chọn điểm đến có cấp cha. Trang chủ có tìm kiếm không dấu, lọc điểm đến gồm các điểm con, loại vé/tour, sắp xếp giá và URL chia sẻ bộ lọc. API products hỗ trợ destination, q và type.
- /admin/ban-tai-quay tạo đơn thật theo giá/lịch chung, ghi quầy/người bán, chống gửi trùng và hỗ trợ nhận tiền mặt/chuyển khoản qua xác nhận riêng. Tạo/lưu trữ quầy ngay trong màn hình POS; quầy lưu trữ vẫn có số liệu lịch sử.
- /admin/in-don/:id in phiếu đặt vé và mã đã giao, hiện rõ chưa thanh toán/đã thanh toán/công nợ, không tạo mã giả. Chưa có mã vé thì phiếu không dùng vào cổng. Không phải hóa đơn thuế.
- /admin/bao-cao: lọc ngày/kênh/quầy, giá trị đặt theo ngày tạo, thực thu theo ngày nhận tiền, tách tiền mặt/chuyển khoản và CTV trả nợ. Công nợ hiện tại toàn hệ thống giữ riêng khỏi bộ lọc. Số liệu gồm cả đơn lưu trữ, không bị giới hạn 200 đơn; có CSV. Chưa có giá vốn/hoàn tiền nên không tính lợi nhuận.
- Chưa phân quyền thu ngân riêng, ca mở/đóng quầy, tồn kho giữ chỗ hoặc tự lấy vé đối tác. POS hiện dùng tài khoản quản trị.

### v0.9.1 — trang quầy riêng
- /quay có trang đăng nhập và không gian bán vé riêng. Đăng nhập thành công mở thẳng POS, phiên còn hiệu lực bỏ qua form. Đăng xuất/phiên hết hạn quay về đăng nhập quầy.
- /admin và /admin/ban-tai-quay giữ luồng cũ. Trang quầy tái sử dụng cùng đơn, giá và thanh toán. Ở bản 0.9.1, đây là lối vào dùng phiên quản trị; từ 0.10 đã thay bằng tài khoản và phiên POS riêng (xem bên dưới).

### v0.10.0 — nhân viên và phân quyền POS
- Admin → Bán hàng → Nhân viên & phân quyền (/admin/nhan-vien-quay): tạo nhân viên, gán các quầy được làm việc và quyền SELL/COLLECT/DELIVER/PRINT/CANCEL. Mặc định chỉ bán và in; các quyền thu tiền, giao vé, hủy cần cấp thêm.
- Nhân viên đăng nhập /quay bằng tài khoản riêng. /quay/don-hang chỉ hiển thị đơn POS thuộc các quầy được gán, bao gồm đơn của đồng nghiệp cùng quầy. Không truy cập đơn web/CTV/quầy khác, giá CTV, cấu hình hay báo cáo toàn hệ thống.
- Session POS jingo_pos riêng với jingo_admin, cookie HttpOnly/SameSite Strict scoped /api/v1/pos. Không nhận cookie admin thay cho POS; chủ vẫn có thể đăng nhập POS bằng tài khoản quản trị và có toàn quyền quầy. Admin đăng nhập độc lập tại /admin.
- API /pos kiểm tra quyền và quầy theo dữ liệu hiện tại; tạo đơn và thao tác tài chính còn kiểm tra nhân viên trong transaction. Đổi quyền/quầy/email/mật khẩu hoặc khóa tài khoản thu hồi các phiên POS nhân viên cũ. Không bao giờ trả password_hash về client.
- Nhân viên chỉ được gọi PAY/DELIVER/CANCEL theo quyền, không được ARCHIVE/RESTORE/CREDIT hoặc tự nâng quyền. Quyền PRINT hoặc DELIVER mới được nhận mã vé trong chi tiết; endpoint in bắt buộc PRINT. Thu tiền/hủy/giao vé tiếp tục có version, request ID và audit người thực hiện.
- /admin/ban-tai-quay giữ luồng quản trị cũ. Sau cập nhật, /quay cần đăng nhập vào phiên POS riêng. Chưa có phân quyền thu ngân theo ca, hoàn tiền hay hạn mức thu tiền cá nhân.

Với đơn POS, tra cứu bằng mã đơn + email chỉ xem trạng thái; khách mở link trong email JinGo để xem mã vé. Khóa thật do server sinh cho đơn POS mới, nhân viên không được cấp quyền không lấy được mã qua khóa tự gửi khi tạo đơn. Đơn web giữ cách tra cứu email hiện có.

### v0.11.0 — tồn vé dùng chung

Vào **Sản phẩm → Tồn vé** (`/admin/ton-ve`). Chọn sản phẩm, gói, khoảng ngày và các thứ; nhập **tổng số suất** rồi áp dụng. Có thể cấp chung cả ngày hoặc riêng từng suất giờ. Bật giới hạn sau khi cấp tồn. Ngày chưa cấp tồn sẽ dừng nhận đơn khi giới hạn đang bật; mặc định sản phẩm cũ vẫn không giới hạn.

Mỗi khách chiếm một suất, gồm cả vé miễn phí. Web, POS và CTV cùng trừ tồn khi tạo đơn thành công. Báo giá chưa giữ chỗ. Đơn chưa thanh toán giữ tồn tới khi hủy hoặc lưu trữ; đơn đã thanh toán/công nợ vẫn chiếm tồn khi lưu trữ. Khôi phục đơn đã hủy không giữ chỗ trở lại. Không tự hết hạn đơn chờ thanh toán.

Tổng tồn bao gồm số đã đặt và không được thấp hơn số này. Nếu muốn ngừng nhận thêm khi đã có đơn, đặt tổng tồn bằng số đã đặt. Nếu có cả giới hạn ngày và suất, đơn phải thỏa cả hai. Đơn cũ được chuyển sang sổ tồn một lần; đơn không xác định được gói/suất sẽ được tính thận trọng và hiện trong danh sách cần phân loại.

Sau triển khai, health phải hiện `0.11.0`. Chưa có kết nối tồn nhà cung cấp. Kiểm thử tự động dùng pg-mem; cần kiểm tra tải mua đồng thời trên PostgreSQL thực trước khi vận hành lớn.

### v0.11.1 — tìm và lọc toàn bộ đơn

Trang Đơn hàng tìm trên toàn bộ dữ liệu theo mã booking, tên khách, điện thoại hoặc email, không còn chỉ tìm trong 200 đơn gần nhất. Có lọc trạng thái đơn, thanh toán, kênh Web/POS/CTV, ngày tạo đơn hoặc ngày sử dụng vé. Khoảng ngày có thể bỏ trống một hoặc cả hai đầu; ngày tạo tính theo múi giờ Việt Nam. Bấm Tìm đơn hàng để áp dụng, Xóa bộ lọc để trở về danh sách đầy đủ.

Phân trang 25/50/100 đơn; thùng rác dùng cùng bộ lọc. Thống kê tính trên toàn bộ kết quả khớp, gồm tất cả trang. Giá trị đơn PAID là giá trị đặt vé, không phải báo cáo dòng tiền theo ngày nhận. Health phiên bản mới là `0.11.1`.

### v0.12.0 — giao nhiều mã vé một lần

Trong chi tiết đơn đã thanh toán/ghi công nợ, chọn Giao mã vé → Dán nhiều mã. Mỗi dòng là một mã; dòng trống được bỏ qua, mỗi mã mặc định cho một khách. Có thể đổi số khách cho mỗi mã nếu nhà cung cấp dùng mã nhóm. Xem trước danh sách, số mã và tổng khách trước khi lưu. Chế độ Một mã / mã nhóm giữ nguyên mã có nội dung nhiều dòng.

Admin và nhân viên quầy có quyền DELIVER dùng cùng form. API kiểm tra số khách còn lại, mã trùng trong lô và mã đã giao trước khi ghi. Một lô lưu trong một transaction; request ID/version và unique code hash tiếp tục chống giao trùng khi thử lại hoặc cạnh tranh. Một lô tạo một sự kiện email khi SMTP đã bật cho đơn web/quầy; đơn CTV nhận vé qua tài khoản theo luồng hiện có. Không tự xác nhận mã còn hiệu lực tại nhà cung cấp. Lô tối đa 150 mã; nội dung quá lớn cần chia lô. Health phiên bản mới: `0.12.0`.

### v0.12.1 — sửa lưu tên tiếng Anh điểm đến

Khi chọn điểm đến đã có trong cây, trình sửa nay chỉ gửi các trường được phép lưu; bỏ depth/path dùng để hiển thị cây. Sửa tên tiếng Anh hoặc thông tin điểm đến không còn lỗi Unrecognized keys. Giữ kiểm tra schema nghiêm ngặt ở API. Không cần đổi dữ liệu hoặc migration.
