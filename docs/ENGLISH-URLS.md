# URL tiếng Anh cho cẩm nang và điểm đến

- Cẩm nang Việt: `/cam-nang`, `/cam-nang/kinh-nghiem-hoi-an`.
- Cẩm nang Anh: `/en/blog`, `/en/blog/hoi-an-travel-guide`.
- Điểm đến Việt: `/diem-den`, `/diem-den/hoi-an-co-kinh`.
- Điểm đến Anh: `/en/destinations`, `/en/destinations/hoi-an-old-town`.

Phần dịch bài blog có ô URL tiếng Anh, tự gợi ý từ tiêu đề khi chưa sửa slug thủ công và có nút tạo lại. English slug lưu trong `english.slug`, độc lập slug Việt và không làm đổi ID bài. Phần sửa Điểm đến có englishSlug/englishDescription và nút tạo URL từ tên Anh. Tên địa danh chưa dịch dùng tên hiện có. Các URL sản phẩm/loại sản phẩm/đặt vé khác giữ quy tắc hiện có.

Nâng cấp tự điền slug Anh cho bài đã có bản dịch và các điểm đến, không đổi nội dung hay trạng thái dịch. Nếu các tiêu đề trùng nhau, dùng hậu tố số cho URL không trùng. Migration chạy một lần và tăng version của bản ghi được bổ sung. Link dùng slug Việt trước đây vẫn được nhận và chuyển sang canonical của bản Anh. Khi thay slug Anh, slug cũ được giữ trong alias riêng; không cho bài/điểm đến khác chiếm alias đó.

`/en/cam-nang/*` chuyển 308 sang `/en/blog/*`; `/en/diem-den/*` chuyển 308 sang `/en/destinations/*`. API trả localePaths và slug của ngôn ngữ đang xem. Nút chuyển ngôn ngữ lấy đúng cặp URL từ API, không đoán slug còn lại. Canonical, hreflang, sitemap và JSON-LD bài viết dùng đúng URL. Bộ lọc chuyên mục trên blog Anh dùng query `category`; khi chuyển ngôn ngữ, bộ lọc tên chuyên mục được xóa vì nhãn Việt/Anh có thể khác nhau.

Trang điểm đến hiển thị các điểm con và sản phẩm thuộc cây con. Dùng ID điểm đến để lọc nên thay URL không ảnh hưởng đơn, tồn vé, nguồn vé hoặc báo cáo. Không công khai điểm đã lưu trữ hoặc con của điểm bị lưu trữ; alias không bỏ qua kiểm tra này. Bài nháp/bản Anh chưa xuất bản giữ quy tắc ẩn hiện có.

Kiểm tra gồm lookup/alias/collision, ID/cặp localePaths, trạng thái lưu trữ, nâng cấp dữ liệu cũ một lần, canonical/hreflang theo slug riêng và route 308.
