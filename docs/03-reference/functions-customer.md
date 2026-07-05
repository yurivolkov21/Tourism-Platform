<!-- markdownlint-disable MD033 MD013 -->
<!-- MD033 (inline HTML): các cell trong bảng dùng <br> để xuống dòng từng bước
     — bắt buộc với bảng GFM nhiều dòng, không thay được bằng markdown thuần.
     MD013 (line length): một row của bảng GFM phải nằm trọn trên một dòng. -->

# Function Catalog — Customer (User)

Danh sách function **phía khách hàng** của backend `@tourism/api`, dựng trực tiếp
từ endpoint thực tế trong `apps/api/src/modules` (đối chiếu
[data-model.md](../01-architecture/data-model.md) và `prisma/schema.prisma`). Phần
**Description** viết tiếng Việt theo từng bước (`1. … 2. …`) để vẽ **Activity /
Sequence diagram**.

> Function quản trị: [functions-admin.md](functions-admin.md) · Webhook + job nền:
> [functions-system.md](functions-system.md).

## Quy ước

- **Code** — `U-<MODEL>-<n>`: `U` = actor Customer · `<MODEL>` = mã 3 ký tự của
  **model chính** (model in **đậm** ở cột Models) · `<n>` = số thứ tự **reset theo
  từng model**. VD `U-BKG-4` = function khách hàng thứ 4 thuộc model `Booking`.
  Thêm function mới chỉ nối dài chuỗi của model đó — không phải đánh số lại toàn bộ.
- **Mã model** (dùng chung cả 3 catalog): `USR` User · `CAT` TourCategory ·
  `DST` Destination · `TUR` Tour · `DEP` TourDeparture · `MED` MediaAsset/Upload ·
  `REV` Review · `ENQ` Enquiry · `BKG` Booking · `CXR` CancellationRequest ·
  `WSH` Wishlist · `PST` Post · `SUB` Subscriber (newsletter) · `STA` Stats (tổng hợp) ·
  `PAY` PaymentEvent · `JOB` job nền · `SYS` health/liveness.
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
> **outbox** (S-JOB-1) thay vì gửi inline · thêm **Enquiry** (P1.7) +
> **merchandising** tour (P1.7e).
>
> **Phân quyền:** endpoint browse (Destination/Tour/Category/Departure/Review-read)
>
> - Enquiry là **công khai** (`@Public`); còn lại cần JWT đã `/auth/sync` (U-USR-1).

---

## Account · `User`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-USR-1 | Sync Account<br>`POST /auth/sync` | 1. FE đăng nhập/đăng ký qua Supabase, nhận `access_token`<br>2. Gửi `POST /auth/sync` kèm `Bearer <token>` (+ tùy chọn `fullName`/`phone`)<br>3. Guard verify JWT (HS256 secret hoặc JWKS bất đối xứng)<br>4. Lấy `sub` (supabaseId) + email từ token<br>5. Upsert vào `users` theo `supabaseId`, role `CUSTOMER`; email lowercase (citext-unique); blank → null<br>6. **Update KHÔNG bao giờ ghi đè `role`** — admin re-sync từ FE customer không bị giáng cấp<br>7. Trả hồ sơ user | Customer | **User** | users | Sequence | ✅ |
| U-USR-2 | View Profile<br>`GET /users/me` | 1. User đã đăng nhập gọi `GET /users/me`<br>2. Guard verify JWT + nạp user nội bộ theo `supabaseId`<br>3. Chưa sync → 401 `USER_NOT_SYNCED`<br>4. Đính kèm `avatarUrl` (dựng từ MediaAsset role=avatar qua Cloudinary)<br>5. Trả hồ sơ | Customer | **User**, MediaAsset | users, media_assets | Sequence | ✅ |
| U-USR-3 | Update Profile<br>`PATCH /users/me` | 1. User nhập `fullName` / `phone`<br>2. Gửi `PATCH /users/me`<br>3. Validate DTO; `email` và `role` bất biến (bỏ qua nếu client gửi)<br>4. Cập nhật `users`<br>5. Trả hồ sơ đã cập nhật (+ `avatarUrl`) | Customer | **User** | users | Activity | ✅ |
| U-USR-4 | Set Avatar<br>`PUT /users/me/avatar` | 1. User upload ảnh qua signed URL (A-MED-1) → có `publicId`<br>2. Gửi `PUT /users/me/avatar` kèm `publicId` (+ format/width/height)<br>3. Server replace-all media role=avatar cho owner USER trong `$transaction` (force type IMAGE)<br>4. Trả hồ sơ kèm `avatarUrl` mới | Customer | **User**, MediaAsset | users, media_assets | Sequence | ✅ |
| U-USR-5 | Clear Avatar<br>`DELETE /users/me/avatar` | 1. User gỡ avatar<br>2. Gửi `DELETE /users/me/avatar`<br>3. Xoá MediaAsset role=avatar của owner (publicId ghi vào `media_garbage` để cron dọn Cloudinary — S-JOB-3)<br>4. Trả hồ sơ (`avatarUrl = null`) | Customer | **User**, MediaAsset, MediaGarbage | users, media_assets, media_garbage | Activity | ✅ |

## `Destination` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-DST-1 | Browse Destinations<br>`GET /destinations` | 1. User mở trang điểm đến<br>2. Gửi `GET /destinations` với `page`/`pageSize`/`search`/`sortBy`/`sortOrder`<br>3. Server **chỉ lấy `isActive = true`** (ẩn bản nháp)<br>4. Search theo `name` (không phân biệt hoa thường)<br>5. `Promise.all` list+count (pooler-safe) + phân trang<br>6. Trả danh sách + `meta` | Customer | **Destination** | destinations | Activity | ✅ |
| U-DST-2 | Destination Detail<br>`GET /destinations/:slug` | 1. User chọn điểm đến<br>2. Gửi `GET /destinations/:slug`<br>3. Tìm destination `isActive` theo slug<br>4. Không có/ẩn → 404 `DESTINATION_NOT_FOUND`<br>5. Trả chi tiết (+ media) | Customer | **Destination**, MediaAsset | destinations, media_assets | Activity | ✅ |

## `TourCategory` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-CAT-1 | List Categories<br>`GET /tour-categories` | 1. User/FE lấy danh mục để render filter<br>2. Gửi `GET /tour-categories`<br>3. Server chỉ trả `isActive`, sắp theo `order`<br>4. Trả danh sách | Customer | **TourCategory** | tour_categories | Activity | ✅ |
| U-CAT-2 | Category Detail<br>`GET /tour-categories/:slug` | 1. Gửi `GET /tour-categories/:slug`<br>2. Tìm category `isActive` theo slug<br>3. Không có → 404 `CATEGORY_NOT_FOUND`<br>4. Trả chi tiết | Customer | **TourCategory** | tour_categories | Activity | ✅ |

## `Tour` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-TUR-1 | Browse / Search Tours<br>`GET /tours` | 1. User mở danh mục tour<br>2. Lọc: `categorySlug`, `destinationSlug`, `priceMin`/`priceMax`, `isFeatured`, `search` (theo `title`, không phân biệt hoa thường)<br>3. Sắp xếp **whitelist**: `createdAt`/`updatedAt`/`basePrice`/`durationDays`/`title` (chống orderBy injection)<br>4. Server **chỉ trả `isPublished = true`** (ẩn nháp)<br>5. `Promise.all` list+count + phân trang<br>6. Trả danh sách (+ media, `suitableFor`, `badges`) + `meta` | Customer | **Tour**, TourCategory, Destination, MediaAsset | tours, tour_destinations, media_assets | Activity | ✅ |
| U-TUR-2 | Tour Detail<br>`GET /tours/:slug` | 1. User chọn tour<br>2. Gửi `GET /tours/:slug`<br>3. Server tải tour đã publish kèm `category`, `destinations` (M:N, có cờ `isPrimary`), `itinerary` (theo `dayNumber`), `faqs`, `policies`, media<br>4. Slug thiếu/chưa publish → 404 (không lộ nháp)<br>5. Trả chi tiết đầy đủ | Customer | **Tour**, TourCategory, Destination, TourItineraryDay, TourFaq, TourPolicy, MediaAsset | tours, tour_destinations, tour_itinerary_days, tour_faqs, tour_policies, media_assets | Activity | ✅ |

## `TourDeparture` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-DEP-1 | View Departures<br>`GET /tours/:slug/departures` | 1. User xem các ngày khởi hành<br>2. Gửi `GET /tours/:slug/departures` (lọc `from`/`to`/`status`; mặc định tương lai + `OPEN`)<br>3. Server trả departure đang mở của tour đã publish, kèm ghế còn lại (`seatsTotal − seatsBooked`)<br>4. Trả danh sách | Customer | **TourDeparture**, Tour | tour_departures, tours | Activity | ✅ |

## `Review`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-REV-1 | View Tour Reviews<br>`GET /tours/:slug/reviews` (công khai) | 1. User xem đánh giá tour<br>2. Gửi `GET /tours/:slug/reviews?page&pageSize`<br>3. Tour phải publish (404 nếu không) — tránh "200 rỗng" che bug routing<br>4. Server chỉ trả review `isApproved = true`, mới nhất trước<br>5. **Ẩn PII** — chỉ lộ `reviewer.fullName`<br>6. Trả danh sách + `meta.averageRating` (trung bình review đã duyệt) | Customer | **Review**, User, Tour | reviews, users, tours | Activity | ✅ |
| U-REV-2 | Write Review<br>`POST /reviews` | 1. User chọn booking đã hoàn tất để đánh giá<br>2. Nhập `rating` (1–5), `title`, `body`; gửi kèm `bookingCode`<br>3. Server kiểm tra booking tồn tại → thuộc về caller (else 403 `BOOKING_FORBIDDEN`) → trạng thái `PAID` (else 400 `REVIEW_NOT_ELIGIBLE`)<br>4. Mỗi booking 1 review (`bookingId` UNIQUE → P2002 → 409 `REVIEW_ALREADY_EXISTS`)<br>5. `tourId` denormalize từ booking; tạo review `isApproved = false` (chờ admin duyệt — A-REV-2)<br>6. Trả review | Customer | **Review**, Booking | reviews, bookings | Activity | 🕒 Cần booking **PAID của chính chủ**; pre-moderation (verified-purchase chỉ chống fake, không chống nội dung bẩn/PII) |

## `Booking`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-BKG-1 | Create Booking<br>`POST /bookings` | 1. User chọn tour + departure, nhập số người lớn/trẻ em + liên hệ + `paymentProvider` (STRIPE/PAYPAL)<br>2. Gửi `POST /bookings` (Bearer)<br>3. Tour phải publish (404), departure thuộc tour (404) + `OPEN` (400 `DEPARTURE_NOT_OPEN`)<br>4. **`startDate` đã qua → 400 `DEPARTURE_DEPARTED`** (same-day vẫn đặt)<br>5. Soft-check còn ghế (409 `SEATS_NOT_AVAILABLE`) — *không* giữ ghế ở PENDING<br>6. `totalAmount = (priceOverride ?? basePrice) × tổng khách`; sinh mã `BK-XXXXXXXX` (base36)<br>7. Tạo booking `PENDING` (chưa thanh toán). Checkout ở U-BKG-4<br>8. Trả booking | Customer | **Booking**, Tour, TourDeparture | bookings, tours, tour_departures | Sequence | 🕒 Ghế **chỉ được giữ khi PAID** (CTE nguyên tử ở S-PAY-1/U-BKG-5), không phải lúc PENDING |
| U-BKG-2 | My Bookings<br>`GET /bookings/me` | 1. User mở "Đơn của tôi"<br>2. Gửi `GET /bookings/me`<br>3. Lọc theo `userId`, mới nhất trước (tối đa 50), kèm tiêu đề tour + ngày khởi hành<br>4. Trả danh sách | Customer | **Booking**, Tour, TourDeparture | bookings | Activity | 🕒 Thêm pagination khi làm trang account FE |
| U-BKG-3 | Booking Detail<br>`GET /bookings/:code` | 1. User chọn đơn theo mã<br>2. Gửi `GET /bookings/:code`<br>3. **Chỉ chủ đơn hoặc admin** xem; người khác → 404 `BOOKING_NOT_FOUND` (chống dò mã)<br>4. Trả chi tiết + tour + departure | Customer | **Booking**, Tour, TourDeparture | bookings | Activity | ✅ |
| U-BKG-4 | Start Checkout<br>`POST /bookings/:code/checkout` | 1. User bấm thanh toán cho đơn PENDING<br>2. Gửi `POST /bookings/:code/checkout`<br>3. Owner-or-admin (else 404); phải `PENDING` (else 409 `BOOKING_NOT_PENDING`)<br>4. Theo `paymentProvider`: tạo Stripe Checkout session **hoặc** PayPal order (gọi ngoài DB-write — không giữ kết nối pooler)<br>5. Lỗi cổng → 502 `CHECKOUT_FAILED` (đơn vẫn PENDING, retry được)<br>6. Lưu `providerSessionId`; trả `{ checkoutUrl, bookingCode, status }`<br>7. FE redirect tới `checkoutUrl` | Customer | **Booking** | bookings | Sequence | ✅ |
| U-BKG-5 | Capture PayPal<br>`POST /bookings/:code/capture` | 1. Sau khi buyer duyệt order, PayPal redirect về FE → FE gọi capture<br>2. Owner-or-admin (else 404); phải là booking PAYPAL (else 400) đang PENDING (PAID → trả luôn, idempotent)<br>3. Capture order qua PayPal API<br>4. **Giữ ghế + flip PAID qua CTE nguyên tử** (`claimSeatsForPaid`)<br>5. Nếu hết ghế (race) → refund capture + `REFUNDED` + 409 `SEATS_NOT_AVAILABLE`<br>6. Trả booking | Customer | **Booking**, TourDeparture, Outbox | bookings, tour_departures, outbox | Sequence | ✅ Webhook PayPal (S-PAY-2) là backstop |
| U-BKG-6 | Cancel Booking<br>`POST /bookings/:code/cancel` | 1. User huỷ đơn **PENDING** của mình<br>2. Gửi `POST /bookings/:code/cancel`<br>3. Owner-or-admin (else 404); không PENDING → 409 (đơn PAID đi qua refund admin A-BKG-3)<br>4. Flip `CANCELLED` + `cancelledAt` (không đổi ghế — chưa giữ)<br>5. Trả booking | Customer | **Booking** | bookings | Activity | ✅ |
| U-BKG-7 | Request Cancellation<br>`POST /bookings/:code/cancellation-request` | 1. User xin hủy/hoàn tiền đơn **PAID** của mình + nhập `reason`<br>2. Owner-only (else 404 `BOOKING_NOT_FOUND` — không lộ đơn của người khác); không `PAID` → 409 `CANCELLATION_NOT_ALLOWED`; departure đã khởi hành → 409 `DEPARTURE_ALREADY_STARTED`; đã có request đang mở → 409 `CANCELLATION_ALREADY_REQUESTED`<br>3. **Upsert** theo `bookingId` (1 request/booking) — request `DENIED` trước đó được **reset về `REQUESTED`** khi gửi lại<br>4. Ghi `outbox` CANCELLATION_REQUESTED (email — S-JOB-1); admin xử lý từ hàng đợi A-CXR-1 (refund → A-BKG-3 resolve về `REFUNDED`, hoặc deny → A-CXR-2)<br>5. Trả request (status/reason/createdAt) | Customer | **Booking**, CancellationRequest, Outbox | bookings, cancellation_requests, outbox | Sequence | ✅ Thay cho hack cũ gửi qua Enquiry |

## `Wishlist`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-WSH-1 | Add to Wishlist<br>`POST /wishlist/:tourId` | 1. User thích một tour<br>2. Gửi `POST /wishlist/:tourId` (tourId = UUID)<br>3. Tour phải tồn tại + publish (404)<br>4. Upsert `(userId, tourId)` — idempotent<br>5. Trả bản ghi | Customer | **Wishlist**, Tour | wishlist, tours | Activity | ✅ |
| U-WSH-2 | Remove from Wishlist<br>`DELETE /wishlist/:tourId` | 1. User bỏ thích<br>2. Gửi `DELETE /wishlist/:tourId`<br>3. Xoá bản ghi (idempotent — không lỗi nếu không có)<br>4. Trả xác nhận | Customer | **Wishlist** | wishlist | Activity | ✅ |
| U-WSH-3 | View Wishlist<br>`GET /wishlist/me` | 1. User mở danh sách yêu thích<br>2. Gửi `GET /wishlist/me`<br>3. Trả danh sách (mới nhất trước) kèm preview tour (slug, title, hero, `basePrice`, currency, số ngày) + cờ `isPublished` | Customer | **Wishlist**, Tour | wishlist, tours | Activity | 🕒 Tour bị unpublish vẫn nằm wishlist (FE tự quyết ẩn/hiện qua cờ `isPublished`) |

## `Enquiry` (công khai)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-ENQ-1 | Submit Enquiry<br>`POST /enquiries` | 1. Khách điền form "Inquire Now": `name`, `email`, `message` (+ `phone`, `tourId`, và **lead fields**: `nationality`, `travelDate`, `groupSize`, `budgetTier`, `interests[]`)<br>2. Gửi `POST /enquiries` (công khai)<br>3. **Rate-limit 5/phút** (ThrottlerGuard) + **honeypot `website`**: nếu điền → trả 201 giả (không ghi DB) để không lộ cho bot<br>4. `tourId` (nếu có) phải là tour đã publish (404)<br>5. Trong `$transaction`: tạo enquiry `status=NEW` + ghi `outbox` ENQUIRY_RECEIVED (email ack — gửi bởi S-JOB-1)<br>6. Trả `{ received: true }` | Customer | **Enquiry**, Tour, Outbox | enquiries, tours, outbox | Sequence | ✅ Lead fields ngang form Lily's (P1.7d) |

## `Post` (blog công khai — P-Content)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-PST-1 | List Posts<br>`GET /posts` | 1. User mở blog/journal<br>2. Gửi `GET /posts` với `page`/`pageSize`/`search`/**`tag`** (slug — filter chip, blog-v2 W2)/`sortBy`/`sortOrder` (mặc định mới publish trước)<br>3. Server **chỉ trả `status = PUBLISHED` + `publishedAt <= now()`** (ẩn nháp + bài hẹn giờ)<br>4. Search theo `title` (không phân biệt hoa thường); `Promise.all` list+count<br>5. Trả danh sách + `meta` — mỗi post kèm **`tags[]` + `author { fullName, avatarUrl }`** (không lộ email) + `media[]` (blog-v2 W1) | Customer | **Post**, PostTag, User | posts, post_tags, post_tag_links, users, media_assets | Activity | ✅ |
| U-PST-2 | Post Detail<br>`GET /posts/:slug` | 1. User chọn bài viết<br>2. Gửi `GET /posts/:slug`<br>3. Tìm post `PUBLISHED` + `publishedAt <= now()` theo slug<br>4. Không có/nháp/hẹn giờ → 404 `POST_NOT_FOUND` (không lộ nháp)<br>5. Trả chi tiết (content markdown — render sanitize ở FE) kèm **`tags[]` · `author` · `relatedTours[]`** (tour đã publish, thứ tự admin chọn — blog-v2 W1) · `media[]` (cover + ảnh body) | Customer | **Post**, PostTag, Tour, User | posts, post_tags, post_tours, tours, users, media_assets | Activity | ✅ |
| U-PST-3 | List Post Tags<br>`GET /posts/tags` | 1. `/blog` dựng dải filter chip (`?tag=`)<br>2. Trả các tag **đang được bài PUBLISHED dùng** kèm số bài (`{ slug, name, count }[]`) | Customer | **PostTag** | post_tags, post_tag_links, posts | Activity | ✅ |

## `Subscriber` (newsletter — blog-v2 W5)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| U-SUB-1 | Subscribe Newsletter<br>`POST /newsletter/subscribe` | 1. Khách nhập email ở form footer web (+ `source` VD `footer`)<br>2. Gửi `POST /newsletter/subscribe` (công khai — FE gọi **từ browser** để mỗi visitor ăn budget throttle theo IP riêng)<br>3. **Rate-limit 5/phút/IP** (ThrottlerGuard cục bộ) + **honeypot `website`**: điền → trả 201 giả (không ghi DB)<br>4. Email `trim().toLowerCase()` rồi **upsert theo `email @unique`** với update rỗng — **silent dedupe**: đăng ký trùng trả ack y hệt lần đầu (không lộ "email đã tồn tại")<br>5. Trả `{ received: true }` | Customer | **Subscriber** | subscribers | Sequence | ✅ Không double-opt-in (lead capture nội bộ, không ESP — theo roadmap blog-v2) |

---

## Lịch sử

- **2026-07-05** — **Refund execution + cancellation-request queue:** **bổ sung**
  U-BKG-7 (`POST /bookings/:code/cancellation-request` — owner-only, upsert 1
  request/booking, reset request `DENIED` cũ khi gửi lại) — **thay cho hack cũ**
  gửi yêu cầu hủy qua Enquiry. Xem
  [spec](../06-specs/2026-07-04-refund-cancellation-queue-design.md).
- **2026-07-05** — **blog-v2 (W1/W2/W5):** U-PST-1 thêm filter `tag` + DTO kèm
  `tags[]`/`author`/`media[]`; U-PST-2 kèm `relatedTours[]`; **bổ sung** U-PST-3
  (`GET /posts/tags`) + nhóm `Subscriber` với U-SUB-1 (`POST /newsletter/subscribe` —
  throttle + honeypot + silent dedupe). Xem
  [blog-v2 roadmap](../07-plans/2026-07-03-blog-v2-roadmap.md).
- **2026-06-24** — Đổi quy ước **Code** sang `U-<MODEL>-<n>` (nhúng mã model 3 ký tự,
  số reset theo từng model) để đọc code là biết model — thay cho `U-xx` tuần tự cũ.
  Cập nhật toàn bộ cross-reference. Bảng map cũ→mới: U-01…05 → U-USR-1…5 · U-06/07 →
  U-DST-1/2 · U-08/09 → U-CAT-1/2 · U-10/11 → U-TUR-1/2 · U-12 → U-DEP-1 · U-13/14 →
  U-REV-1/2 · U-15…20 → U-BKG-1…6 · U-21…23 → U-WSH-1…3 · U-24 → U-ENQ-1 · U-25/26 →
  U-PST-1/2.
- **2026-06-21** — Thêm nhóm `Post` (U-PST-1/U-PST-2, trước là U-25/U-26): blog công
  khai (P-Content) — chỉ `PUBLISHED` + `publishedAt <= now()`. Xem
  [spec](../06-specs/2026-06-21-blog-editorial-post-schema.md).
- **2026-06-20** — Khởi tạo catalog cho `@tourism/api` (P1.1–P1.x + P1.7d/e). Dựng từ
  code thật; chia theo model. Khác donor: EN-only · M:N destination · category lookup ·
  Stripe+PayPal · email qua outbox · Enquiry + merchandising. Đối chiếu
  [functions-admin.md](functions-admin.md) + [functions-system.md](functions-system.md).
