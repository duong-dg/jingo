# Sao lưu và khôi phục JinGo

Mặc định tạo **bản sao đầy đủ lúc 03:15 mỗi ngày, giờ Việt Nam**, giữ 7 bản hoàn chỉnh trên server. Admin → Cài đặt → **Sao lưu & khôi phục** tải file `.tar.gpg` về máy. Chỉ admin đăng nhập được tải; lượt tải được ghi vào nhật ký. CTV và tài khoản quầy không được cấp quyền này.

Bản sao chứa PostgreSQL, toàn bộ media (ảnh, file vé, thư mục ẩn, `.smtp-key`), cấu hình Compose đã resolve và `.env`. Tất cả nằm trong một file mã hóa GnuPG AES-256. **Khóa giải mã sao lưu nằm riêng, không nằm trong file tải về.** Redis được tạo mới khi phục hồi; hàng đợi chẩn đoán Redis không được giữ. Công việc email thật và dữ liệu kinh doanh nằm trong PostgreSQL.

## Cài trên Ubuntu

Sau khi cập nhật mã nguồn, build/recreate ứng dụng như bình thường; giữ cấu hình port riêng đang dùng với Nginx Proxy Manager. Compose mới gắn `/var/backups/jingo` vào API **chỉ đọc**. Không gắn Docker socket cho ứng dụng.

```bash
cd ~/jingo
git pull --ff-only
sudo docker compose --progress plain build api
sudo docker compose up -d --force-recreate web api worker
sudo apt-get update
sudo apt-get install -y python3 rsync gnupg
sudo python3 deploy/backup/jingo_backup.py install --project-dir "$PWD"
sudo python3 /usr/local/lib/jingo-backup/jingo_backup.py backup
sudo systemctl list-timers jingo-backup.timer
```

Yêu cầu Docker Compose v2, Git và systemd đã hoạt động. Lệnh install kiểm tra đúng project và container, giữ nguyên khóa nếu cài lại; nó không tạo bản sao ngay. systemd Persistent chạy bù lịch bỏ lỡ sau khi máy khởi động. Cài lại bằng lệnh install sau khi cập nhật script để cập nhật bản chạy tại `/usr/local/lib/jingo-backup`.

**Lưu riêng `/etc/jingo-backup/key` ra máy cá nhân qua phiên SSH/SFTP tin cậy**, chẳng hạn kho mật khẩu hoặc ổ đĩa mã hóa. File này chỉ root đọc được; dùng quyền sudo của bạn khi xuất ra. Không gửi nội dung khóa vào chat, email hoặc commit Git. Giữ khóa lâu hơn tất cả bản sao còn cần giải mã. Mất khóa thì không giải mã được bản sao; thay khóa cũng làm bản sao cũ cần khóa cũ. Tool không tự xoay khóa.

Khóa này khác `.smtp-key`: `.smtp-key` nằm **trong media đã mã hóa** để phục hồi mật khẩu SMTP/cổng thanh toán và các khóa đơn. Giữ cả file sao lưu và khóa giải mã ngoài server. Bản sao chỉ nằm trên cùng server chưa bảo vệ khỏi mất ổ đĩa/server.

## Tải và kiểm tra

Vào admin → Cài đặt → Sao lưu & khôi phục → Tải bản sao. Tải thường xuyên, đặc biệt sau ngày bán nhiều vé hoặc thay đổi cấu hình. Chép SHA-256 ở cùng dòng để kiểm tra file tải trên Windows:

```powershell
Get-FileHash -Algorithm SHA256 'C:\duong-dan\jingo-backup-....tar.gpg'
```

Thay tên file mẫu trong các lệnh dưới bằng file thực tế, không dán dấu `...` nguyên trạng:

```bash
sudo python3 /usr/local/lib/jingo-backup/jingo_backup.py verify /var/backups/jingo/jingo-backup-....tar.gpg
sudo python3 /usr/local/lib/jingo-backup/jingo_backup.py restore-test /var/backups/jingo/jingo-backup-....tar.gpg
```

`verify` giải mã, kiểm SHA-256 từng thành phần, cấu trúc archive và khóa media. Mỗi lần tạo bản sao còn kiểm định dạng dump bằng `pg_restore --list`. Đây chưa phải thử khôi phục database.

`restore-test` tạo **volume mới và PostgreSQL riêng, network none, không mở port**, khôi phục dump, so sánh số dòng đơn/giỏ/sản phẩm/thanh toán/file vé và giải nén media vào volume mới. Xóa tài nguyên kiểm tra sau khi xong. Khi chạy với file gốc còn trong danh sách, admin hiển thị ngày đã thử khôi phục. Nên chạy lần đầu và định kỳ, sau nâng cấp PostgreSQL/ứng dụng. Kiểm tra này không mô phỏng thanh toán, email, toàn bộ thao tác website hoặc quét vé ở cổng đối tác.

## Cơ chế vận hành

Tool chép media lần đầu khi web đang chạy. Sau đó ghi journal phục hồi rồi tạm dừng **đúng container JinGo đang chạy** (API, worker, web), chép lần cuối và dump database. Bật lại ngay trong finally; nén, mã hóa và kiểm tra diễn ra sau khi ứng dụng đã chạy lại. Không đụng JinHunt hoặc project khác. Không nên deploy, sửa trực tiếp database hoặc ghi media ngoài JinGo khi đang sao lưu. Thời gian tạm ngưng phụ thuộc lượng dữ liệu và tốc độ ổ đĩa; nên kiểm tra lần đầu trong giờ ít khách. Webhook trong khoảng này cần cơ chế retry của cổng thanh toán.

Cần chỗ trống tạm cho snapshot và kiểm tra (bảo thủ khoảng 4 lần dung lượng media + database khi chung ổ, cộng 1 GiB). Chỉ xóa bản cũ sau khi tạo bản mới và xác minh xong; bản lỗi không thay thế bản tốt. Không tự xóa bản tốt để cố chạy khi thiếu dung lượng. Có khóa file ngăn chạy hai tác vụ cùng lúc. Dữ liệu staging root-only, thư mục tải chỉ chứa ciphertext và metadata đã lọc.

```bash
sudo systemctl status jingo-backup.service jingo-backup.timer
sudo journalctl -u jingo-backup.service --since today
sudo python3 /usr/local/lib/jingo-backup/jingo_backup.py recover
```

`recover` chỉ bật lại các container đúng ID/project đã ghi trong journal khi tác vụ bị ngắt. ExecStopPost cũng gọi lệnh này. Nếu ID đã đổi do deploy, cần người vận hành kiểm tra thay vì tự khởi động project khác. Nhật ký lỗi không in mật khẩu hoặc Compose đã resolve. UI cảnh báo lần chạy thất bại/quá 36 giờ chưa có bản mới; lịch “đã cài” không chứng minh systemd hiện vẫn đang chạy. Cần xem timer trên server khi kiểm tra vận hành.

## Chuẩn bị phục hồi khi cần

Không có nút ghi đè dữ liệu đang bán trong admin. Chỉ dùng bản sao của chính bạn và khóa đúng. `pg_restore` thực thi SQL từ dump; không khôi phục file không tin cậy.

```bash
sudo python3 /usr/local/lib/jingo-backup/jingo_backup.py prepare-restore /var/backups/jingo/jingo-backup-....tar.gpg --output /opt/jingo-recovered
```

Đường dẫn output phải **chưa tồn tại**, nằm ngoài project sống. Tool tạo database/media mới, kiểm tra, thu hồi phiên admin/quầy/CTV và OTP cũ, chuyển email chưa gửi thành FAILED để không phát lại, tắt các cổng thanh toán trong database phục hồi. SMTP được giữ để admin còn nhận OTP. Không tự chạy website, không đổi NPM, không dừng dữ liệu hiện tại. Compose phục hồi giữ nguyên port/domain cũ nên chưa thể chạy cạnh website cũ trên cùng port.

File Compose và `environment.original.env` chứa thông tin nhạy cảm, thư mục chỉ root được đọc. Cấu hình đã resolve được ghim vào image ID tại thời điểm backup; ký tự `$` được escape để không bị Compose diễn giải lần hai. Network/Redis riêng. Không khôi phục custom bind mount ngoài thư mục backup chỉ đọc; cấu hình lạ cần người vận hành rà soát.

Trên máy mới, cần cài Docker, Python, GnuPG, đưa khóa sao lưu về `/etc/jingo-backup/key` với owner root/mode 600 và cài tool/config bằng source JinGo. Image không nằm trong archive: clone/build đúng revision trong metadata, tải image PostgreSQL **cùng major**, rồi chỉ rõ image có trên máy:

```bash
sudo python3 /usr/local/lib/jingo-backup/jingo_backup.py prepare-restore /duong-dan/backup.tar.gpg --output /opt/jingo-recovered --app-image jingo-app:local --postgres-image postgres:17-bookworm
```

Nếu máy mới chưa cài backup, có thể tạo `/etc/jingo-backup/config.json` root-only với các khóa `projectDir` (thư mục source), `backupDir` (`/var/backups/jingo`), `stateDir` (`/var/lib/jingo-backup`), `keyFile` (`/etc/jingo-backup/key`), `keep` (7); không cần bật timer hay có stack đang chạy để dùng prepare-restore. Key phải là file nguyên gốc đã giữ riêng.

Sau khi kiểm tra dữ liệu phục hồi và chuẩn bị chuyển đổi trong thời gian bảo trì:

1. Tạm tắt timer cũ: `sudo systemctl disable --now jingo-backup.timer`. Chờ tác vụ đang chạy xong; không kill cưỡng bức giữa snapshot.
2. Trong thư mục **project JinGo cũ**, `sudo docker compose stop web api worker postgres redis`. Không dùng `down -v`, không đụng JinHunt.
3. `sudo docker compose --project-directory /opt/jingo-recovered up -d --no-build`. Kiểm tra health/log, đăng nhập OTP, ảnh, file vé, đơn hàng và địa chỉ NPM trước khi nhận khách.
4. Đối soát ngân hàng/cổng thanh toán, vé nhà cung cấp và các đơn phát sinh **sau thời điểm backup** trước khi bật lại thanh toán. Backup không chứa giao dịch mới hơn snapshot; không tự nhận lại hay tự hoàn tiền.
5. Khi đã chọn bản phục hồi làm hệ thống chính, cài lại lịch trỏ tới project mới bằng `install --project-dir /opt/jingo-recovered --replace-project` (cùng tool và khóa). Giữ bản cũ để đối chiếu. Script dùng source-revision khi project phục hồi không có Git. Các lần nâng cấp sau cần cập nhật image ID ghim trong Compose phục hồi bằng image đã build/test, không chỉ chạy build rồi tưởng image đang chạy đã đổi.

Nếu chưa đạt yêu cầu, dừng **project phục hồi** trước khi bật lại JinGo cũ. Không chạy hai hệ thống cùng nhận đơn/thanh toán. Không xóa volume cũ bằng các lệnh dọn Docker tự động.

## Kiểm chứng trong repository

```bash
python3 -m unittest discover -s deploy/backup -v
```

Tests dùng GnuPG thật cho vòng mã hóa/giải mã, sai khóa, file hỏng; các thao tác Docker dùng mô phỏng để kiểm tra phục hồi container khi lỗi và cô lập tài nguyên. API test kiểm tra quyền tải, metadata, file thiếu/hỏng và audit. **Chưa chạy Docker/PostgreSQL thật trên server của bạn**: cần chạy backup + restore-test trên Ubuntu sau khi cài.

Tham khảo: [PostgreSQL SQL dump](https://www.postgresql.org/docs/17/backup-dump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html), [systemd timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html).
