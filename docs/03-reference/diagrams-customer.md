# Sequence Diagrams — Customer (mỗi function một sơ đồ)

Sơ đồ tuần tự **riêng cho từng function khách hàng** trong
[functions-customer.md](functions-customer.md). Mỗi mục = 1 function, gọn trong
một khổ A4. Sơ đồ kể chuyện end-to-end nhiều bước xem ở
[sequence-diagrams.md](sequence-diagrams.md).

> **Cách đọc nhanh:** 👤 = con người · hộp = hệ thống · mũi tên liền = yêu cầu ·
> mũi tên đứt = phản hồi · `alt/else` = các tình huống · ô ghi chú = giải thích
> "vì sao". Nhân vật: **Khách** · **Giao diện** (web/app) · **Máy chủ** (`@tourism/api`)
> · **Cơ sở dữ liệu** · **Supabase** (đăng nhập) · **Cổng thanh toán** ·
> **Tác vụ nền** (job theo lịch).

---

## Account · `User`

### U-USR-1 — Sync Account (`POST /auth/sync`)

Đăng nhập qua Supabase rồi "ghi nhận" tài khoản vào hệ thống nội bộ.

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant SUPA as Supabase
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Đăng nhập / đăng ký
    FE->>SUPA: Nhờ xác thực
    SUPA-->>FE: Cấp vé thông hành (token)
    FE->>API: Gửi token kèm yêu cầu đồng bộ
    API->>API: Xác minh chữ ký token
    API->>DB: Tạo / cập nhật hồ sơ (vai trò CUSTOMER)
    DB-->>API: Hồ sơ
    API-->>FE: Hồ sơ đã đồng bộ
    Note over API,DB: Đăng nhập lại KHÔNG bao giờ hạ cấp vai trò
```

### U-USR-2 — View Profile (`GET /users/me`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Mở trang cá nhân
    FE->>API: Xin hồ sơ (kèm token)
    API->>API: Xác minh token, tìm user nội bộ
    API->>DB: Lấy hồ sơ + ảnh đại diện
    DB-->>API: Hồ sơ
    API-->>FE: Hồ sơ kèm avatar
    Note over API,FE: Chưa đồng bộ tài khoản → báo lỗi 401
```

### U-USR-3 — Update Profile (`PATCH /users/me`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Sửa tên / số điện thoại
    FE->>API: Gửi thay đổi
    API->>API: Kiểm tra dữ liệu (email & vai trò KHÔNG cho đổi)
    API->>DB: Cập nhật hồ sơ
    DB-->>API: Hồ sơ mới
    API-->>FE: Hồ sơ đã cập nhật
```

### U-USR-4 — Set Avatar (`PUT /users/me/avatar`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    Note over KH,FE: Ảnh đã được tải lên Cloudinary trước (xem A-MED-1)
    KH->>FE: Chọn ảnh đại diện
    FE->>API: Gửi địa chỉ ảnh (publicId)
    API->>DB: Thay toàn bộ ảnh đại diện (ghi đè)
    DB-->>API: Xong
    API-->>FE: Hồ sơ kèm avatar mới
```

### U-USR-5 — Clear Avatar (`DELETE /users/me/avatar`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Gỡ ảnh đại diện
    FE->>API: Yêu cầu xóa avatar
    API->>DB: Xóa avatar + đánh dấu ảnh "rác" để dọn sau
    DB-->>API: Xong
    API-->>FE: Hồ sơ (không còn avatar)
    Note over DB: Ảnh rác được tác vụ nền dọn khỏi Cloudinary (S-JOB-3)
```

---

## `Destination` (công khai)

### U-DST-1 — Browse Destinations (`GET /destinations`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Mở trang điểm đến
    FE->>API: Xin danh sách (trang, tìm kiếm, sắp xếp)
    API->>DB: Lấy điểm đến đang hiển thị + đếm tổng
    DB-->>API: Danh sách + tổng
    API-->>FE: Danh sách + thông tin phân trang
    FE-->>KH: Hiển thị
```

### U-DST-2 — Destination Detail (`GET /destinations/{slug}`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Chọn một điểm đến
    FE->>API: Xin chi tiết theo slug
    API->>DB: Tìm điểm đến đang hiển thị
    alt Tìm thấy
        DB-->>API: Chi tiết + ảnh
        API-->>FE: Chi tiết
    else Không có hoặc đang ẩn
        API-->>FE: Báo lỗi 404
    end
```

---

## `TourCategory` (công khai)

### U-CAT-1 — List Categories (`GET /tour-categories`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Mở bộ lọc danh mục
    FE->>API: Xin danh mục
    API->>DB: Lấy danh mục đang bật, sắp theo thứ tự
    DB-->>API: Danh sách
    API-->>FE: Danh sách danh mục
```

### U-CAT-2 — Category Detail (`GET /tour-categories/{slug}`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Chọn một danh mục
    FE->>API: Xin chi tiết theo slug
    API->>DB: Tìm danh mục đang bật
    alt Tìm thấy
        DB-->>API: Chi tiết
        API-->>FE: Chi tiết
    else Không có
        API-->>FE: Báo lỗi 404
    end
```

---

## `Tour` (công khai)

### U-TUR-1 — Browse / Search Tours (`GET /tours`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Mở danh mục tour, lọc / tìm kiếm
    FE->>API: Xin danh sách (danh mục, điểm đến, giá, nổi bật, từ khóa)
    API->>API: Kiểm tra tiêu chí sắp xếp hợp lệ (chống injection)
    API->>DB: Lấy tour ĐÃ ĐĂNG + đếm tổng
    DB-->>API: Danh sách + tổng
    API-->>FE: Danh sách (kèm ảnh, nhãn) + phân trang
```

### U-TUR-2 — Tour Detail (`GET /tours/{slug}`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Chọn tour
    FE->>API: Xin chi tiết theo slug
    API->>DB: Tải tour đã đăng + danh mục + điểm đến + lịch trình + FAQ + chính sách + ảnh
    alt Có và đã đăng
        DB-->>API: Chi tiết đầy đủ
        API-->>FE: Chi tiết
    else Chưa đăng / không có
        API-->>FE: Báo lỗi 404 (không lộ bản nháp)
    end
```

---

## `TourDeparture` (công khai)

### U-DEP-1 — View Departures (`GET /tours/{slug}/departures`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Xem các ngày khởi hành
    FE->>API: Xin lịch khởi hành (mặc định tương lai + còn mở)
    API->>DB: Lấy chuyến đang mở + tính số ghế còn lại
    DB-->>API: Danh sách chuyến
    API-->>FE: Danh sách kèm số ghế còn
```

---

## `Review`

### U-REV-1 — View Tour Reviews (`GET /tours/{slug}/reviews`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Xem đánh giá của tour
    FE->>API: Xin danh sách đánh giá
    API->>DB: Kiểm tra tour đã đăng; lấy đánh giá ĐÃ DUYỆT
    DB-->>API: Danh sách + điểm trung bình
    API-->>FE: Danh sách (chỉ lộ tên người viết)
    Note over API,FE: Ẩn thông tin cá nhân khác
```

### U-REV-2 — Write Review (`POST /reviews`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Viết đánh giá cho tour đã đi
    FE->>API: Gửi đánh giá (kèm mã đơn)
    API->>DB: Kiểm tra đơn của khách + đã thanh toán + chưa từng đánh giá
    API->>DB: Lưu đánh giá CHỜ DUYỆT (ẩn)
    DB-->>API: Xong
    API-->>FE: Đã gửi, chờ admin duyệt (A-REV-2)
```

---

## `Booking`

### U-BKG-1 — Create Booking (`POST /bookings`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Chọn tour + chuyến + số khách
    FE->>API: Tạo đơn
    API->>DB: Kiểm tra tour đăng, chuyến mở, còn ghế
    API->>DB: Tạo đơn CHỜ THANH TOÁN (mã BK-xxxx)
    DB-->>API: Đơn
    API-->>FE: Mã đơn
    Note over API,DB: Chưa giữ ghế — ghế chỉ trừ khi đã trả tiền
```

### U-BKG-2 — My Bookings (`GET /bookings/me`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Mở "Đơn của tôi"
    FE->>API: Xin danh sách đơn
    API->>DB: Lấy đơn của khách (mới nhất trước) + tên tour + ngày đi
    DB-->>API: Danh sách
    API-->>FE: Danh sách đơn
```

### U-BKG-3 — Booking Detail (`GET /bookings/{ma}`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Chọn đơn theo mã
    FE->>API: Xin chi tiết đơn
    API->>DB: Tìm đơn theo mã
    API->>API: Chỉ chủ đơn hoặc admin được xem
    alt Đúng chủ đơn / admin
        DB-->>API: Chi tiết
        API-->>FE: Chi tiết + tour + chuyến
    else Người khác
        API-->>FE: Báo lỗi 404 (chống dò mã)
    end
```

### U-BKG-4 — Start Checkout (`POST /bookings/{ma}/checkout`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    participant PAY as Cổng thanh toán
    KH->>FE: Bấm Thanh toán
    FE->>API: Mở thanh toán cho đơn
    API->>API: Phải là chủ đơn + đơn CHỜ THANH TOÁN
    API->>PAY: Tạo phiên / đơn thanh toán
    alt Cổng tạo OK
        PAY-->>API: Link thanh toán
        API->>DB: Lưu mã phiên
        API-->>FE: Chuyển khách sang trang cổng
    else Cổng lỗi
        API-->>FE: Báo lỗi (đơn vẫn chờ, thử lại được)
    end
```

### U-BKG-5 — Capture PayPal (`POST /bookings/{ma}/capture`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant PP as Cổng PayPal
    participant DB as Cơ sở dữ liệu
    KH->>FE: Quay lại web sau khi duyệt PayPal
    FE->>API: Yêu cầu thu tiền
    API->>PP: Thu tiền (capture)
    PP-->>API: Đã thu
    alt Còn ghế
        API->>DB: Trừ ghế + ĐÃ THANH TOÁN + xếp email (gộp 1 thao tác)
    else Hết ghế
        API->>PP: Hoàn tiền
        API->>DB: Đơn ĐÃ HOÀN TIỀN
    end
    API-->>FE: Trạng thái đơn
```

### U-BKG-6 — Cancel Booking (`POST /bookings/{ma}/cancel`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Hủy đơn chưa trả tiền
    FE->>API: Yêu cầu hủy
    API->>API: Phải là chủ đơn + đơn CHỜ THANH TOÁN
    API->>DB: Chuyển ĐÃ HỦY
    DB-->>API: Xong
    API-->>FE: Đơn đã hủy
    Note over API,DB: Đơn đã trả tiền phải đi qua hoàn tiền của admin (A-BKG-3)
```

---

## `Wishlist`

### U-WSH-1 — Add to Wishlist (`POST /wishlist/{tourId}`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Bấm thích một tour
    FE->>API: Thêm vào yêu thích
    API->>DB: Kiểm tra tour tồn tại + đã đăng
    API->>DB: Thêm vào yêu thích (thích lại cũng không lỗi)
    DB-->>API: Xong
    API-->>FE: Đã thêm
```

### U-WSH-2 — Remove from Wishlist (`DELETE /wishlist/{tourId}`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Bỏ thích
    FE->>API: Xóa khỏi yêu thích
    API->>DB: Xóa (không có cũng không lỗi)
    DB-->>API: Xong
    API-->>FE: Đã bỏ
```

### U-WSH-3 — View Wishlist (`GET /wishlist/me`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Mở danh sách yêu thích
    FE->>API: Xin danh sách
    API->>DB: Lấy danh sách + preview tour (mới nhất trước)
    DB-->>API: Danh sách
    API-->>FE: Danh sách (kèm cờ tour còn đăng hay không)
```

---

## `Enquiry` (công khai)

### U-ENQ-1 — Submit Enquiry (`POST /enquiries`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Điền form tư vấn
    FE->>API: Gửi yêu cầu (công khai)
    API->>API: Chặn spam — 5 lần/phút + bẫy ô ẩn
    alt Phát hiện là bot
        API-->>FE: Phản hồi giả "đã nhận" (KHÔNG lưu)
    else Khách thật
        API->>DB: Lưu yêu cầu MỚI + xếp email xác nhận
        API-->>KH: Đã nhận yêu cầu
    end
    Note over DB: Email xác nhận gửi qua tác vụ nền (S-JOB-1)
```

---

## `Post` (blog công khai)

### U-PST-1 — List Posts (`GET /posts`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Mở trang blog
    FE->>API: Xin danh sách bài (trang, tìm kiếm)
    API->>DB: Lấy bài ĐÃ ĐĂNG và tới giờ hiển thị
    DB-->>API: Danh sách
    API-->>FE: Danh sách bài
```

### U-PST-2 — Post Detail (`GET /posts/{slug}`)

```mermaid
sequenceDiagram
    autonumber
    actor KH as Khách
    participant FE as Giao diện
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    KH->>FE: Chọn bài viết
    FE->>API: Xin chi tiết theo slug
    API->>DB: Tìm bài đã đăng + tới giờ hiển thị
    alt Có
        DB-->>API: Nội dung
        API-->>FE: Chi tiết bài
    else Nháp / hẹn giờ / không có
        API-->>FE: Báo lỗi 404
    end
```

---

## Lịch sử

- **2026-06-24** — Khởi tạo bộ sequence diagram **mỗi function một sơ đồ** cho phía
  customer (U-USR…U-PST), nhãn tiếng Việt, gọn khổ A4. Đối chiếu
  [functions-customer.md](functions-customer.md); sơ đồ tổng quan ở
  [sequence-diagrams.md](sequence-diagrams.md).
