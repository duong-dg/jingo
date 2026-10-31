# Ưu đãi online theo sản phẩm / gói vé

Admin → Sản phẩm & giá → chọn sản phẩm → Gói & giá.

- Mức chung: không giảm, giảm phần trăm nguyên 1–100%, hoặc giảm số tiền nguyên VND trên mỗi vé (tối đa 100 triệu).
- Mỗi gói có thể dùng mức chung (mặc định), đặt mức riêng hoặc tắt ưu đãi riêng bằng Không giảm online. Có thể đổi ECO/High/VIP khác nhau.
- Giảm sau khi chọn giá cơ bản/lịch giá của ngày sử dụng. 600.000đ giảm 10% → 540.000đ; giá ngày lễ 650.000đ → 585.000đ. Giảm 10.000đ trên vé 900.000đ → 890.000đ. Theo từng vé, không phải một lần cho cả giỏ. Tiền giảm % làm tròn xuống đơn vị VND; giá sau giảm không âm, giá miễn phí vẫn là 0.
- Áp dụng tất cả nhóm khách được bật, gồm giá địa phương. Không xác minh điều kiện cư trú tự động. Nếu giá nhóm địa phương không phù hợp mức giảm chung, cần cân nhắc giá/gói trước khi bật.
- Chỉ WEB dùng ưu đãi. POS, POS trong admin, CTV trực tiếp và CTV chiết khấu vẫn tính từ giá gốc/lịch ngày của kênh tương ứng. Gói/báo giá quầy trong admin có endpoint xác thực riêng `/admin/pos/quotes`.
- Không cộng dồn voucher khi gói đã có tiền giảm online. Cần bỏ mã voucher để dùng ưu đãi online. Gói không giảm online vẫn dùng voucher như trước.
- Giá gốc gạch ngang tại danh sách vé và từng nhóm khách trong bộ chọn; giỏ/checkout hiện tổng trước giảm và tiền tiết kiệm. Giá “Từ” vẫn ưu tiên người lớn du khách, chỉ dùng người lớn địa phương khi không có giá người lớn du khách; lấy giá gốc của đúng gói có giá bán thấp nhất.
- Khi lưu sản phẩm, web tự dùng cấu hình mới. Khi đặt đơn, server tính lại từ dữ liệu đang khóa, đối chiếu expectedTotal; client không tự quyết định tiền giảm. Giá thay đổi phải cập nhật trước khi đặt. Việc thêm vào giỏ không giữ giá hay tồn.
- Snapshot từng đơn lưu `onlineDiscount` (loại, mức, tổng tiền giảm, tổng trước giảm), các dòng lưu originalUnitPrice/unitDiscount khi có giảm. Tổng đơn/giỏ và tiền gửi qua gateway là số sau giảm. Đổi ưu đãi sau này không sửa đơn cũ. Snapshot/cost nhà cung cấp và vốn vẫn giữ lịch sử riêng.
- CSV đơn giữ nguyên cột, tiền giảm và trước giảm bao gồm ưu đãi online. Admin, phiếu in và tra cứu có ghi mức giảm đã chốt. Không biến ưu đãi thành mã voucher giả hoặc lượt dùng voucher.

Không có cấu hình thì không đổi giá; đơn cũ không cần migration. Mức 100%/giá 0 giữ hành vi đơn miễn phí hiện có, không tự tạo giao dịch 0đ ở gateway.

Kiểm thử: %/VND, nhiều nhóm khách/giá địa phương, quy tắc theo ngày, override/tắt từng gói, miễn phí/không âm, không cộng voucher, chống sửa tiền client, đơn/giỏ nhiều sản phẩm, retry và snapshot bất biến, giá POS/admin POS/CTV không giảm theo WEB.
