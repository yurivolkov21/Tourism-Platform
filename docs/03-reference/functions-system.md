<!-- markdownlint-disable MD033 MD013 -->
<!-- MD033 (inline HTML): các cell trong bảng dùng <br> để xuống dòng từng bước
     — bắt buộc với bảng GFM nhiều dòng, không thay được bằng markdown thuần.
     MD013 (line length): một row của bảng GFM phải nằm trọn trên một dòng. -->

# Function Catalog — System (Webhooks & Background Jobs)

Các function **không do người dùng gọi trực tiếp**: endpoint server-to-server
(webhook thanh toán) và **job nền pg-boss** (P1.x — outbox email + cron). Dựng từ
`apps/api/src/modules/{payments,jobs}` (đối chiếu
[ADR-0007](../02-decisions/0007-pgboss-outbox-jobs.md)).

> Function khách hàng: [functions-customer.md](functions-customer.md) · quản trị:
> [functions-admin.md](functions-admin.md).

## Quy ước

- **Code** — `S-xx` (System).
- **Functions** — tên + **trigger** (endpoint webhook, hoặc lịch cron / worker).
- **Description / Entity / Models / Database / Diagram** — như catalog kia.
- **Trạng thái** — ✅ **Ổn** · 🕒 **Lưu ý/Tương lai**.

> **Đặc thù:** webhook là `@Public` + `@SkipTransform` (bỏ envelope — provider cần
> body/đáp ứng thô) và verify **chữ ký** trên raw body. Job nền chạy trên **pg-boss**
> (schema `pgboss` riêng, dùng `DIRECT_URL`); bị tắt khi `NODE_ENV=test` hoặc thiếu
> `RESEND_API_KEY`. pg-boss là ESM → nạp động (`await import`) để không lọt vào Jest.

---

## Public

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| S-01 | Root / Hello<br>`GET /` | 1. Client gọi root<br>2. Trả thông điệp/health cơ bản — **không** chạm DB | System | — | — | — | ✅ Dự án chưa có `/health` riêng |

## `PaymentEvent` — Webhooks (server-to-server)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| S-02 | Stripe Webhook<br>`POST /payments/stripe/webhook` | 1. Buyer thanh toán trên Stripe Checkout (từ U-18)<br>2. Stripe gửi event (có `Stripe-Signature`) về server<br>3. Verify chữ ký trên **raw body**; sai → 400 `STRIPE_WEBHOOK_INVALID`<br>4. Idempotent theo `(provider, eventId)` UNIQUE trong `payment_events`: lưu lúc nhận, chỉ set `processedAt` khi xong; trùng mà `processedAt` NULL (lần trước crash) → **xử lý lại**<br>5. `checkout.session.completed` → **CTE nguyên tử** `claimSeatsForPaid`: nếu còn ghế → `seatsBooked += N`, booking → `PAID`, **ghi `outbox` BOOKING_CONFIRMATION trong cùng câu lệnh** (`ON CONFLICT (dedupe_key) DO NOTHING`)<br>6. Hết ghế (race) → tự refund + `REFUNDED`; `session.expired` → `CANCELLED`<br>7. Đánh dấu `processedAt`; trả ack | System (Stripe) | **PaymentEvent**, Booking, TourDeparture, Outbox | payment_events, bookings, tour_departures, outbox | Sequence | ✅ |
| S-03 | PayPal Webhook<br>`POST /payments/paypal/webhook` | 1. Backstop cho capture-on-return (U-19)<br>2. PayPal gửi event; server verify chữ ký qua PayPal verify API (sai → 400 `PAYPAL_WEBHOOK_INVALID`)<br>3. Idempotent `(provider, eventId)` như S-02<br>4. `PAYMENT.CAPTURE.COMPLETED` → cùng CTE nguyên tử (giữ ghế + PAID + outbox confirmation); hết ghế → refund capture + `REFUNDED`<br>5. Trả ack | System (PayPal) | **PaymentEvent**, Booking, TourDeparture, Outbox | payment_events, bookings, tour_departures, outbox | Sequence | ✅ |

## `Outbox` / `MediaGarbage` — Background jobs (pg-boss, không HTTP)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| S-04 | Outbox Drain<br>cron `* * * * *` (mỗi phút) | 1. pg-boss kích worker `outbox-drain`<br>2. Lấy các row `outbox` `PENDING` (cũ trước, batch)<br>3. Hydrate theo `type` (đọc booking/review/enquiry tại thời điểm gửi) → gửi qua **Resend** (`EmailService` ném lỗi khi Resend từ chối)<br>4. Thành công → `SENT` + `processedAt`; lỗi → `attempts++` (đến hạn → `FAILED`) + `lastError`<br>5. Idempotent qua `dedupeKey` UNIQUE (booking-confirmation / booking-refunded / review-approved / enquiry-received) | System (pg-boss) | **Outbox**, Booking, Review, Enquiry | outbox | Sequence | ✅ Tắt nếu thiếu `RESEND_API_KEY` |
| S-05 | Abandoned-booking Cleanup<br>cron `*/15 * * * *` | 1. pg-boss kích worker `abandoned-booking-cleanup`<br>2. `updateMany`: booking `PENDING` quá TTL (30 phút) → `CANCELLED` + `cancelledAt`<br>3. Không đụng ghế (PENDING chưa giữ ghế); idempotent<br>→ backstop cho checkout bỏ dở (miss Stripe expiry / bỏ giữa PayPal return) | System (pg-boss) | **Booking** | bookings | Activity | ✅ |
| S-06 | Media Reconcile<br>cron `0 3 * * *` (hằng ngày) | 1. pg-boss kích worker `media-reconcile`<br>2. Lấy row `media_garbage` (publicId mồ côi do A-11/A-17/A-12/A-18/U-05 thải ra)<br>3. Gọi Cloudinary `destroy(publicId, resourceType)`; `ok`/`not found` đều coi là xong → xoá row<br>4. Lỗi transport → `attempts++` + `lastError` (thử lại lần sau)<br>→ dọn asset Cloudinary không còn MediaAsset trỏ tới | System (pg-boss) | **MediaGarbage** (→ Cloudinary) | media_garbage | Activity | ✅ |

---

## Lịch sử

- **2026-06-20** — Khởi tạo catalog system cho `@tourism/api`. Tách riêng webhook
  (S-02/03) + job nền P1.x (S-04/05/06) khỏi catalog admin/customer. Outbox-trong-CTE
  - pg-boss theo [ADR-0007](../02-decisions/0007-pgboss-outbox-jobs.md). Đối chiếu
  [functions-customer.md](functions-customer.md) + [functions-admin.md](functions-admin.md).
