<!-- markdownlint-disable MD033 MD013 -->
<!-- MD033 (inline HTML): các cell trong bảng dùng <br> để xuống dòng từng bước
     — bắt buộc với bảng GFM nhiều dòng, không thay được bằng markdown thuần.
     MD013 (line length): một row của bảng GFM phải nằm trọn trên một dòng. -->

# Function Catalog — System (Webhooks & Background Jobs)

Các function **không do người dùng gọi trực tiếp**: endpoint liveness/readiness,
endpoint server-to-server (webhook thanh toán) và **job nền pg-boss** (P1.x — outbox
email + cron). Dựng từ `apps/api/src/{app,modules/{payments,jobs}}` (đối chiếu
[ADR-0007](../02-decisions/0007-pgboss-outbox-jobs.md)).

> Function khách hàng: [functions-customer.md](functions-customer.md) · quản trị:
> [functions-admin.md](functions-admin.md).

## Quy ước

- **Code** — `S-<MODEL>-<n>`: `S` = actor System · `<MODEL>` = nhóm 3 ký tự (`SYS`
  liveness/readiness · `PAY` PaymentEvent/webhook · `JOB` job nền pg-boss) · `<n>` =
  số thứ tự **reset theo từng nhóm**.
- **Functions** — tên + **trigger** (endpoint webhook, hoặc lịch cron / worker).
- **Description / Entity / Models / Database / Diagram** — như catalog kia.
- **Trạng thái** — ✅ **Ổn** · 🕒 **Lưu ý/Tương lai**.

> **Đặc thù:** webhook là `@Public` + `@SkipTransform` (bỏ envelope — provider cần
> body/đáp ứng thô) và verify **chữ ký** trên raw body. Job nền chạy trên **pg-boss**
> (schema `pgboss` riêng, dùng `DIRECT_URL`); bị tắt khi `NODE_ENV=test` hoặc thiếu
> `RESEND_API_KEY`. pg-boss là ESM → nạp động (`await import`) để không lọt vào Jest.

---

## Liveness / Readiness (`@Public`)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| S-SYS-1 | Root / Liveness<br>`GET /` | 1. Client/probe gọi root<br>2. Trả thông điệp cơ bản — **không** chạm DB | System | — | — | — | ✅ Liveness; readiness tách ở S-SYS-2 |
| S-SYS-2 | Readiness / Health<br>`GET /health` | 1. Probe (Render `healthCheckPath`) hoặc cron keep-alive gọi `GET /health`<br>2. Server chạy `SELECT 1` (Prisma `$queryRaw`) kiểm tra kết nối DB<br>3. DB up → trả `{ status: 'ok', db: 'up', time }`; DB lỗi → **503 `DB_UNAVAILABLE`**<br>→ round-trip vừa giữ web service free khỏi ngủ, vừa giữ Supabase free khỏi pause (~7 ngày idle) | System | — (Prisma ping) | — (`SELECT 1`) | Sequence | ✅ Thêm khi deploy Render (keep-alive cron) |

## `PaymentEvent` — Webhooks (server-to-server)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| S-PAY-1 | Stripe Webhook<br>`POST /payments/stripe/webhook` | 1. Buyer thanh toán trên Stripe Checkout (từ U-BKG-4)<br>2. Stripe gửi event (có `Stripe-Signature`) về server<br>3. Verify chữ ký trên **raw body**; sai → 400 `STRIPE_WEBHOOK_INVALID`<br>4. Idempotent theo `(provider, eventId)` UNIQUE trong `payment_events`: lưu lúc nhận, chỉ set `processedAt` khi xong; trùng mà `processedAt` NULL (lần trước crash) → **xử lý lại**<br>5. `checkout.session.completed` → **CTE nguyên tử** `claimSeatsForPaid`: nếu còn ghế → `seatsBooked += N`, booking → `PAID`, **ghi `outbox` BOOKING_CONFIRMATION trong cùng câu lệnh** (`ON CONFLICT (dedupe_key) DO NOTHING`)<br>6. Hết ghế (race) → tự refund + `REFUNDED`; `session.expired` → `CANCELLED`<br>7. Đánh dấu `processedAt`; trả ack | System (Stripe) | **PaymentEvent**, Booking, TourDeparture, Outbox | payment_events, bookings, tour_departures, outbox | Sequence | ✅ |
| S-PAY-2 | PayPal Webhook<br>`POST /payments/paypal/webhook` | 1. Backstop cho capture-on-return (U-BKG-5)<br>2. PayPal gửi event; server verify chữ ký qua PayPal verify API (sai → 400 `PAYPAL_WEBHOOK_INVALID`)<br>3. Idempotent `(provider, eventId)` như S-PAY-1<br>4. `PAYMENT.CAPTURE.COMPLETED` → cùng CTE nguyên tử (giữ ghế + PAID + outbox confirmation); hết ghế → refund capture + `REFUNDED`<br>5. Trả ack | System (PayPal) | **PaymentEvent**, Booking, TourDeparture, Outbox | payment_events, bookings, tour_departures, outbox | Sequence | ✅ |

## `Outbox` / `MediaGarbage` — Background jobs (pg-boss, không HTTP)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| S-JOB-1 | Outbox Drain<br>cron `* * * * *` (mỗi phút) | 1. pg-boss kích worker `outbox-drain`<br>2. Lấy các row `outbox` `PENDING` (cũ trước, batch)<br>3. Hydrate theo `type` (đọc booking/review/enquiry tại thời điểm gửi) → gửi qua **Resend** (`EmailService` ném lỗi khi Resend từ chối)<br>4. Thành công → `SENT` + `processedAt`; lỗi → `attempts++` (đến hạn → `FAILED`) + `lastError`<br>5. Idempotent qua `dedupeKey` UNIQUE (booking-confirmation / booking-refunded / review-approved / enquiry-received / **cancellation-requested theo bookingId / cancellation-denied theo requestId** — U-BKG-7/A-CXR-2) | System (pg-boss) | **Outbox**, Booking, Review, Enquiry, CancellationRequest, Subscriber | outbox | Sequence | ✅ Tắt nếu thiếu `RESEND_API_KEY`; **cả 7 EmailType gửi thật từ 2026-07-13** (API-W1): + `CANCELLATION_REQUESTED`/`_DENIED` (dispatch theo bookingId/requestId) + `NEWSLETTER_WELCOME` (payload email, dedupe trọn đời); refund email hiện đúng `refundedAmount`; template branded v2 + Reply-To |
| S-JOB-2 | Abandoned-booking Cleanup<br>cron `*/15 * * * *` | 1. pg-boss kích worker `abandoned-booking-cleanup`<br>2. `updateMany`: booking `PENDING` quá TTL (30 phút) → `CANCELLED` + `cancelledAt`<br>3. Không đụng ghế (PENDING chưa giữ ghế); idempotent<br>→ backstop cho checkout bỏ dở (miss Stripe expiry / bỏ giữa PayPal return) | System (pg-boss) | **Booking** | bookings | Activity | ✅ |
| S-JOB-3 | Media Reconcile<br>cron `0 3 * * *` (hằng ngày) | 1. pg-boss kích worker `media-reconcile`<br>2. Lấy row `media_garbage` (publicId mồ côi do A-DST-5/A-TUR-5/A-DST-6/A-TUR-6/U-USR-5 thải ra)<br>3. Gọi Cloudinary `destroy(publicId, resourceType)`; `ok`/`not found` đều coi là xong → xoá row<br>4. Lỗi transport → `attempts++` + `lastError` (thử lại lần sau)<br>→ dọn asset Cloudinary không còn MediaAsset trỏ tới | System (pg-boss) | **MediaGarbage** (→ Cloudinary) | media_garbage | Activity | ✅ |

---

## Lịch sử

- **2026-07-13 (b)** — **API-W1 Email revival** (`7c64852`): S-JOB-1 dispatch đủ
  7 EmailType (+2 cancellation, +NEWSLETTER_WELCOME mới kèm migration); refund
  email sửa sang `refundedAmount`; toàn bộ template re-skin v2 + Reply-To.
- **2026-07-13** — Domain `nexora-travel.agency` verified trên Resend → S-JOB-1
  gửi email thật cho 4 loại đã wire (delivery đầu tiên xác nhận vào inbox Gmail).
  2 loại cancellation vẫn chờ code (API-W1).
- **2026-07-05** — **Refund execution + cancellation-request queue:** hai `EmailType`
  mới `CANCELLATION_REQUESTED`/`CANCELLATION_DENIED` (dedupe theo bookingId/requestId,
  ghi từ U-BKG-7/A-CXR-2); S-JOB-1 **chưa** có case dispatch cho 2 loại này (`default`:
  warn + no-op) — gửi email thật vẫn domain-gated/deferred như các `EmailType` khác. Xem
  [spec](../06-specs/2026-07-04-refund-cancellation-queue-design.md).
- **2026-06-24** — (1) Đổi quy ước **Code** sang `S-<MODEL>-<n>` (`SYS`/`PAY`/`JOB`, số
  reset theo nhóm) thay cho `S-xx` tuần tự. Map cũ→mới: S-01 → S-SYS-1 · S-02/03 →
  S-PAY-1/2 · S-04/05/06 → S-JOB-1/2/3. (2) **Bổ sung** `S-SYS-2` Readiness/Health
  (`GET /health` — ping DB, 503 `DB_UNAVAILABLE`, làm `healthCheckPath` của Render +
  keep-alive) thêm khi deploy; cập nhật S-SYS-1 (note "chưa có /health" đã lỗi thời).
- **2026-06-20** — Khởi tạo catalog system cho `@tourism/api`. Tách riêng webhook
  (S-PAY-1/2) + job nền P1.x (S-JOB-1/2/3) khỏi catalog admin/customer. Outbox-trong-CTE
  - pg-boss theo [ADR-0007](../02-decisions/0007-pgboss-outbox-jobs.md). Đối chiếu
  [functions-customer.md](functions-customer.md) + [functions-admin.md](functions-admin.md).
