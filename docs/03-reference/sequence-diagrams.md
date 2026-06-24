# Sequence Diagrams — Các hành trình chính

Sơ đồ tuần tự (Mermaid) cho **những luồng nghiệp vụ quan trọng** của
`@tourism/api`, dựng từ 3 catalog function:
[functions-customer.md](functions-customer.md) ·
[functions-admin.md](functions-admin.md) ·
[functions-system.md](functions-system.md).

Mỗi sơ đồ kể **một câu chuyện**, viết nhãn tiếng Việt đời thường để người
không rành kỹ thuật vẫn hiểu đang xảy ra điều gì; mã function (vd `U-BKG-1`) ghi
ở cuối mỗi mục để tra ngược về catalog.

> Các sơ đồ này render trực tiếp trên GitHub/VS Code (có hỗ trợ Mermaid). Trong
> VS Code, mở Preview (`Ctrl+Shift+V`) để xem hình.

---

## Cách đọc một sơ đồ tuần tự (cho người mới)

- **Cột dọc** = một "người" hoặc một "hệ thống" tham gia. Hình 👤 (que) là **con
  người**; hình hộp là **hệ thống/dịch vụ**.
- **Thời gian chạy từ trên xuống dưới.** Số thứ tự ở đầu mỗi dòng = bước 1, 2, 3…
- **Mũi tên liền `───▶`** = ai đó **gửi yêu cầu / ra lệnh** cho bên kia.
- **Mũi tên đứt `┄┄▶`** = **kết quả trả về**.
- **Ô ghi chú (màu vàng)** = giải thích **"vì sao"** bước đó tồn tại.
- **Khối `alt / else`** = các **tình huống có thể xảy ra** (vd: còn ghế / hết ghế).
- **Khối `loop`** = việc **lặp lại** (vd: gửi từng email một).

### Các "nhân vật" xuất hiện xuyên suốt

| Nhân vật | Là gì |
| --- | --- |
| **Khách** / **Quản trị** | Người dùng cuối (con người) |
| **Giao diện web/app** | Trang web hoặc app khách đang bấm (frontend) |
| **Máy chủ Tourism** | Backend `@tourism/api` — bộ não xử lý nghiệp vụ |
| **Cơ sở dữ liệu** | Nơi lưu đơn hàng, tour, đánh giá… (Postgres) |
| **Cổng Stripe / PayPal** | Dịch vụ thu tiền bên ngoài |
| **Cloudinary** | Kho lưu ảnh/video bên ngoài |
| **Tác vụ nền** | "Người làm thầm lặng" chạy theo lịch (pg-boss) |
| **Dịch vụ email (Resend)** | Bên thực sự gửi email đi |
| **Supabase** | Dịch vụ lo việc đăng nhập/mật khẩu |

---

## 1. Đăng nhập & đồng bộ tài khoản

Khách đăng nhập qua Supabase, sau đó máy chủ "ghi nhận" tài khoản vào hệ thống
nội bộ để biết ai đang thao tác.

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện web/app
    participant SUPA as Supabase
    participant API as Máy chủ Tourism
    participant DB as Cơ sở dữ liệu

    KH->>FE: Nhập email + mật khẩu, bấm Đăng nhập
    FE->>SUPA: Nhờ kiểm tra đăng nhập
    SUPA-->>FE: Cấp "vé thông hành" (token)
    FE->>API: Gửi token kèm yêu cầu đồng bộ (POST /auth/sync)
    API->>API: Kiểm tra token có hợp lệ không
    API->>DB: Tạo mới hoặc cập nhật hồ sơ khách
    DB-->>API: Hồ sơ khách
    API-->>FE: Hồ sơ đã đồng bộ
    FE-->>KH: Vào trang cá nhân
    Note over API,DB: Vai trò mặc định là CUSTOMER và KHÔNG bao giờ bị hạ cấp<br/>khi khách đăng nhập lại
```

> **Quản trị viên** đi đường riêng (`POST /auth/admin/sync`): email bắt buộc nằm
> trong danh sách cho phép `ADMIN_EMAILS`, nếu không sẽ bị từ chối (403).
>
> _Liên quan:_ `U-USR-1` · `A-USR-1`

---

## 2. Đặt tour & thanh toán bằng thẻ (Stripe)

Hành trình "xương sống" của sản phẩm: từ lúc khách chọn tour đến khi nhận email
xác nhận. **Điểm mấu chốt:** ghế chỉ bị trừ khi tiền đã thực sự vào.

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện web/app
    participant API as Máy chủ Tourism
    participant DB as Cơ sở dữ liệu
    participant PAY as Cổng Stripe
    participant JOB as Tác vụ nền
    participant MAIL as Dịch vụ email

    KH->>FE: Chọn tour, ngày đi, số khách
    FE->>API: Tạo đơn (POST /bookings)
    API->>DB: Kiểm tra tour mở bán, chuyến còn ghế
    API->>DB: Lưu đơn trạng thái CHỜ THANH TOÁN (mã BK-xxxx)
    DB-->>API: Đơn đã tạo
    API-->>KH: Trả mã đơn
    Note over API,DB: Chưa giữ ghế ở bước này — tránh "ôm ghế" rồi không trả tiền

    KH->>FE: Bấm Thanh toán
    FE->>API: Mở thanh toán (POST /bookings/{ma}/checkout)
    API->>PAY: Tạo phiên thanh toán
    PAY-->>API: Đường link trả tiền
    API-->>FE: Chuyển khách sang trang Stripe
    KH->>PAY: Nhập thẻ và trả tiền

    PAY->>API: Báo "đã thanh toán" (webhook có chữ ký)
    API->>API: Xác minh chữ ký + chống xử lý trùng
    alt Còn ghế
        API->>DB: Trừ ghế + chuyển đơn ĐÃ THANH TOÁN + xếp email vào hàng đợi<br/>(làm gộp trong 1 thao tác, không thể nửa vời)
    else Hết ghế vì người khác vừa đặt
        API->>PAY: Tự động hoàn tiền
        API->>DB: Chuyển đơn ĐÃ HOÀN TIỀN
    end
    API-->>PAY: Xác nhận đã nhận tin

    JOB->>DB: Lấy email đang chờ trong hàng đợi
    JOB->>MAIL: Gửi email xác nhận đặt tour
    MAIL-->>KH: Email "Đặt tour thành công"
```

> _Liên quan:_ `U-BKG-1` (tạo đơn) · `U-BKG-4` (mở thanh toán) · `S-PAY-1`
> (webhook Stripe) · `S-JOB-1` (gửi email).

---

## 3. Đặt tour & thanh toán bằng PayPal

Giống Stripe ở phần tạo đơn, nhưng PayPal **thu tiền ngay khi khách quay lại
web** thay vì chờ webhook.

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện web/app
    participant API as Máy chủ Tourism
    participant DB as Cơ sở dữ liệu
    participant PP as Cổng PayPal

    Note over KH,API: (Đã có đơn CHỜ THANH TOÁN, tạo như bước đầu của sơ đồ Stripe)
    KH->>FE: Bấm Thanh toán
    FE->>API: Mở thanh toán (POST /bookings/{ma}/checkout)
    API->>PP: Tạo đơn hàng PayPal
    PP-->>API: Link duyệt thanh toán
    API-->>FE: Chuyển khách sang PayPal
    KH->>PP: Đăng nhập và duyệt trả tiền
    PP-->>FE: Quay lại web sau khi duyệt
    FE->>API: Thu tiền (POST /bookings/{ma}/capture)
    API->>PP: Yêu cầu thu tiền
    PP-->>API: Đã thu tiền
    alt Còn ghế
        API->>DB: Trừ ghế + đơn ĐÃ THANH TOÁN + xếp email (1 thao tác gộp)
    else Hết ghế
        API->>PP: Hoàn tiền
        API->>DB: Đơn ĐÃ HOÀN TIỀN
    end
    API-->>KH: Trạng thái đơn cuối cùng
    Note over PP,API: Nếu khách lỡ đóng trình duyệt giữa chừng,<br/>webhook PayPal (S-PAY-2) sẽ tự chốt đơn thay — không thất lạc tiền
```

> Sau khi đơn chuyển ĐÃ THANH TOÁN, email xác nhận được gửi qua tác vụ nền
> (xem **sơ đồ 8 — Hàng đợi email**).
>
> _Liên quan:_ `U-BKG-1` · `U-BKG-4` · `U-BKG-5` (thu tiền) · `S-PAY-2` (webhook
> dự phòng) · `S-JOB-1`.

---

## 4. Hoàn tiền cho khách (quản trị)

Quy tắc an toàn: **gọi cổng hoàn tiền TRƯỚC**, chỉ khi tiền thật sự rời đi mới
cập nhật trạng thái — tránh ghi "đã hoàn" mà tiền vẫn còn.

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị
    participant FE as Trang quản trị
    participant API as Máy chủ Tourism
    participant PAY as Cổng thanh toán
    participant DB as Cơ sở dữ liệu
    participant JOB as Tác vụ nền
    participant MAIL as Dịch vụ email
    actor KH as Khách

    AD->>FE: Chọn đơn ĐÃ THANH TOÁN, nhập lý do, bấm Hoàn tiền
    FE->>API: Yêu cầu hoàn (POST /admin/bookings/{ma}/refund)
    API->>API: Kiểm tra đơn hợp lệ (đã trả tiền + có mã giao dịch)
    API->>PAY: Yêu cầu hoàn tiền
    alt Cổng hoàn tiền thành công
        PAY-->>API: Đã hoàn
        API->>DB: Trả ghế lại + đơn ĐÃ HOÀN TIỀN + lưu lý do/người duyệt + xếp email
        API-->>FE: Đơn đã hoàn
        JOB->>MAIL: Gửi email báo đã hoàn tiền
        MAIL-->>KH: Email "Đã hoàn tiền cho bạn"
    else Cổng báo lỗi
        PAY-->>API: Lỗi
        API-->>FE: Báo lỗi — đơn vẫn ĐÃ THANH TOÁN, có thể thử lại
    end
```

> _Liên quan:_ `A-BKG-3` (hoàn tiền) · `S-JOB-1` (email).

---

## 5. Viết & duyệt đánh giá

Đánh giá của khách **mặc định bị ẩn**, chờ quản trị kiểm trước rồi mới hiển thị
công khai — chống nội dung spam/bậy.

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FEC as Web khách
    participant API as Máy chủ Tourism
    participant DB as Cơ sở dữ liệu
    actor AD as Quản trị
    participant FEA as Trang quản trị
    participant JOB as Tác vụ nền
    participant MAIL as Dịch vụ email

    KH->>FEC: Viết đánh giá cho tour đã đi
    FEC->>API: Gửi đánh giá (POST /reviews, kèm mã đơn)
    API->>DB: Kiểm tra đơn đúng của khách và đã hoàn tất
    API->>DB: Lưu đánh giá ở trạng thái CHỜ DUYỆT (ẩn)
    API-->>KH: Đã gửi, chờ duyệt
    Note over API,DB: Mỗi đơn chỉ được đánh giá 1 lần

    AD->>FEA: Mở hàng chờ duyệt (GET /admin/reviews)
    AD->>FEA: Bấm Duyệt
    FEA->>API: Duyệt đánh giá (PATCH /admin/reviews/{id}/moderation)
    API->>DB: Bật hiển thị công khai + xếp email vào hàng đợi
    JOB->>MAIL: Gửi email "Đánh giá đã được duyệt"
    MAIL-->>KH: Email cảm ơn
    Note over FEC,DB: Từ đây đánh giá hiện công khai trên trang tour (chỉ lộ tên người viết)
```

> _Liên quan:_ `U-REV-2` (viết) · `A-REV-1` (hàng chờ) · `A-REV-2` (duyệt) ·
> `S-JOB-1` (email).

---

## 6. Gửi yêu cầu tư vấn (Enquiry)

Form công khai "Inquire Now" — ai cũng gửi được, nên có **lớp chặn bot** trước
khi lưu vào hệ thống bán hàng.

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện web/app
    participant API as Máy chủ Tourism
    participant DB as Cơ sở dữ liệu
    participant JOB as Tác vụ nền
    participant MAIL as Dịch vụ email

    KH->>FE: Điền form tư vấn (tên, email, nhu cầu chuyến đi)
    FE->>API: Gửi yêu cầu (POST /enquiries)
    API->>API: Chặn spam — giới hạn 5 lần/phút + bẫy ô ẩn (honeypot)
    alt Phát hiện là bot
        API-->>FE: Trả phản hồi giả "đã nhận" (KHÔNG lưu, không cho bot biết)
    else Khách thật
        API->>DB: Lưu yêu cầu trạng thái MỚI + xếp email xác nhận
        API-->>KH: Đã nhận yêu cầu của bạn
        JOB->>MAIL: Gửi email xác nhận
        MAIL-->>KH: Email "Chúng tôi đã nhận yêu cầu"
    end
    Note over DB: Đội Sales xem lead trong trang quản trị và<br/>kéo trạng thái MỚI sang ĐÃ LIÊN HỆ sang BÁO GIÁ sang CHỐT/HỦY
```

> _Liên quan:_ `U-ENQ-1` (gửi) · `A-ENQ-1`/`A-ENQ-2` (CRM) · `S-JOB-1` (email).

---

## 7. Tải ảnh lên (2 bước, qua Cloudinary)

Tại sao upload lại **2 bước**? Để file ảnh đi **thẳng** lên kho Cloudinary,
**không chạy qua máy chủ** — nhanh hơn và đỡ tải cho server. Máy chủ chỉ cấp
"giấy phép" và ghi lại địa chỉ ảnh.

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị
    participant FE as Trang quản trị
    participant API as Máy chủ Tourism
    participant CLD as Cloudinary
    participant DB as Cơ sở dữ liệu

    AD->>FE: Chọn ảnh cho tour / điểm đến / avatar
    FE->>API: Xin giấy phép tải lên (POST /admin/uploads/signed-url)
    API->>API: Kiểm tra định dạng + ký "giấy phép" an toàn
    API-->>FE: Giấy phép (chữ ký) + chỗ lưu (publicId)
    FE->>CLD: Tải thẳng file ảnh lên Cloudinary
    Note over FE,CLD: File KHÔNG đi qua máy chủ Tourism
    CLD-->>FE: Tải lên xong
    FE->>API: Lưu địa chỉ ảnh vào tour/điểm đến/avatar
    API->>DB: Ghi lại thông tin ảnh
    API-->>AD: Xong, hiển thị ảnh
    Note over DB,CLD: Ảnh cũ bị thay sẽ được đánh dấu "rác" để dọn sau (xem sơ đồ 9)
```

> _Liên quan:_ `A-MED-1` (cấp giấy phép) · `A-TUR-5` / `A-DST-5` / `U-USR-4`
> (lưu địa chỉ ảnh).

---

## 8. Hàng đợi gửi email tự động (Outbox)

Vì sao không gửi email ngay? Để lúc khách thanh toán xong **được phản hồi tức
thì**; còn email gửi ở phía sau — nếu dịch vụ email trục trặc thì **tự thử lại**,
không làm hỏng giao dịch.

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Lịch chạy mỗi phút
    participant JOB as Tác vụ nền
    participant DB as Cơ sở dữ liệu
    participant MAIL as Dịch vụ email
    actor KH as Người nhận

    CRON->>JOB: Đến giờ chạy
    JOB->>DB: Lấy các email đang chờ gửi
    DB-->>JOB: Danh sách email
    loop Lần lượt từng email
        JOB->>MAIL: Nhờ gửi đi
        alt Gửi thành công
            MAIL-->>KH: Email tới hộp thư
            JOB->>DB: Đánh dấu ĐÃ GỬI
        else Gặp lỗi
            JOB->>DB: Ghi nhận lỗi + hẹn gửi lại lần sau
        end
    end
    Note over DB: Mỗi email có "khóa chống trùng" nên không bao giờ gửi 2 lần
```

> _Liên quan:_ `S-JOB-1` (worker `outbox-drain`). Đây là nơi mọi email ở các sơ
> đồ trên thực sự được gửi đi.

---

## 9. Hai việc dọn dẹp tự động

Hệ thống tự "quét nhà" theo lịch: hủy đơn bị bỏ dở và xóa ảnh không còn ai dùng.

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Lịch chạy
    participant JOB as Tác vụ nền
    participant DB as Cơ sở dữ liệu
    participant CLD as Cloudinary

    Note over CRON,JOB: Việc 1 — Dọn đơn bỏ dở (mỗi 15 phút)
    CRON->>JOB: Đến giờ
    JOB->>DB: Tìm đơn CHỜ THANH TOÁN quá 30 phút chưa trả tiền
    JOB->>DB: Chuyển sang ĐÃ HỦY
    Note over JOB,DB: Không đụng tới ghế (vì đơn chưa trả tiền thì chưa giữ ghế)

    Note over CRON,JOB: Việc 2 — Dọn ảnh không dùng (mỗi ngày, 3h sáng)
    CRON->>JOB: Đến giờ
    JOB->>DB: Lấy danh sách ảnh đã bị đánh dấu "rác"
    JOB->>CLD: Xóa ảnh khỏi kho
    CLD-->>JOB: Đã xóa (hoặc ảnh vốn không còn)
    JOB->>DB: Gỡ ảnh khỏi danh sách rác
```

> _Liên quan:_ `S-JOB-2` (hủy đơn bỏ dở) · `S-JOB-3` (dọn ảnh mồ côi).

---

## 10. Giữ hệ thống luôn sẵn sàng (health & keep-alive)

Bản miễn phí của máy chủ sẽ **"ngủ"** nếu không ai dùng một thời gian. Một đồng
hồ hẹn giờ "chọc nhẹ" mỗi phút để giữ hệ thống **luôn thức** và sẵn sàng phục vụ.

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Đồng hồ keep-alive
    participant API as Máy chủ Tourism
    participant DB as Cơ sở dữ liệu

    CRON->>API: Hỏi thăm "còn khỏe không?" (GET /health)
    API->>DB: Thử một câu lệnh nhỏ (SELECT 1)
    alt Cơ sở dữ liệu bình thường
        DB-->>API: Ổn
        API-->>CRON: "Khỏe" (status ok)
    else Cơ sở dữ liệu trục trặc
        DB-->>API: Không phản hồi
        API-->>CRON: Báo lỗi 503 (để cảnh báo sớm)
    end
    Note over CRON,DB: Cú "hỏi thăm" này vừa giữ máy chủ khỏi ngủ,<br/>vừa giữ cơ sở dữ liệu Supabase khỏi bị tạm dừng
```

> _Liên quan:_ `S-SYS-2` (`/health`) · `S-SYS-1` (`/` liveness).

---

## Lịch sử

- **2026-06-24** — Khởi tạo bộ sequence diagram (Mermaid) cho 10 hành trình chính,
  nhãn tiếng Việt cho người non-tech. Dựng từ các function tag `Sequence` trong 3
  catalog `functions-*.md`. Mỗi sơ đồ ghi mã function liên quan để tra ngược.
