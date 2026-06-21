<!-- markdownlint-disable MD033 MD013 -->
<!-- MD033 (inline HTML): các cell trong bảng dùng <br> để xuống dòng từng bước
     — bắt buộc với bảng GFM nhiều dòng, không thay được bằng markdown thuần.
     MD013 (line length): một row của bảng GFM phải nằm trọn trên một dòng. -->

# Function Catalog — Customer (User)

Danh sách function **phía khách hàng** của backend `@tourism/api`, dựng trực tiếp
từ endpoint thực tế trong `apps/api/src/modules` (đối chiếu
[data-model.md](../architecture/data-model.md) và `prisma/schema.prisma`). Phần
**Description** viết tiếng Việt theo từng bước (`1. … 2. …`) để vẽ **Activity /
Sequence diagram**.

> Function quản trị: [functions-admin.md](functions-admin.md) · Webhook + job nền:
> [functions-system.md](functions-system.md).

## Quy ước

- **Code** — `U-xx` (Customer). Bảng **chia theo model** (mỗi model một section);
  code đánh **tuần tự** xuyên suốt để tham chiếu chéo.
- **Functions** — tên nghiệp vụ + endpoint REST (prefix `/api/v1`).
- **Description** — luồng xử lý server-side từng bước.
- **Entity** — tác nhân chính (Customer / System).
- **Models** — Prisma model liên quan (model của section in **đậm**).
- **Database** — bảng Postgres bị đọc/ghi.
- **Diagram** — loại sơ đồ gợi ý.
- **Trạng thái** — ✅ **Ổn** (đã implement + test) · 🕒 **Lưu ý/Tương lai** (điểm cần biết).

> **Khác donor (tourism-be-api):** EN-only (không en/vi — ADR-0005) · M:N
> tour–destination (`destinationSlugs[]` + primary — ADR-0002) · `TourCategory`
> lookup (không phải enum) · **2 cổng Stripe + PayPal** (ADR-0006) · email qua
> **outbox** (S-04) thay vì gửi inline · thêm **Enquiry** (P1.7) +
> **merchandising** tour (P1.7e).
>
> **Phân quyền:** endpoint browse (Destination/Tour/Category/Departure/Review-read)
>
> - Enquiry là **công khai** (`@Public`); còn lại cần JWT đã `/auth/sync` (U-01).

---

## Account · `User`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-01 | Sync Account<br>`POST /auth/sync` | 1. FE đăng nhập/đăng ký qua Supabase, nhận `access_token`<br>2. Gửi `POST /auth/sync` kèm `Bearer <token>` (+ tùy chọn `fullName`/`phone`)<br>3. Guard verify JWT (HS256 secret hoặc JWKS bất đối xứng)<br>4. Lấy `sub` (supabaseId) + email từ token<br>5. Upsert vào `users` theo `supabaseId`, role `CUSTOMER`; email lowercase (citext-unique); blank → null<br>6. **Update KHÔNG bao giờ ghi đè `role`** — admin re-sync từ FE customer không bị giáng cấp<br>7. Trả hồ sơ user | Customer | **User** | users | Sequence | ✅ |
| U-02 | View Profile<br>`GET /users/me` | 1. User đã đăng nhập gọi `GET /users/me`<br>2. Guard verify JWT + nạp user nội bộ theo `supabaseId`<br>3. Chưa sync → 401 `USER_NOT_SYNCED`<br>4. Đính kèm `avatarUrl` (dựng từ MediaAsset role=avatar qua Cloudinary)<br>5. Trả hồ sơ | Customer | **User**, MediaAsset | users, media_assets | Sequence | ✅ |
| U-03 | Update Profile<br>`PATCH /users/me` | 1. User nhập `fullName` / `phone`<br>2. Gửi `PATCH /users/me`<br>3. Validate DTO; `email` và `role` bất biến (bỏ qua nếu client gửi)<br>4. Cập nhật `users`<br>5. Trả hồ sơ đã cập nhật (+ `avatarUrl`) | Customer | **User** | users | Activity | ✅ |
| U-04 | Set Avatar<br>`PUT /users/me/avatar` | 1. User upload ảnh qua signed URL (A-23) → có `publicId`<br>2. Gửi `PUT /users/me/avatar` kèm `publicId` (+ format/width/height)<br>3. Server replace-all media role=avatar cho owner USER trong `$transaction` (force type IMAGE)<br>4. Trả hồ sơ kèm `avatarUrl` mới | Customer | **User**, MediaAsset | users, media_assets | Sequence | ✅ |
| U-05 | Clear Avatar<br>`DELETE /users/me/avatar` | 1. User gỡ avatar<br>2. Gửi `DELETE /users/me/avatar`<br>3. Xoá MediaAsset role=avatar của owner (publicId ghi vào `media_garbage` để cron dọn Cloudinary — S-06)<br>4. Trả hồ sơ (`avatarUrl = null`) | Customer | **User**, MediaAsset, MediaGarbage | users, media_assets, media_garbage | Activity | ✅ |

## `Destination` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-06 | Browse Destinations<br>`GET /destinations` | 1. User mở trang điểm đến<br>2. Gửi `GET /destinations` với `page`/`pageSize`/`search`/`sortBy`/`sortOrder`<br>3. Server **chỉ lấy `isActive = true`** (ẩn bản nháp)<br>4. Search theo `name` (không phân biệt hoa thường)<br>5. `Promise.all` list+count (pooler-safe) + phân trang<br>6. Trả danh sách + `meta` | Customer | **Destination** | destinations | Activity | ✅ |
| U-07 | Destination Detail<br>`GET /destinations/:slug` | 1. User chọn điểm đến<br>2. Gửi `GET /destinations/:slug`<br>3. Tìm destination `isActive` theo slug<br>4. Không có/ẩn → 404 `DESTINATION_NOT_FOUND`<br>5. Trả chi tiết (+ media) | Customer | **Destination**, MediaAsset | destinations, media_assets | Activity | ✅ |

## `TourCategory` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-08 | List Categories<br>`GET /tour-categories` | 1. User/FE lấy danh mục để render filter<br>2. Gửi `GET /tour-categories`<br>3. Server chỉ trả `isActive`, sắp theo `order`<br>4. Trả danh sách | Customer | **TourCategory** | tour_categories | Activity | ✅ |
| U-09 | Category Detail<br>`GET /tour-categories/:slug` | 1. Gửi `GET /tour-categories/:slug`<br>2. Tìm category `isActive` theo slug<br>3. Không có → 404 `CATEGORY_NOT_FOUND`<br>4. Trả chi tiết | Customer | **TourCategory** | tour_categories | Activity | ✅ |

## `Tour` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-10 | Browse / Search Tours<br>`GET /tours` | 1. User mở danh mục tour<br>2. Lọc: `categorySlug`, `destinationSlug`, `priceMin`/`priceMax`, `isFeatured`, `search` (theo `title`, không phân biệt hoa thường)<br>3. Sắp xếp **whitelist**: `createdAt`/`updatedAt`/`basePrice`/`durationDays`/`title` (chống orderBy injection)<br>4. Server **chỉ trả `isPublished = true`** (ẩn nháp)<br>5. `Promise.all` list+count + phân trang<br>6. Trả danh sách (+ media, `suitableFor`, `badges`) + `meta` | Customer | **Tour**, TourCategory, Destination, MediaAsset | tours, tour_destinations, media_assets | Activity | ✅ |
| U-11 | Tour Detail<br>`GET /tours/:slug` | 1. User chọn tour<br>2. Gửi `GET /tours/:slug`<br>3. Server tải tour đã publish kèm `category`, `destinations` (M:N, có cờ `isPrimary`), `itinerary` (theo `dayNumber`), `faqs`, `policies`, media<br>4. Slug thiếu/chưa publish → 404 (không lộ nháp)<br>5. Trả chi tiết đầy đủ | Customer | **Tour**, TourCategory, Destination, TourItineraryDay, TourFaq, TourPolicy, MediaAsset | tours, tour_destinations, tour_itinerary_days, tour_faqs, tour_policies, media_assets | Activity | ✅ |

## `TourDeparture` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-12 | View Departures<br>`GET /tours/:slug/departures` | 1. User xem các ngày khởi hành<br>2. Gửi `GET /tours/:slug/departures` (lọc `from`/`to`/`status`; mặc định tương lai + `OPEN`)<br>3. Server trả departure đang mở của tour đã publish, kèm ghế còn lại (`seatsTotal − seatsBooked`)<br>4. Trả danh sách | Customer | **TourDeparture**, Tour | tour_departures, tours | Activity | ✅ |

## `Review`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-13 | View Tour Reviews<br>`GET /tours/:slug/reviews` (công khai) | 1. User xem đánh giá tour<br>2. Gửi `GET /tours/:slug/reviews?page&pageSize`<br>3. Tour phải publish (404 nếu không) — tránh "200 rỗng" che bug routing<br>4. Server chỉ trả review `isApproved = true`, mới nhất trước<br>5. **Ẩn PII** — chỉ lộ `reviewer.fullName`<br>6. Trả danh sách + `meta.averageRating` (trung bình review đã duyệt) | Customer | **Review**, User, Tour | reviews, users, tours | Activity | ✅ |
| U-14 | Write Review<br>`POST /reviews` | 1. User chọn booking đã hoàn tất để đánh giá<br>2. Nhập `rating` (1–5), `title`, `body`; gửi kèm `bookingCode`<br>3. Server kiểm tra booking tồn tại → thuộc về caller (else 403 `BOOKING_FORBIDDEN`) → trạng thái `PAID` (else 400 `REVIEW_NOT_ELIGIBLE`)<br>4. Mỗi booking 1 review (`bookingId` UNIQUE → P2002 → 409 `REVIEW_ALREADY_EXISTS`)<br>5. `tourId` denormalize từ booking; tạo review `isApproved = false` (chờ admin duyệt — A-25)<br>6. Trả review | Customer | **Review**, Booking | reviews, bookings | Activity | 🕒 Cần booking **PAID của chính chủ**; pre-moderation (verified-purchase chỉ chống fake, không chống nội dung bẩn/PII) |

## `Booking`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-15 | Create Booking<br>`POST /bookings` | 1. User chọn tour + departure, nhập số người lớn/trẻ em + liên hệ + `paymentProvider` (STRIPE/PAYPAL)<br>2. Gửi `POST /bookings` (Bearer)<br>3. Tour phải publish (404), departure thuộc tour (404) + `OPEN` (400 `DEPARTURE_NOT_OPEN`)<br>4. **`startDate` đã qua → 400 `DEPARTURE_DEPARTED`** (same-day vẫn đặt)<br>5. Soft-check còn ghế (409 `SEATS_NOT_AVAILABLE`) — *không* giữ ghế ở PENDING<br>6. `totalAmount = (priceOverride ?? basePrice) × tổng khách`; sinh mã `BK-XXXXXXXX` (base36)<br>7. Tạo booking `PENDING` (chưa thanh toán). Checkout ở U-18<br>8. Trả booking | Customer | **Booking**, Tour, TourDeparture | bookings, tours, tour_departures | Sequence | 🕒 Ghế **chỉ được giữ khi PAID** (CTE nguyên tử ở S-02/U-19), không phải lúc PENDING |
| U-16 | My Bookings<br>`GET /bookings/me` | 1. User mở "Đơn của tôi"<br>2. Gửi `GET /bookings/me`<br>3. Lọc theo `userId`, mới nhất trước (tối đa 50), kèm tiêu đề tour + ngày khởi hành<br>4. Trả danh sách | Customer | **Booking**, Tour, TourDeparture | bookings | Activity | 🕒 Thêm pagination khi làm trang account FE |
| U-17 | Booking Detail<br>`GET /bookings/:code` | 1. User chọn đơn theo mã<br>2. Gửi `GET /bookings/:code`<br>3. **Chỉ chủ đơn hoặc admin** xem; người khác → 404 `BOOKING_NOT_FOUND` (chống dò mã)<br>4. Trả chi tiết + tour + departure | Customer | **Booking**, Tour, TourDeparture | bookings | Activity | ✅ |
| U-18 | Start Checkout<br>`POST /bookings/:code/checkout` | 1. User bấm thanh toán cho đơn PENDING<br>2. Gửi `POST /bookings/:code/checkout`<br>3. Owner-or-admin (else 404); phải `PENDING` (else 409 `BOOKING_NOT_PENDING`)<br>4. Theo `paymentProvider`: tạo Stripe Checkout session **hoặc** PayPal order (gọi ngoài DB-write — không giữ kết nối pooler)<br>5. Lỗi cổng → 502 `CHECKOUT_FAILED` (đơn vẫn PENDING, retry được)<br>6. Lưu `providerSessionId`; trả `{ checkoutUrl, bookingCode, status }`<br>7. FE redirect tới `checkoutUrl` | Customer | **Booking** | bookings | Sequence | ✅ |
| U-19 | Capture PayPal<br>`POST /bookings/:code/capture` | 1. Sau khi buyer duyệt order, PayPal redirect về FE → FE gọi capture<br>2. Owner-or-admin (else 404); phải là booking PAYPAL (else 400) đang PENDING (PAID → trả luôn, idempotent)<br>3. Capture order qua PayPal API<br>4. **Giữ ghế + flip PAID qua CTE nguyên tử** (`claimSeatsForPaid`)<br>5. Nếu hết ghế (race) → refund capture + `REFUNDED` + 409 `SEATS_NOT_AVAILABLE`<br>6. Trả booking | Customer | **Booking**, TourDeparture, Outbox | bookings, tour_departures, outbox | Sequence | ✅ Webhook PayPal (S-03) là backstop |
| U-20 | Cancel Booking<br>`POST /bookings/:code/cancel` | 1. User huỷ đơn **PENDING** của mình<br>2. Gửi `POST /bookings/:code/cancel`<br>3. Owner-or-admin (else 404); không PENDING → 409 (đơn PAID đi qua refund admin A-28)<br>4. Flip `CANCELLED` + `cancelledAt` (không đổi ghế — chưa giữ)<br>5. Trả booking | Customer | **Booking** | bookings | Activity | ✅ |

## `Wishlist`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-21 | Add to Wishlist<br>`POST /wishlist/:tourId` | 1. User thích một tour<br>2. Gửi `POST /wishlist/:tourId` (tourId = UUID)<br>3. Tour phải tồn tại + publish (404)<br>4. Upsert `(userId, tourId)` — idempotent<br>5. Trả bản ghi | Customer | **Wishlist**, Tour | wishlist, tours | Activity | ✅ |
| U-22 | Remove from Wishlist<br>`DELETE /wishlist/:tourId` | 1. User bỏ thích<br>2. Gửi `DELETE /wishlist/:tourId`<br>3. Xoá bản ghi (idempotent — không lỗi nếu không có)<br>4. Trả xác nhận | Customer | **Wishlist** | wishlist | Activity | ✅ |
| U-23 | View Wishlist<br>`GET /wishlist/me` | 1. User mở danh sách yêu thích<br>2. Gửi `GET /wishlist/me`<br>3. Trả danh sách (mới nhất trước) kèm preview tour (slug, title, hero, `basePrice`, currency, số ngày) + cờ `isPublished` | Customer | **Wishlist**, Tour | wishlist, tours | Activity | 🕒 Tour bị unpublish vẫn nằm wishlist (FE tự quyết ẩn/hiện qua cờ `isPublished`) |

## `Enquiry` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-24 | Submit Enquiry<br>`POST /enquiries` | 1. Khách điền form "Inquire Now": `name`, `email`, `message` (+ `phone`, `tourId`, và **lead fields**: `nationality`, `travelDate`, `groupSize`, `budgetTier`, `interests[]`)<br>2. Gửi `POST /enquiries` (công khai)<br>3. **Rate-limit 5/phút** (ThrottlerGuard) + **honeypot `website`**: nếu điền → trả 201 giả (không ghi DB) để không lộ cho bot<br>4. `tourId` (nếu có) phải là tour đã publish (404)<br>5. Trong `$transaction`: tạo enquiry `status=NEW` + ghi `outbox` ENQUIRY_RECEIVED (email ack — gửi bởi S-04)<br>6. Trả `{ received: true }` | Customer | **Enquiry**, Tour, Outbox | enquiries, tours, outbox | Sequence | ✅ Lead fields ngang form Lily's (P1.7d) |

## `Post` (blog công khai — P-Content)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-25 | List Posts<br>`GET /posts` | 1. User mở blog/journal<br>2. Gửi `GET /posts` với `page`/`pageSize`/`search`/`sortBy`/`sortOrder` (mặc định mới publish trước)<br>3. Server **chỉ trả `status = PUBLISHED` + `publishedAt <= now()`** (ẩn nháp + bài hẹn giờ)<br>4. Search theo `title` (không phân biệt hoa thường); `Promise.all` list+count<br>5. Trả danh sách + `meta` | Customer | **Post** | posts | Activity | ✅ |
| U-26 | Post Detail<br>`GET /posts/:slug` | 1. User chọn bài viết<br>2. Gửi `GET /posts/:slug`<br>3. Tìm post `PUBLISHED` + `publishedAt <= now()` theo slug<br>4. Không có/nháp/hẹn giờ → 404 `POST_NOT_FOUND` (không lộ nháp)<br>5. Trả chi tiết (content markdown — render sanitize ở FE) | Customer | **Post** | posts | Activity | ✅ |

---

## Lịch sử

- **2026-06-21** — Thêm nhóm `Post` (U-25/U-26): blog công khai (P-Content) — chỉ
  `PUBLISHED` + `publishedAt <= now()`. Xem [spec](../specs/2026-06-21-blog-editorial-post-schema.md).
- **2026-06-20** — Khởi tạo catalog cho `@tourism/api` (P1.1–P1.x + P1.7d/e). Dựng từ
  code thật; chia theo model. Khác donor: EN-only · M:N destination · category lookup ·
  Stripe+PayPal · email qua outbox · Enquiry + merchandising. Đối chiếu
  [functions-admin.md](functions-admin.md) + [functions-system.md](functions-system.md).
