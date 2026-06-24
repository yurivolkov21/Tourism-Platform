# Sequence Diagrams — System (mỗi function một sơ đồ)

Sơ đồ tuần tự **riêng cho từng function hệ thống** trong
[functions-system.md](functions-system.md): kiểm tra sức khỏe, webhook thanh toán,
và job nền theo lịch. Mỗi mục = 1 function, gọn trong một khổ A4.

> **Cách đọc nhanh:** hộp = hệ thống / dịch vụ · mũi tên liền = yêu cầu · mũi tên
> đứt = phản hồi · `alt/else` = các tình huống · `loop` = lặp lại · ô ghi chú =
> giải thích "vì sao". Các function này **không do người dùng bấm** — chúng do máy
> tự gọi (probe, cổng thanh toán, hoặc đồng hồ hẹn giờ). Nhân vật: **Trình kiểm
> tra/Đồng hồ** · **Máy chủ** (`@tourism/api`) · **Cơ sở dữ liệu** · **Cổng thanh
> toán** · **Tác vụ nền** (pg-boss) · **Dịch vụ email** · **Cloudinary**.

---

## Liveness / Readiness

### S-SYS-1 — Root / Liveness (`GET /`)

Kiểm tra máy chủ "có sống không" — không đụng cơ sở dữ liệu.

```mermaid
sequenceDiagram
    autonumber
    participant PROBE as Trình kiểm tra
    participant API as Máy chủ
    PROBE->>API: Gọi địa chỉ gốc
    API-->>PROBE: Trả thông điệp cơ bản (không chạm dữ liệu)
```

### S-SYS-2 — Readiness / Health (`GET /health`)

Kiểm tra máy chủ "có sẵn sàng phục vụ không" — có thử chạm cơ sở dữ liệu. Đồng hồ
keep-alive gọi mỗi phút để giữ hệ thống luôn thức.

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Đồng hồ keep-alive
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    CRON->>API: Hỏi thăm sức khỏe
    API->>DB: Thử một câu lệnh nhỏ
    alt Dữ liệu bình thường
        DB-->>API: Ổn
        API-->>CRON: Khỏe (trạng thái ok)
    else Dữ liệu trục trặc
        DB-->>API: Không phản hồi
        API-->>CRON: Báo lỗi 503 (cảnh báo sớm)
    end
    Note over CRON,DB: Cú hỏi thăm này giữ máy chủ khỏi ngủ + giữ Supabase khỏi bị tạm dừng
```

---

## `PaymentEvent` — Webhooks (cổng thanh toán tự gọi)

### S-PAY-1 — Stripe Webhook (`POST /payments/stripe/webhook`)

Stripe chủ động báo về khi khách trả tiền xong. Đây là nơi đơn được chốt PAID.

```mermaid
sequenceDiagram
    autonumber
    participant PAY as Cổng Stripe
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    PAY->>API: Báo sự kiện "đã thanh toán" (kèm chữ ký)
    API->>API: Xác minh chữ ký trên dữ liệu thô (sai thì 400) + chống xử lý trùng
    alt Thanh toán xong và còn ghế
        API->>DB: Trừ ghế + ĐÃ THANH TOÁN + xếp email xác nhận (gộp 1 thao tác)
    else Hết ghế (đặt trùng cùng lúc)
        API->>PAY: Tự động hoàn tiền
        API->>DB: Đơn ĐÃ HOÀN TIỀN
    end
    API-->>PAY: Xác nhận đã nhận tin
```

### S-PAY-2 — PayPal Webhook (`POST /payments/paypal/webhook`)

Lưới an toàn cho trường hợp khách lỡ đóng trình duyệt sau khi PayPal duyệt tiền
(thường đơn đã được chốt ở bước thu tiền U-BKG-5).

```mermaid
sequenceDiagram
    autonumber
    participant PAY as Cổng PayPal
    participant API as Máy chủ
    participant DB as Cơ sở dữ liệu
    PAY->>API: Báo sự kiện "đã thu tiền" (kèm chữ ký)
    API->>API: Xác minh chữ ký qua PayPal (sai thì 400) + chống xử lý trùng
    alt Còn ghế
        API->>DB: Trừ ghế + ĐÃ THANH TOÁN + xếp email (gộp 1 thao tác)
    else Hết ghế
        API->>PAY: Hoàn tiền
        API->>DB: Đơn ĐÃ HOÀN TIỀN
    end
    API-->>PAY: Xác nhận đã nhận tin
```

---

## Background jobs (pg-boss, chạy theo lịch)

### S-JOB-1 — Outbox Drain (gửi email, cron mỗi phút)

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
    Note over DB: Mỗi email có khóa chống trùng nên không gửi 2 lần
```

### S-JOB-2 — Abandoned-booking Cleanup (hủy đơn bỏ dở, cron mỗi 15 phút)

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Lịch chạy mỗi 15 phút
    participant JOB as Tác vụ nền
    participant DB as Cơ sở dữ liệu
    CRON->>JOB: Đến giờ chạy
    JOB->>DB: Tìm đơn CHỜ THANH TOÁN quá 30 phút chưa trả tiền
    JOB->>DB: Chuyển sang ĐÃ HỦY
    Note over JOB,DB: Không đụng tới ghế (đơn chưa trả tiền thì chưa giữ ghế)
```

### S-JOB-3 — Media Reconcile (dọn ảnh mồ côi, cron mỗi ngày 3h sáng)

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Lịch chạy hằng ngày
    participant JOB as Tác vụ nền
    participant DB as Cơ sở dữ liệu
    participant CLD as Cloudinary
    CRON->>JOB: Đến giờ chạy
    JOB->>DB: Lấy danh sách ảnh đã bị đánh dấu "rác"
    JOB->>CLD: Xóa ảnh khỏi kho
    CLD-->>JOB: Đã xóa (hoặc ảnh vốn không còn)
    JOB->>DB: Gỡ ảnh khỏi danh sách rác
    Note over DB,CLD: Dọn các ảnh không còn bản ghi nào trỏ tới
```

---

## Lịch sử

- **2026-06-24** — Khởi tạo bộ sequence diagram **mỗi function một sơ đồ** cho phía
  system (S-SYS / S-PAY / S-JOB, gồm S-SYS-2 health mới), nhãn tiếng Việt, gọn khổ
  A4. Đối chiếu [functions-system.md](functions-system.md); sơ đồ tổng quan ở
  [sequence-diagrams.md](sequence-diagrams.md).
