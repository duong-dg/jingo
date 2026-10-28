# JinGo

## Đối soát nhà cung cấp theo ngày (0.25)

- Sản phẩm → Đối soát nhà cung cấp (`/admin/doi-soat-ncc`), có liên kết từ Nguồn vé & giá vốn. Chọn NCC (kể cả lưu trữ) và khoảng ngày để xem phải trả đầu kỳ, nhập vé, tiền đã trả và phải trả cuối kỳ. Dùng ngày ghi nhận trong hệ thống tại Việt Nam; không theo ngày sử dụng vé, không theo ngày thực chuyển ngân hàng nếu nhập sổ muộn.
- Đầu kỳ = mọi giá trị lô nhập trước 00:00 ngày bắt đầu − tiền đã ghi trả trước thời điểm đó. Trong kỳ tính từ đầu ngày đầu tới hết ngày cuối GMT+7. Cuối kỳ = đầu kỳ + nhập − đã trả. Số dư chạy từng dòng theo thời điểm, cùng thời điểm nhập trước rồi trả, sau đó mã bản ghi; disabled/lô hết hạn, vé đã bán và NCC lưu trữ không xóa công nợ.
- Chi tiết 50 dòng/trang, tổng toàn kỳ; CSV toàn kỳ gồm dòng đầu kỳ, phát sinh, cuối kỳ. Cột tăng phải trả/đã trả chỉ có số ở các dòng phát sinh; dòng đầu/cuối kỳ không lặp tổng tiền, cột số dư không cộng. Có BOM tiếng Việt, GMT+7, escape ô text và chặn công thức Excel.
- Tối đa 367 ngày, 10.000 dòng phát sinh mỗi kỳ; vượt giới hạn báo chọn khoảng ngắn hơn, không âm thầm cắt. Bộ lọc chưa áp dụng không đổi bảng/CSV đang xem. CSV lấy dữ liệu lại lúc tải, không cố định theo báo cáo đã mở trước đó.
- Chỉ admin xem/xuất, no-store; không tạo giao dịch, tự chuyển tiền hay gửi đối soát ra ngoài. Sổ chưa có trả trước, điều chỉnh chứng từ, lùi ngày ghi sổ hoặc quy trình xác nhận số dư với NCC. Vé đã nhập vẫn không trả NCC theo nghiệp vụ đã chốt.


## In bàn giao & xuất khoản thu ca (0.24)

- Ca quầy → ca đã chốt → In biên bản bàn giao. Có tiền đầu ca, CASH/BANK tách riêng, tiền mặt phải bàn giao/thực đếm, chênh lệch, ghi chú và chỗ ký người giao/nhận/kiểm tra. Chọn In biên bản / lưu PDF bằng chức năng in trình duyệt; A4, có tùy chọn phụ lục khoản thu, không tự mở hộp thoại in.
- Trang in admin `/admin/ca-quay/in/:id`, POS `/quay/ca/in/:id`, chỉ tải số liệu sau xác thực. API từ chối biên bản ca đang mở; dùng snapshot đã chốt, không tạo bản chốt mới hoặc sửa số tiền. Chỗ ký để ký khi bàn giao, chưa có xác nhận người nhận hay chữ ký điện tử trong hệ thống.
- Xuất khoản thu CSV ở ca đang mở hoặc đã chốt: mỗi payment một dòng gồm mã ca/quầy/trạng thái/mốc ca/mã đơn/thời gian thu/phương thức/số tiền/mã giao dịch/mã người ghi thu. Không đưa tổng ca lặp vào từng dòng, không lấy tiền trước ca/ngoài ca, không chứa liên hệ hoặc mã vé khách. Ca không có thu xuất file chỉ có tiêu đề.
- CSV UTF-8 BOM, thời gian GMT+7, escape dấu phẩy/xuống dòng và vô hiệu công thức Excel trong ô text. Tối đa 10.000 khoản thu mỗi ca; vượt ngưỡng báo lỗi, không âm thầm cắt file. File có thông tin đối soát nội bộ, lưu và chia sẻ theo quyền vận hành của bạn.
- Quyền SHIFT và quầy được gán áp dụng cho cả in/CSV; không cần quyền PRINT mã vé. Nhân viên cũ không tự được thêm quyền. Bản in không công khai, không nằm trong sitemap; tải lại/đăng nhập vẫn kiểm quyền ở API. Không đổi cách thu tiền/chốt ca/công nợ.


## Voucher theo sản phẩm / gói vé (0.23)

- Admin → Mã giảm giá & voucher: chọn ALL (mọi sản phẩm), PRODUCTS (mọi gói của các sản phẩm được chọn), VARIANTS (đúng cặp sản phẩm + gói). Có tìm kiếm, danh sách đã chọn và bỏ từng mục, tối đa 200 mục. PRODUCTS bao gồm cả gói thêm sau; VARIANTS không tự áp dụng gói mới.
- Voucher cũ thiếu scope/targets giữ hành vi ALL; không đổi giá hay tiền giảm của đơn cũ. Mã vẫn chỉ cho web bán lẻ, một mã mỗi đơn, giữ nguyên cách tính tiền, hạn theo ngày đặt, số lượt giữ/trả và chính sách CTV/POS.
- Server kiểm cấu hình danh sách không rỗng/lặp, đúng loại phạm vi, sản phẩm/gói tồn tại. Quote và Orders.create đều kiểm phạm vi từ productId/variantId đã được kiểm giá; tạo đơn kiểm lại trong transaction với khóa voucher, không tin giá đã quote. Sửa phạm vi có hiệu lực với đơn mới; retry request đã tạo vẫn lấy đơn cũ và snapshot cũ.
- Public quote chỉ trả mã và số tiền giảm như trước, không công khai danh sách điều kiện hoặc ghi chú nội bộ. Lỗi sai phạm vi có thông báo Việt/Anh. Tính thử trong admin chỉ minh họa số tiền, không kiểm điều kiện phạm vi/ngày/lượt.
- Chưa có ưu đãi riêng nhóm tuổi, điều kiện ngày sử dụng, kênh CTV/POS hoặc cộng dồn. Khi đổi phạm vi trong form, danh sách đang chọn được xóa để chọn lại đúng loại. Gói bị xóa/đổi ID không tự chuyển ưu đãi sang gói khác.


## Xem trước & lịch sử bài viết (0.22)

- Blog → Bài viết: lưu bài rồi bấm Xem trước bản đã lưu; dùng được cho nháp, hẹn giờ và bài xuất bản, có lựa chọn Việt/Anh. Bản dịch chưa có tiêu đề chưa xem được. Bản xem trước dùng chung ArticleView với trang công khai: ảnh, nội dung, mục lục và sản phẩm liên quan đang xuất bản.
- Bản xem trước yêu cầu phiên admin ở API, không nhận token chia sẻ qua URL, private/no-store và noindex/nofollow/noarchive. Trang HTML/RSC chỉ có vỏ giao diện, nội dung nháp tải từ API sau xác thực; không gắn BlogPosting/canonical/sitemap cho bản xem trước. Lưu ý thư viện ảnh vẫn là thư viện công khai như trước, không phải kho file riêng tư.
- Mỗi lần lưu bài hoặc lưu bản dịch tạo revision bất biến trong cùng transaction với bản hiện tại, có version/thời điểm/người lưu và audit. Bài cũ được giữ bản baseline trước lần sửa đầu tiên sau nâng cấp. Không khôi phục được các lần sửa xảy ra trước khi có lịch sử; không tự tạo lịch sử giả.
- Hiện 50 phiên bản gần nhất, có xem trước từng phiên bản. Khôi phục yêu cầu lưu/bỏ thay đổi đang sửa, xác nhận chọn bản cũ, dùng optimistic version chống ghi đè. Khôi phục tạo revision mới, giữ slug hiện tại, chuyển bài và bản dịch về nháp, bỏ lịch hẹn giờ; bài đang công khai sẽ tạm ẩn đến khi xuất bản lại. Không xóa lịch sử hay đổi vé/đơn/giá.
- Xem trước bản cũ vẫn dùng thông tin/giá hiện tại của sản phẩm liên quan đã xuất bản; không phải ảnh chụp lịch sử giá vé. Chưa có so sánh diff, tự lưu khi đang gõ, chia sẻ preview công khai hoặc giới hạn dung lượng lịch sử tự động.


## Ca quầy & bàn giao (0.21)

- Admin → Bán hàng → Ca quầy & bàn giao hoặc POS `/quay/ca`. Quyền SHIFT mới cho nhân viên xem sổ ca tại các quầy được gán, mở ca và chốt ca do mình mở; admin chốt thay khi cần. Không tự cấp quyền mới cho nhân viên cũ. Khóa/gỡ quyền thu hồi phiên như trước.
- Mỗi quầy có tối đa một ca đang mở, dùng chung cho các nhân viên thu tại quầy. Nhập tiền mặt đầu ca; mỗi lần PAY đơn POS khi có ca mở sẽ gắn payment vào ca trong cùng transaction, dù thu từ admin hay POS và dù đơn được tạo từ ca trước. Không gắn theo ngày tạo đơn, không lấy tiền thu website/CTV, không tự nhập lại khoản thu trước lúc mở ca.
- Ca là tùy chọn để giữ luồng bán cũ: chưa mở ca vẫn bán/thu được, khoản thu đó chỉ ở báo cáo doanh thu và không thuộc ca. Đăng xuất không tự chốt. Chuyển ca cần chốt ca cũ rồi mở ca mới; không lưu trữ quầy khi còn ca mở.
- Chốt ca ghi số tiền mặt thực đếm/bàn giao, ghi chú bắt buộc và xác nhận đã kiểm đếm. Tiền mặt phải bàn giao = đầu ca + khoản thu CASH trong ca; chênh lệch = thực đếm − phải bàn giao. BANK chỉ tổng hợp riêng, không cộng vào ngăn kéo tiền mặt. Chưa có rút/chi, hoàn tiền hoặc điều chuyển trong ca; chưa xác nhận riêng người nhận bàn giao.
- Số liệu chốt là snapshot bất biến; không sửa/xóa/mở lại ca. Xem 50 ca gần nhất từng quầy và chi tiết khoản thu. Ca mở cần Tải lại để cập nhật khoản thu mới. Version/request hash, unique ca mở theo quầy, liên kết payment duy nhất, audit và khóa quầy dùng chung với PAY chống ghi trùng/chốt lệch thời điểm. Bộ test pg-mem chưa thay thế kiểm thử đồng thời trên PostgreSQL thật.


## Cảnh báo nguồn vé (0.20)

- Sản phẩm → Nguồn vé & giá vốn: cảnh báo lô đang bật đã tới ngày sử dụng; ngưỡng mặc định còn tối đa 5 vé và sắp hết hạn trong 7 ngày (tùy chọn mỗi lần xem, không lưu cấu hình). Hết hạn tính trước ngày hôm nay tại Việt Nam; ngày cuối vẫn còn hiệu lực. Mỗi lô chỉ hiện một cảnh báo theo thứ tự hết hạn → hết vé → sắp hết hạn → sắp hết vé. Lô hết hạn đã hết vé, lô tắt và lô chưa tới ngày sử dụng không cảnh báo.
- Cảnh báo không tự khóa ngày bán, không đổi tồn theo ngày, công nợ hoặc giá vốn. Lô hết hạn còn vé vẫn giữ nghĩa vụ trả tiền NCC. Nguồn vé nhập không trả lại nhà cung cấp; không có luồng trả lô.
- Danh sách đơn đang xử lý chưa đủ nguồn/giá vốn, kể cả chưa thu tiền, phân trang 25 đơn và mở đúng chi tiết đơn. Đơn hủy/lưu trữ không hiện. Số thiếu tính theo từng nhóm khách và phần đã chốt nguồn; đây không phải khẳng định hết vé tại nhà cung cấp.
- Dữ liệu admin-only, không có liên hệ/khóa tra cứu của khách trong danh sách. Cảnh báo cập nhật khi tải lại, thay ngưỡng hoặc thao tác lô trong trang; không gửi email và không tự phân bổ. Bản này tổng hợp từ dữ liệu nguồn/đơn hiện có trong một snapshot đọc; cần tối ưu truy vấn tổng hợp khi dữ liệu đơn rất lớn.


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

### v0.12.2 — bố cục chuyên mục Blog

Trang Chuyên mục chia thành khung tạo mới và danh sách có tìm kiếm/số bài. Trong bài viết, Chuyên mục và Tác giả nằm cùng hàng; bấm Tạo mới để mở khung nhập riêng, Tạo & chọn tự chọn chuyên mục vừa tạo. Thông báo hiện ngay trong khung tạo. Trên điện thoại các khung xếp một cột. Không đổi dữ liệu hay API chuyên mục.

### v0.13.0 — email trong chi tiết đơn

Admin → Đơn hàng → chọn đơn có khung Email của đơn hàng, tối đa 100 thư của riêng đơn đó. Xem loại thông báo, số lần thử, thời gian và trạng thái; tự cập nhật mỗi 15 giây khi còn thư chờ và trang đang hiển thị. SMTP đã nhận thư không có nghĩa thư chắc chắn vào hộp thư đến.

Thư FAILED có nút Thử gửi lại nếu SMTP đang bật và đơn hỗ trợ email. Thao tác đưa vào hàng đợi, không gửi ngay trong request. Không gửi lại thư đã SENT hoặc đang PENDING/SENDING. Retry ghi audit trong cùng transaction và chỉ tác động thư thuộc đúng đơn. Đơn CTV tiếp tục nhận vé trong tài khoản, không gửi trực tiếp cho khách của CTV. Việc bật SMTP sau này không tự tạo bù email cho sự kiện cũ.

### v0.14.0 — xuất danh sách đơn CSV

Đơn hàng → áp dụng bộ lọc → Xuất CSV. File gồm toàn bộ kết quả theo bộ lọc đã áp dụng và trạng thái danh sách/thùng rác, không phụ thuộc trang hoặc số đơn mỗi trang. Chỉnh bộ lọc cần bấm Tìm đơn hàng trước khi xuất. Tối đa 10.000 đơn/lần; vượt giới hạn phải thu hẹp bộ lọc, không tự cắt bớt kết quả.

CSV UTF-8 có BOM để hiển thị tiếng Việt trong Excel, cột ngày tạo theo giờ Việt Nam, thông tin khách/sản phẩm/gói/ngày/suất, số người lớn/trẻ em/người cao tuổi, giá trị đơn và trạng thái/kênh. Số điện thoại thêm dấu nháy đầu để giữ dạng văn bản; nội dung có thể được Excel diễn giải là công thức được vô hiệu hóa. Không xuất mã vé, khóa truy cập hoặc ghi chú nội bộ. Giá trị đơn không phải số tiền thực thu theo ngày nhận.

### v0.15.0 — nhân bản sản phẩm

Mở sản phẩm đã lưu → Nhân bản sản phẩm. Nút tạm khóa khi nội dung hoặc bản dịch còn thay đổi chưa lưu. Bản sao chỉ nằm trong trình soạn cho tới khi bấm Lưu thay đổi, luôn có trạng thái DRAFT, tên/slug mới và ID mới cho sản phẩm, gói, suất giờ, lịch giá. Nội dung, ảnh, giá cơ bản, điều kiện khách và các khoảng lịch/khóa ngày được giữ; các tham chiếu lịch trỏ về đúng gói mới.

Bản dịch không được sao chép; tồn vé và bảng giá CTV là dữ liệu riêng theo ID nên cần cấp lại. Nhãn vé mẫu giữ theo sản phẩm gốc. Kiểm tra tên, URL, giá, lịch và tồn trước khi xuất bản. Không sao chép đơn, mã vé hay doanh thu.

### v0.16.0 — nhà cung cấp

Sản phẩm → Nhà cung cấp: tạo hồ sơ, người liên hệ, điện thoại, email, website và ghi chú nội bộ. Chọn nhà cung cấp trong Thông tin sản phẩm; sản phẩm cũ không bắt buộc gắn. Danh sách hiển thị số sản phẩm liên kết, hỗ trợ tìm kiếm và lọc/lưu trữ/khôi phục. Nhà cung cấp còn sản phẩm (kể cả nháp) phải chuyển hoặc bỏ liên kết trước khi lưu trữ.

Thông tin chỉ dành cho admin; chưa kết nối API, giá vốn hoặc công nợ nhà cung cấp. Xem [tiến độ và phần còn thiếu](docs/ROADMAP.md) để theo dõi phạm vi đầy đủ.

### v0.16.1 — lọc nhanh đơn trong ngày

Trong Đơn hàng, chọn Ngày tạo đơn hoặc Ngày sử dụng vé rồi bấm Hôm nay / Ngày mai. Hệ thống tự điền khoảng ngày theo giờ Việt Nam và áp dụng ngay cùng các bộ lọc đang chọn, quay về trang 1. Xuất CSV tiếp tục dùng đúng bộ lọc này.

### v0.17.0 — cấu hình voucher (chưa kết nối checkout)

Bán hàng → Mã giảm giá & voucher: tạo/sửa mức giảm phần trăm hoặc VND, đơn tối thiểu, mức giảm tối đa cho %, khoảng ngày, tổng lượt dự kiến và bật/tắt cấu hình. Mã tự chuẩn hóa chữ hoa, không được trùng, giữ cố định sau khi tạo. Có tính thử minh họa bằng giá trị đơn giả lập.

Đây là bước chuẩn bị cấu hình: checkout chưa nhận mã, chưa giảm tiền và chưa thực thi/trừ giới hạn lượt dùng. Các thông báo trên màn hình luôn nhắc giới hạn này. Cần nối báo giá/đơn/tồn lượt trong transaction và bổ sung kiểm thử trước khi công bố chương trình cho khách.

### v0.18.0 — voucher tại checkout bán lẻ

Khách nhập mã ở checkout, bấm Áp dụng để lấy lại báo giá từ server. Mỗi đơn một mã, áp dụng toàn bộ sản phẩm web bán lẻ; không áp dụng CTV/POS. Thời hạn tính theo ngày đặt đơn (giờ Việt Nam), không theo ngày sử dụng vé. Server kiểm tra bật/tắt, ngày, giá trị đơn tối thiểu, mức giảm tối đa và lượt còn lại; tính lại khi tạo đơn.

Báo giá không giữ lượt; đơn tạo thành công giữ một lượt kể cả chưa thanh toán. Hủy/lưu trữ đơn chưa thu tiền trả lượt một lần; khôi phục đơn đã hủy không giữ lại lượt. Lưu trữ đơn đã thu tiền vẫn giữ lượt. Cấu hình không được hạ giới hạn dưới số lượt đang dùng. Snapshot tiền giảm giữ nguyên khi sửa voucher.

Chi tiết đơn, tra cứu, phiếu in và CSV thể hiện mã/tiền giảm; báo cáo giá trị đơn theo số sau giảm. Chưa có cộng dồn mã, điều kiện riêng sản phẩm/gói hoặc quy trình trả lượt cho hoàn tiền đơn đã thu. Giới hạn đồng thời dùng khóa hàng PostgreSQL, cần kiểm chứng tải thật trên PostgreSQL trước khi phát hành chiến dịch lớn.

### v0.19.0 — giá vốn theo lô, nhiều nguồn và công nợ NCC

Sản phẩm → Nguồn vé & giá vốn: nhập lô theo nhà cung cấp, sản phẩm/gói, nhóm khách, khoảng ngày sử dụng, giá mua và số lượng. **Nhập lô nghĩa là đã mua/nhận toàn bộ lô**, không chỉ ghi bảng giá báo của đối tác; toàn bộ giá trị lô được ghi nhận phải trả NCC. Giá mua/số lượng đã nhập cố định, chỉ đổi bật/tắt và ưu tiên. Nhà cung cấp còn lô đang bật không được lưu trữ.

Trong chi tiết đơn, chọn nguồn thủ công hoặc tự phân bổ. Ưu tiên số nhỏ trước, cùng ưu tiên lấy giá mua rẻ trước rồi lô nhập trước. Ví dụ 10 vé A giá390k và 2 vé B giá410k ghi vốn4.720.000đ. Mỗi lô chiếm số lượng đã phân bổ dùng chung các ngày/kênh. Nếu sản phẩm đã có lô nguồn cung, thao tác giao mã tự phân bổ phần còn thiếu; thiếu bất kỳ nhóm khách sẽ chặn giao trước khi ghi mã. Vé miễn phí cũng cần lô giá0đ để ghi đủ nguồn. Sản phẩm chưa có lô vẫn giao theo luồng cũ và báo thiếu giá vốn.

Đơn chưa thu hủy/lưu trữ trả số lượng lô, giữ lịch sử phân bổ cũ; không giảm nghĩa vụ trả NCC vì vé vẫn thuộc kho đã mua. Khôi phục đơn đã hủy không lấy lại nguồn. Đơn đã thu/ghi nợ giữ vốn khi lưu trữ. Đây là sổ số lượng/giá vốn, chưa nhập/giao mã thật từ kho.

Công nợ NCC = giá trị toàn bộ lô nhập − khoản đã trả ghi nhận. Nhập mã chuyển khoản hoặc xác nhận tiền mặt sau khi trả thực tế; không chuyển tiền ngân hàng từ ứng dụng. Có chống ghi trùng/chi vượt công nợ và lịch sử thanh toán. Chưa hỗ trợ trả trước. Vé nhập không trả lại nhà cung cấp theo nghiệp vụ đã chốt.

Lợi nhuận gộp theo ngày tạo đơn, chỉ cho đơn PAID/CREDIT chưa hủy đã phân bổ đủ nguồn: doanh thu sau giảm − giá vốn. Bao gồm đơn lưu trữ, tách rõ đơn chưa đủ vốn (không tự coi vốn bằng0). Công nợ NCC là toàn bộ thời gian, tách bộ lọc ngày. Không phải dòng tiền, không trừ phí vận hành/thuế và chưa có hoàn tiền. Giá vốn/chứng từ nội bộ không xuất ra web/CTV/POS. Cần kiểm thử mua/phân bổ đồng thời trên PostgreSQL thật trước khi vận hành lớn.

## 0.26 — Voucher theo ngày sử dụng

- Admin → Bán hàng → Mã giảm giá & voucher: khoảng ngày sử dụng tùy chọn, thứ áp dụng; điều kiện kết hợp với phạm vi sản phẩm/gói và thời hạn nhập mã hiện có.
- Không chọn thứ nghĩa là mọi thứ; khoảng ngày tính bao gồm hai đầu, theo ngày sử dụng vé tại Việt Nam. Để trống một đầu cho phép giới hạn một phía.
- Quote và đặt đơn đều kiểm tra lại trên máy chủ; voucher cũ không có điều kiện ngày vẫn hoạt động như trước. Đơn đã tạo giữ nguyên số tiền khi cấu hình thay đổi.

## 0.27 — Thu/chi tiền mặt trong ca

- Admin/POS → Ca quầy: người mở ca hoặc quản trị ghi bổ sung/rút tiền mặt kèm mã chứng từ, lý do và người giao nhận. Quyền SHIFT và phạm vi quầy được kiểm tra lại khi ghi.
- Phải bàn giao = đầu ca + thu bán vé bằng tiền mặt + bổ sung − rút/chi. Không cho rút quá số dư theo sổ, không tạo doanh thu hay hoàn tiền đơn.
- Chứng từ không sửa/xóa; ghi khoản đối ứng để sửa sai trong ca đang mở. Ca chốt giữ snapshot, chi tiết và có CSV thu/chi riêng; biên bản in hiển thị cả các khoản này. Không thực hiện chuyển tiền ngân hàng.

## 0.28 — So sánh phiên bản bài viết

- Trong lịch sử bài viết, chọn “So sánh với bản hiện tại”, hoặc chọn hai phiên bản/ngôn ngữ. Hiện các mục thay đổi trước/sau, bật xem cả mục không đổi.
- Đối chiếu tiêu đề, mô tả, nội dung/định dạng, SEO, chuyên mục, slug, ảnh và các thông tin chung. Có thể mở mã nội dung để kiểm tra URL/định dạng. Đây là so sánh theo mục, không đánh dấu từng từ.
- Chỉ so sánh bản đã lưu, không thay đổi xuất bản hay tạo phiên bản mới. Nội dung lịch sử được làm sạch lại trước khi hiển thị; API chỉ admin và không lưu cache.

## 0.29 — Nguồn vé lấy theo đơn, không nhập trước số lượng

- Nguồn vé & giá vốn: tích “Không nhập trước số lượng — lấy vé theo từng đơn”, chỉ nhập giá mua, NCC, gói/nhóm khách và ngày hiệu lực. Không tạo tồn giả hay công nợ khi lưu nguồn.
- Phân bổ thủ công hoặc giao vé tự động ghi giá vốn và công nợ đúng số vé lấy thêm; chọn nguồn vẫn theo ưu tiên/giá mua/FIFO, có thể phối hợp với lô nhập sẵn. Quy tắc tồn bán web/POS/CTV giữ riêng ở Tồn vé.
- Sổ mua vé theo đơn lưu bất biến theo từng lần chốt, có mã đơn, đơn giá và thời điểm; cập nhật công nợ, đối soát đầu/cuối kỳ và CSV. Hủy/lưu trữ đơn không xóa tiền vé đã xác nhận lấy vì NCC không nhận trả.
- Lô cũ giữ nguyên cách tính, không đổi kiểu/số lượng/giá mua trực tiếp để tránh làm sai công nợ đã ghi. Muốn đổi giá: tắt nguồn cũ, tạo nguồn mới. Nguồn theo đơn không báo sắp hết/hết số lượng, vẫn cảnh báo hạn dùng.

## 0.30 — Sửa/xóa nguồn vé

- Nguồn vé có Sửa nguồn, Xóa nguồn và thùng rác để khôi phục. Xóa tắt nguồn, ẩn khỏi danh sách mặc định; không xóa công nợ, giá vốn đơn hoặc sổ mua. Khôi phục về trạng thái tắt.
- Sửa hạn dùng, ghi chú, ưu tiên. Giá mua nguồn lấy theo đơn chưa dùng sửa trực tiếp; đã từng phân bổ thì tạo bản giá mới và cất bản cũ vào thùng rác. Đơn cũ giữ giá vốn cũ.
- Lô nhập sẵn đã ghi công nợ giữ nguyên giá mua/số lượng, không điều chỉnh giá trị mua lịch sử qua nút sửa. Có kiểm tra version chống ghi đè giữa hai cửa sổ và quyền admin.
