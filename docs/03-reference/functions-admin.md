<!-- markdownlint-disable MD033 MD013 -->
<!-- MD033 (inline HTML): các cell trong bảng dùng <br> để xuống dòng từng bước
     — bắt buộc với bảng GFM nhiều dòng, không thay được bằng markdown thuần.
     MD013 (line length): một row của bảng GFM phải nằm trọn trên một dòng. -->

# Function Catalog — Admin

Danh sách function **phía quản trị** của backend `@tourism/api`, dựng trực tiếp từ
endpoint thực tế trong `apps/api/src/modules` (đối chiếu
[data-model.md](../01-architecture/data-model.md) và `prisma/schema.prisma`). Phần
**Description** viết tiếng Việt theo từng bước để vẽ **Activity / Sequence diagram**.

> Function khách hàng: [functions-customer.md](functions-customer.md) · Webhook +
> job nền: [functions-system.md](functions-system.md).

## Quy ước

- **Code** — `A-<MODEL>-<n>`: `A` = actor Admin · `<MODEL>` = mã 3 ký tự của
  **model chính** (model in **đậm** ở cột Models) · `<n>` = số thứ tự **reset theo
  từng model**. VD `A-DST-5` = function admin thứ 5 thuộc model `Destination`.
  Thêm function mới chỉ nối dài chuỗi của model đó — không phải đánh số lại toàn bộ.
- **Mã model** (dùng chung cả 3 catalog): `USR` User · `CAT` TourCategory ·
  `DST` Destination · `TUR` Tour · `DEP` TourDeparture · `MED` MediaAsset/Upload ·
  `REV` Review · `ENQ` Enquiry · `BKG` Booking · `STA` Stats (tổng hợp) · `PST` Post.
- **Functions / Description / Entity / Models / Database / Diagram** — như catalog customer.
- **Trạng thái** — ✅ **Ổn** · 🕒 **Lưu ý/Tương lai**.

> **Phân quyền:** mọi endpoint admin cần JWT đã `/auth/admin/sync` (A-USR-1), gác bằng
> `@Roles(ADMIN)` + email trong allowlist `ADMIN_EMAILS`.
>
> **Chính sách xóa — 3 tầng** (kế thừa donor): (1) **ẩn** trước (`isActive`/`isPublished`
> = false, đảo ngược được); (2) **chỉ bản ghi đã ẩn mới xóa cứng** (guard
> `*_IS_ACTIVE`/`*_IS_PUBLISHED` → 409); (3) bản ghi đã được tham chiếu (destination
> có tour, tour có booking, departure có booking) thì **bất tử** nhờ FK `Restrict`
> (P2003 → 409). `Booking` / `Review` / `PaymentEvent` / `User` **không có endpoint
> xóa** — hồ sơ tài chính + nội dung người dùng chỉ đổi trạng thái.
>
> **Slug** (A-CAT-3/4, A-DST-3/4, A-TUR-3/4): `slug` tùy chọn, format tự do → server
> chuẩn hóa qua `slugify()` (bỏ dấu, lowercase, kebab, cắt độ dài); bỏ trống → tự sinh
> từ `name`/`title`; trùng → 409 `*_SLUG_EXISTS`.

---

## Account · `User`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-USR-1 | Admin Sync Account<br>`POST /auth/admin/sync` | 1. Admin đăng nhập qua Supabase (FE admin), nhận token<br>2. Gửi `POST /auth/admin/sync` (Bearer)<br>3. Guard verify JWT<br>4. **Email phải nằm trong `ADMIN_EMAILS`** — không thì 403 `NOT_ADMIN` (không âm thầm về CUSTOMER)<br>5. Upsert user, **force `role = ADMIN`**<br>6. Trả hồ sơ admin | Admin | **User** | users | Sequence | ✅ |

## `TourCategory`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-CAT-1 | List Categories<br>`GET /admin/tour-categories` | 1. Admin mở quản lý danh mục<br>2. Gửi `GET /admin/tour-categories` (thấy cả inactive)<br>3. Trả danh sách (sắp theo `order`) | Admin | **TourCategory** | tour_categories | Activity | ✅ |
| A-CAT-2 | View Category<br>`GET /admin/tour-categories/:slug` | 1. Gửi `GET /admin/tour-categories/:slug` (không lọc `isActive`)<br>2. Trả chi tiết hoặc 404 `CATEGORY_NOT_FOUND` | Admin | **TourCategory** | tour_categories | Activity | ✅ |
| A-CAT-3 | Create Category<br>`POST /admin/tour-categories` | 1. Admin nhập `name`, `description`, `order`, `isActive`; `slug` tùy chọn<br>2. Server chuẩn hóa/sinh slug qua `slugify()`<br>3. Trùng slug → 409 `CATEGORY_SLUG_EXISTS`<br>4. Tạo bản ghi; trả category | Admin | **TourCategory** | tour_categories | Activity | ✅ |
| A-CAT-4 | Update Category<br>`PATCH /admin/tour-categories/:slug` | 1. Admin sửa trường bất kỳ<br>2. Validate; slug gửi kèm cũng qua `slugify()`<br>3. Cập nhật; trả bản ghi | Admin | **TourCategory** | tour_categories | Activity | ✅ |
| A-CAT-5 | Delete Category<br>`DELETE /admin/tour-categories/:slug` | 1. Admin xoá danh mục<br>2. Còn tour tham chiếu → 409 `CATEGORY_HAS_TOURS` (FK Restrict)<br>3. Xoá cứng; trả xác nhận | Admin | **TourCategory**, Tour | tour_categories, tours | Activity | ✅ |

## `Destination`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-DST-1 | List Destinations<br>`GET /admin/destinations` | 1. Admin mở quản lý điểm đến<br>2. Gửi `GET /admin/destinations` (thấy cả inactive)<br>3. Phân trang; trả danh sách | Admin | **Destination** | destinations | Activity | ✅ |
| A-DST-2 | View Destination<br>`GET /admin/destinations/:slug` | 1. Gửi `GET /admin/destinations/:slug` (không lọc `isActive`)<br>2. Trả chi tiết (+ media) hoặc 404 | Admin | **Destination**, MediaAsset | destinations, media_assets | Activity | ✅ |
| A-DST-3 | Create Destination<br>`POST /admin/destinations` | 1. Admin nhập `name`, `country`, `region`, `description`; `slug` tùy chọn<br>2. Chuẩn hóa/sinh slug (`slugify`, cắt 80)<br>3. Trùng → 409 `DESTINATION_SLUG_EXISTS`<br>4. Tạo bản ghi; trả destination | Admin | **Destination** | destinations | Activity | ✅ |
| A-DST-4 | Update Destination<br>`PATCH /admin/destinations/:slug` | 1. Admin sửa trường bất kỳ (gồm `isActive`)<br>2. slug gửi kèm qua `slugify()`<br>3. Cập nhật (đổi slug làm hỏng bookmark cũ); trả bản ghi | Admin | **Destination** | destinations | Activity | ✅ |
| A-DST-5 | Set Destination Media<br>`PUT /admin/destinations/:slug/media` | 1. Admin gửi `{ media: [...] }` (publicId từ A-MED-1) — replace-all<br>2. Trong `$transaction`: media cũ bị bỏ → ghi `media_garbage`; ghi media mới<br>3. Trả media set kèm URL Cloudinary | Admin | **Destination**, MediaAsset, MediaGarbage | destinations, media_assets, media_garbage | Sequence | ✅ |
| A-DST-6 | Delete Destination<br>`DELETE /admin/destinations/:slug` | 1. Admin xoá điểm đến<br>2. **Đang `isActive` → 409 `DESTINATION_IS_ACTIVE`** (deactivate trước)<br>3. Còn tour tham chiếu → 409 `DESTINATION_HAS_TOURS` (FK Restrict)<br>4. Xoá cứng + media (publicId → garbage) trong cùng tx; trả xác nhận | Admin | **Destination**, Tour, MediaGarbage | destinations, tours, media_garbage | Activity | ✅ |

## `Tour`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-TUR-1 | List Tours<br>`GET /admin/tours` | 1. Admin mở quản lý tour (cả nháp)<br>2. Gửi `GET /admin/tours`; phân trang<br>3. Trả danh sách | Admin | **Tour** | tours | Activity | ✅ |
| A-TUR-2 | View Tour<br>`GET /admin/tours/:slug` | 1. Gửi `GET /admin/tours/:slug` (cả nháp) kèm category/destinations/itinerary/faqs/policies/media<br>2. 404 `TOUR_NOT_FOUND` nếu thiếu; trả chi tiết | Admin | **Tour**, TourCategory, Destination, TourItineraryDay, TourFaq, TourPolicy, MediaAsset | tours, tour_destinations, tour_itinerary_days, tour_faqs, tour_policies, media_assets | Activity | ✅ |
| A-TUR-3 | Create Tour<br>`POST /admin/tours` | 1. Admin nhập `title`, `summary`, **`categorySlug`**, **`destinationSlugs[]` + `primaryDestinationSlug`** (M:N), `durationDays`, `basePrice`, currency, `suitableFor`/`badges`, nested `itinerary`/`faqs`/`policies`; `slug` tùy chọn<br>2. Resolve slug → id; category/destination sai → 400 `INVALID_CATEGORY`/`INVALID_DESTINATION`; primary ∉ list → 400<br>3. Chuẩn hóa/sinh slug (cắt 120); trùng → 409 `TOUR_SLUG_EXISTS`<br>4. Tạo tour (mặc định chưa publish) + join destinations (cờ `isPrimary`) + sub-entity, trong `$transaction`<br>5. Trả tour | Admin | **Tour**, TourCategory, Destination, TourItineraryDay, TourFaq, TourPolicy | tours, tour_destinations, … | Activity | ✅ |
| A-TUR-4 | Update Tour<br>`PATCH /admin/tours/:slug` | 1. Admin sửa tour (publish/ẩn, giá, nội dung, `suitableFor`/`badges`…)<br>2. Gửi `destinationSlugs` thì revalidate + thay cả set M:N; slug gửi kèm qua `slugify()`<br>3. Cập nhật (sub-entity gửi kèm = replace-all)<br>4. Trả tour | Admin | **Tour**, Destination, … | tours, tour_destinations, … | Activity | 🕒 Unpublish tour đang có booking PAID làm trang tour 404 với khách đã mua — cân nhắc cảnh báo ở admin FE |
| A-TUR-5 | Set Tour Media<br>`PUT /admin/tours/:slug/media` | 1. Admin gửi `{ media: [...] }` (publicId từ A-MED-1) — replace-all<br>2. `$transaction`: media bỏ → `media_garbage`; ghi media mới<br>3. Trả media set kèm URL | Admin | **Tour**, MediaAsset, MediaGarbage | tours, media_assets, media_garbage | Sequence | ✅ |
| A-TUR-6 | Delete Tour<br>`DELETE /admin/tours/:slug` | 1. Admin xoá tour<br>2. **Đang publish → 409 `TOUR_IS_PUBLISHED`** (unpublish trước)<br>3. Còn booking tham chiếu (mọi status) → 409 `TOUR_HAS_BOOKINGS` (FK Restrict)<br>4. Xoá cứng + media (→ garbage); itinerary/faqs/policies/departures/reviews/wishlist cascade — trong `$transaction`<br>5. Trả xác nhận | Admin | **Tour**, Booking, MediaGarbage | tours, bookings, media_garbage | Activity | ✅ |

## `TourDeparture` (nested dưới tour)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-DEP-1 | List Departures<br>`GET /admin/tours/:slug/departures` | 1. Admin xem toàn bộ lịch khởi hành (cả `CLOSED`/`CANCELLED`)<br>2. Lọc `from`/`to`/`status` (không default)<br>3. Trả danh sách đầy đủ | Admin | **TourDeparture**, Tour | tour_departures, tours | Activity | ✅ |
| A-DEP-2 | Create Departure<br>`POST /admin/tours/:slug/departures` | 1. Admin nhập `startDate`, `endDate`, `seatsTotal`, `priceOverride`, `status`<br>2. `endDate < startDate` → 400 `INVALID_DATE_RANGE`<br>3. **`startDate` đã qua → 400 `DEPARTURE_IN_PAST`** (đồng bộ U-BKG-1, chống "chuyến ma")<br>4. Tạo departure (`seatsBooked = 0`); trả bản ghi | Admin | **TourDeparture**, Tour | tour_departures, tours | Activity | ✅ |
| A-DEP-3 | Update Departure<br>`PATCH /admin/tours/:slug/departures/:id` | 1. Admin sửa departure (ghế, giá, trạng thái…)<br>2. Guard `seatsTotal >= seatsBooked` (400 `SEATS_TOTAL_BELOW_BOOKED`); sửa 1 ngày → validate chéo<br>3. Cập nhật; trả departure | Admin | **TourDeparture** | tour_departures | Activity | 🕒 Set `CANCELLED` khi đang có booking PAID không tự refund/notify — cần flow liên kết ở admin FE |
| A-DEP-4 | Delete Departure<br>`DELETE /admin/tours/:slug/departures/:id` | 1. Admin xoá departure<br>2. Đã bán ghế / còn booking row (mọi status) → 409 `DEPARTURE_HAS_BOOKINGS` (FK Restrict)<br>3. Xoá cứng (chỉ departure chưa từng có booking); trả xác nhận | Admin | **TourDeparture** | tour_departures | Activity | ✅ Khuyến nghị set `CANCELLED` (soft) thay vì xóa |

## `MediaAsset` / Uploads

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-MED-1 | Sign Upload<br>`POST /admin/uploads/signed-url` | 1. Admin chọn ảnh/clip + `purpose` (`TOUR_HERO`/`TOUR_GALLERY`/`TOUR_VIDEO`/`DESTINATION_HERO`/`DESTINATION_VIDEO`/`USER_AVATAR`)<br>2. Gửi kèm `filename`, `contentType`<br>3. Server validate định dạng theo purpose (400 `MEDIA_FORMAT_REJECTED`) rồi ký chữ ký Cloudinary trên `folder` + `publicId` **do server tự quyết** (sanitize chống path-traversal)<br>4. Trả payload ký (`signature`, `timestamp`, `apiKey`, `cloudName`, `folder`, `publicId`, …)<br>5. FE `POST` thẳng file lên Cloudinary; rồi lưu `publicId` qua A-DST-5/A-TUR-5/U-USR-4 (server không chạm bytes) | Admin | — (Cloudinary) → **MediaAsset** | media_assets | Sequence | ✅ |

## `Review`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-REV-1 | Moderation Queue<br>`GET /admin/reviews` | 1. Admin mở hàng chờ duyệt<br>2. Gửi `GET /admin/reviews` (lọc `isApproved` tùy chọn), mới nhất trước<br>3. Admin được xem PII — giữ `userId`/`bookingId` + join tên reviewer + slug tour<br>4. Phân trang; trả danh sách | Admin | **Review**, User, Tour | reviews, users, tours | Activity | ✅ |
| A-REV-2 | Moderate Review<br>`PATCH /admin/reviews/:id/moderation` | 1. Admin xem review chờ duyệt<br>2. Gửi `{ isApproved: true \| false }`<br>3. 404 `REVIEW_NOT_FOUND` nếu thiếu<br>4. Trong `$transaction`: cập nhật `isApproved`; **khi false→true** thì ghi `outbox` REVIEW_APPROVED (email — S-JOB-1, `skipDuplicates`)<br>5. Trả review | Admin | **Review**, Outbox | reviews, outbox | Activity | 🕒 Thêm audit `moderated_by`/`moderated_at` khi làm admin FE |

## `Enquiry`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-ENQ-1 | CRM List<br>`GET /admin/enquiries` | 1. Admin mở CRM lead<br>2. Gửi `GET /admin/enquiries` (lọc `status` tùy chọn), mới nhất trước<br>3. `Promise.all` list+count; trả đầy đủ row (gồm lead fields P1.7d) | Admin | **Enquiry** | enquiries | Activity | ✅ |
| A-ENQ-2 | Update Enquiry Status<br>`PATCH /admin/enquiries/:id/status` | 1. Admin chuyển pipeline (`NEW → CONTACTED → QUOTED → WON/LOST`)<br>2. Gửi `{ status }`; 404 `ENQUIRY_NOT_FOUND` nếu thiếu<br>3. Cập nhật `status`; trả enquiry | Admin | **Enquiry** | enquiries | Activity | 🕒 Thêm `assignedTo`/note + alert lead mới khi vận hành sales |

## `Booking`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-BKG-1 | List Bookings<br>`GET /admin/bookings` | 1. Admin mở quản lý đơn hàng<br>2. Gửi `GET /admin/bookings` với `page`/`pageSize`; lọc `status` tùy chọn + `search` (khớp **case-insensitive** trên `code`/`contactEmail`/`contactName`)<br>3. `Promise.all` list (kèm tour + departure) + count (pooler-safe), mới nhất trước<br>4. Trả danh sách + `meta` (`page`/`pageSize`/`total`/`totalPages`) | Admin | **Booking**, Tour, TourDeparture | bookings, tours, tour_departures | Activity | ✅ |
| A-BKG-2 | Booking Detail<br>`GET /admin/bookings/:code` | 1. Admin chọn đơn theo mã<br>2. Gửi `GET /admin/bookings/:code`<br>3. **Admin xem mọi đơn** (không owner-check như U-BKG-3); thiếu → 404 `BOOKING_NOT_FOUND`<br>4. Trả chi tiết + tour + departure | Admin | **Booking**, Tour, TourDeparture | bookings, tours, tour_departures | Activity | ✅ |
| A-BKG-3 | Refund Booking<br>`POST /admin/bookings/:code/refund` | 1. Admin chọn booking `PAID` + nhập `reason`<br>2. Phải `PAID` + có `providerPaymentId` (else 400 `BOOKING_NOT_REFUNDABLE`)<br>3. **Gọi refund cổng TRƯỚC** (Stripe/PayPal); lỗi → 400 `REFUND_FAILED` (giữ PAID); riêng "đã hoàn out-of-band" → hội tụ tiếp<br>4. **CTE nguyên tử** (gated `status='PAID'`): release ghế + flip `REFUNDED` + audit `refund_reason`/`refunded_by` + ghi `outbox` BOOKING_REFUNDED (email — S-JOB-1)<br>5. Trả booking | Admin | **Booking**, TourDeparture, Outbox | bookings, tour_departures, outbox | Sequence | 🕒 Partial refund khi nghiệp vụ cần |

## Stats

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-STA-1 | Dashboard Stats<br>`GET /admin/stats/dashboard` | 1. Admin mở dashboard<br>2. Server chạy **`Promise.all`** (pooler-safe): overview (doanh thu từ booking `PAID`, conversion rate), `bookingsByStatus` (groupBy), top tour theo doanh thu / rating / wishlist, `monthlyTrend` 6 tháng (`$queryRaw` `date_trunc`)<br>3. Trả payload tổng hợp | Admin | **Booking**, Review, Wishlist, Tour | bookings, reviews, wishlist, tours | Activity | 🕒 (1) lời/vốn cần thêm `costPrice` vào Tour; (2) doanh thu cộng thô `totalAmount` chưa quy đổi tiền tệ (hiện toàn USD) |

## `Post` (blog biên tập — P-Content)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-PST-1 | List Posts<br>`GET /admin/posts` | 1. Admin mở quản lý blog<br>2. Gửi `GET /admin/posts` (thấy cả `DRAFT`); lọc `status`/`search` tùy chọn, mới nhất trước<br>3. Phân trang; trả danh sách | Admin | **Post** | posts | Activity | ✅ |
| A-PST-2 | View Post<br>`GET /admin/posts/:slug` | 1. Gửi `GET /admin/posts/:slug` (không lọc status)<br>2. Trả chi tiết hoặc 404 `POST_NOT_FOUND` | Admin | **Post** | posts | Activity | ✅ |
| A-PST-3 | Create Post<br>`POST /admin/posts` | 1. Admin nhập `title`, `excerpt`, `content` (markdown), `status`; `slug` tùy chọn<br>2. **`authorId` lấy từ JWT** (không nhận từ body)<br>3. Chuẩn hóa/sinh slug (`slugify`, cắt 80); trùng → 409 `POST_SLUG_EXISTS`<br>4. Tạo bản ghi; **`PUBLISHED` → stamp `publishedAt`** (DRAFT để null)<br>5. Trả post | Admin | **Post**, User | posts, users | Activity | ✅ |
| A-PST-4 | Update Post<br>`PATCH /admin/posts/:slug` | 1. Admin sửa trường bất kỳ (publish/ẩn, nội dung)<br>2. slug gửi kèm qua `slugify()`; trùng → 409<br>3. **Lần đầu chuyển sang `PUBLISHED` → stamp `publishedAt`** (giữ nguyên về sau, kể cả khi quay lại DRAFT)<br>4. Cập nhật; trả post | Admin | **Post** | posts | Activity | ✅ |
| A-PST-5 | Delete Post<br>`DELETE /admin/posts/:slug` | 1. Admin xoá bài<br>2. 404 `POST_NOT_FOUND` nếu thiếu<br>3. Xoá cứng trực tiếp (không có bản ghi phụ thuộc); trả xác nhận | Admin | **Post** | posts | Activity | ✅ |

---

## Lịch sử

- **2026-06-24** — (1) Đổi quy ước **Code** sang `A-<MODEL>-<n>` (nhúng mã model 3 ký
  tự, số reset theo từng model) thay cho `A-xx` tuần tự; cập nhật toàn bộ cross-reference.
  Map cũ→mới: A-01 → A-USR-1 · A-02…06 → A-CAT-1…5 · A-07…12 → A-DST-1…6 · A-13…18 →
  A-TUR-1…6 · A-19…22 → A-DEP-1…4 · A-23 → A-MED-1 · A-24/25 → A-REV-1/2 · A-26/27 →
  A-ENQ-1/2 · A-28 → A-BKG-3 · A-29 → A-STA-1 · A-30…34 → A-PST-1…5. (2) **Bổ sung**
  `A-BKG-1` List Bookings + `A-BKG-2` Booking Detail (`GET /admin/bookings[/:code]`,
  thêm ở backend audit P4) — trước đó catalog thiếu, chỉ có Refund.
- **2026-06-21** — Thêm nhóm `Post` (A-PST-1…A-PST-5, trước là A-30…A-34): CRUD blog
  biên tập (P-Content). Author lấy từ JWT; slug auto từ `title`; `publishedAt` stamp lần
  đầu publish. Cover/media qua `MediaAsset(ownerType=POST)`. Xem
  [spec](../06-specs/2026-06-21-blog-editorial-post-schema.md).
- **2026-06-20** — Khởi tạo catalog admin cho `@tourism/api`. Dựng từ code thật; chia
  theo model. Chính sách xóa 3 tầng + slug auto-normalize giữ từ donor. Khác donor:
  M:N destination (A-TUR-3/4) · merchandising `suitableFor`/`badges` · email refund/review
  qua outbox (S-JOB-1). Đối chiếu [functions-customer.md](functions-customer.md) +
  [functions-system.md](functions-system.md).
