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
  `REV` Review · `ENQ` Enquiry · `BKG` Booking · `CXR` CancellationRequest ·
  `STA` Stats (tổng hợp) · `PST` Post · `SUB` Subscriber (newsletter) ·
  `OUT` Outbox (email queue) · `PAY` PaymentEvent.
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
| A-USR-2 | Change User Role<br>`PATCH /admin/users/:id/role` | 1. Admin đổi role CUSTOMER↔ADMIN từ trang user detail<br>2. Guard 409: tự đổi role mình (`ROLE_SELF_CHANGE`) · demote admin thuộc `ADMIN_EMAILS` (`ROLE_ENV_ADMIN`)<br>3. **Demote chạy locking-CTE claim một statement (wave D2)**: `FOR UPDATE` toàn bộ hàng ADMIN + đếm trong cùng statement — 2 demote đồng thời không thể cùng qua, không bao giờ còn 0 admin; claim rỗng → 409 `ROLE_LAST_ADMIN`<br>4. Promote = `update` thường; trả hồ sơ mới | Admin | **User** | users | Sequence | ✅ |
| A-USR-3 | Delete User<br>`DELETE /admin/users/:id` | 1. Admin xóa tài khoản khách<br>2. Guard 409: tự xóa mình (`USER_SELF_DELETE`) · target là ADMIN (`USER_IS_ADMIN` — demote trước) · còn booking (`ACCOUNT_HAS_BOOKINGS`) · có bài blog (`USER_HAS_POSTS`)<br>3. `$transaction`: GC avatar + **`deleteMany({id, role: CUSTOMER})` có điều kiện (wave D2)** — target bị promote xen kẽ thì count 0 → 409, đóng đường vòng promote→demote→delete quanh invariant last-admin<br>4. Xóa identity Supabase best-effort | Admin | **User**, MediaAsset | users, media_assets, media_garbage | Sequence | ✅ |

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
| A-DST-5 | Set Destination Media<br>`PUT /admin/destinations/:slug/media` | 1. Admin gửi `{ media: [...] }` (publicId từ A-MED-1 hoặc **tái dùng từ thư viện** `GET /admin/media`, wave D1) — replace-all, mỗi item mang **`alt?`** tùy chọn (bỏ qua trên dòng đang giữ = giữ nguyên alt cũ)<br>2. Trong `$transaction`: media cũ bị bỏ → ghi `media_garbage` **chỉ khi không còn owner nào khác tham chiếu publicId đó** (ref-safe guard, wave D1); ghi media mới<br>3. Trả media set kèm URL Cloudinary | Admin | **Destination**, MediaAsset, MediaGarbage | destinations, media_assets, media_garbage | Sequence | ✅ |
| A-DST-6 | Delete Destination<br>`DELETE /admin/destinations/:slug` | 1. Admin xoá điểm đến<br>2. **Đang `isActive` → 409 `DESTINATION_IS_ACTIVE`** (deactivate trước)<br>3. Còn tour tham chiếu → 409 `DESTINATION_HAS_TOURS` (FK Restrict)<br>4. Xoá cứng + media (publicId → garbage) trong cùng tx; trả xác nhận | Admin | **Destination**, Tour, MediaGarbage | destinations, tours, media_garbage | Activity | ✅ |

## `Tour`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-TUR-1 | List Tours<br>`GET /admin/tours` | 1. Admin mở quản lý tour (cả nháp)<br>2. Gửi `GET /admin/tours`; phân trang<br>3. Trả danh sách | Admin | **Tour** | tours | Activity | ✅ |
| A-TUR-2 | View Tour<br>`GET /admin/tours/:slug` | 1. Gửi `GET /admin/tours/:slug` (cả nháp) kèm category/destinations/itinerary/faqs/policies/media<br>2. 404 `TOUR_NOT_FOUND` nếu thiếu; trả chi tiết | Admin | **Tour**, TourCategory, Destination, TourItineraryDay, TourFaq, TourPolicy, MediaAsset | tours, tour_destinations, tour_itinerary_days, tour_faqs, tour_policies, media_assets | Activity | ✅ |
| A-TUR-3 | Create Tour<br>`POST /admin/tours` | 1. Admin nhập `title`, `summary`, **`categorySlug`**, **`destinationSlugs[]` + `primaryDestinationSlug`** (M:N), `durationDays`, `basePrice`, currency, `suitableFor`/`badges`, nested `itinerary`/`faqs`/`policies`; `slug` tùy chọn<br>2. Resolve slug → id; category/destination sai → 400 `INVALID_CATEGORY`/`INVALID_DESTINATION`; primary ∉ list → 400<br>3. Chuẩn hóa/sinh slug (cắt 120); trùng → 409 `TOUR_SLUG_EXISTS`<br>4. Tạo tour (mặc định chưa publish) + join destinations (cờ `isPrimary`) + sub-entity, trong `$transaction`<br>5. Trả tour | Admin | **Tour**, TourCategory, Destination, TourItineraryDay, TourFaq, TourPolicy | tours, tour_destinations, … | Activity | ✅ |
| A-TUR-4 | Update Tour<br>`PATCH /admin/tours/:slug` | 1. Admin sửa tour (publish/ẩn, giá, nội dung, `suitableFor`/`badges`…)<br>2. Gửi `destinationSlugs` thì revalidate + thay cả set M:N; slug gửi kèm qua `slugify()`<br>3. Cập nhật (sub-entity gửi kèm = replace-all)<br>4. Trả tour | Admin | **Tour**, Destination, … | tours, tour_destinations, … | Activity | 🕒 Unpublish tour đang có booking PAID làm trang tour 404 với khách đã mua — cân nhắc cảnh báo ở admin FE |
| A-TUR-5 | Set Tour Media<br>`PUT /admin/tours/:slug/media` | 1. Admin gửi `{ media: [...] }` (publicId từ A-MED-1 hoặc **tái dùng từ thư viện**, wave D1) — replace-all, mỗi item mang **`alt?`** tùy chọn (bỏ qua trên dòng đang giữ = giữ nguyên alt cũ)<br>2. `$transaction`: media bỏ → `media_garbage` **chỉ khi không còn owner nào khác tham chiếu publicId đó** (ref-safe guard, wave D1); ghi media mới<br>3. Trả media set kèm URL | Admin | **Tour**, MediaAsset, MediaGarbage | tours, media_assets, media_garbage | Sequence | ✅ |
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
| A-MED-1 | Sign Upload<br>`POST /admin/uploads/signed-url` | 1. Admin chọn ảnh/clip + `purpose` (`TOUR_HERO`/`TOUR_GALLERY`/`TOUR_VIDEO`/`DESTINATION_HERO`/`DESTINATION_GALLERY`/`DESTINATION_VIDEO`/`USER_AVATAR`/**`POST_COVER`**/**`POST_BODY`**)<br>2. Gửi kèm `filename`, `contentType`<br>3. Server validate định dạng theo purpose (400 `MEDIA_FORMAT_REJECTED`) rồi ký chữ ký Cloudinary trên `folder` + `publicId` **do server tự quyết** (sanitize chống path-traversal)<br>4. Trả payload ký (`signature`, `timestamp`, `apiKey`, `cloudName`, `folder`, `publicId`, …)<br>5. FE `POST` thẳng file lên Cloudinary; rồi lưu `publicId` qua A-DST-5/A-TUR-5/A-PST-7/A-PST-8/U-USR-4 (server không chạm bytes) | Admin | — (Cloudinary) → **MediaAsset** | media_assets | Sequence | ✅ |
| A-MED-2 | List Media Library<br>`GET /admin/media` | 1. Admin mở thư viện `/media` toàn hệ thống (hoặc dialog "Choose from library" trong `MediaField`, wave D1)<br>2. Lọc `ownerType`/`role`/`type` + search publicId + **`excludeUserOwned`** (ẩn avatar khách — picker luôn bật từ wave D1; trang `/media` cũng bật **mặc định** từ 2026-07-12, chọn facet "User avatars" hoặc role "Avatar" để xem lại), phân trang<br>3. Server resolve **owner** cho từng asset (tour/destination/post/user) để hiện link<br>4. Trả danh sách + meta; mỗi dòng kèm **`alt`** (nullable, wave D1) | Admin | **MediaAsset**, Tour, Destination, Post, User | media_assets, … | Activity | ✅ |
| A-MED-3 | Delete Media Asset<br>`DELETE /admin/media/:id` | 1. Admin gỡ 1 asset khỏi owner (VD ảnh body đã bỏ khỏi markdown)<br>2. 404 nếu id lạ; **asset USER (avatar) → 409** (không đụng avatar khách)<br>3. `$transaction`: ghi `media_garbage` **chỉ khi không còn owner nào khác tham chiếu publicId đó** (ref-safe guard, wave D1) + xoá row — Cloudinary destroy chạy deferred<br>4. Trả bản ghi đã xoá | Admin | **MediaAsset**, MediaGarbage | media_assets, media_garbage | Sequence | ✅ |
| A-MED-4 | List Garbage Queue<br>`GET /admin/media/garbage` | 1. Admin mở tab Garbage<br>2. Trả hàng đợi Cloudinary-destroy (cũ nhất trước, kèm attempts/lastError) + meta | Admin | **MediaGarbage** | media_garbage | Activity | ✅ |
| A-MED-5 | Run Media Cleanup<br>`POST /admin/media/garbage/reconcile` | 1. Admin bấm "Run cleanup now"<br>2. Chạy ngay 1 batch destroy Cloudinary (same as daily cron S-JOB)<br>3. Trả `{ destroyed, failed }` | Admin | **MediaGarbage** | media_garbage | Sequence | ✅ |
| A-MED-6 | List Appearance Slots<br>`GET /admin/site-media` | 1. Admin mở `/appearance`<br>2. Trả FULL catalog 9 slot brand-chrome (kind/label/group/hint, thứ tự catalog) kèm media hiện tại (slot trống = web dùng default) | Admin | **SiteMediaSlot**, MediaAsset | site_media_slots, media_assets | Activity | ✅ |
| A-MED-7 | Set Appearance Slot<br>`PUT /admin/site-media/:key/media` | 1. Admin Replace/Add/Reset một slot (upload thẳng Cloudinary purpose `SITE_CHROME` trước)<br>2. Validate kind: single ⇒ ≤1 ảnh role `hero`; gallery ⇒ ≤8 role `gallery`; chỉ IMAGE; key lạ → 404 `SITE_SLOT_NOT_FOUND`<br>3. `$transaction` replace-all qua `MediaService.syncAssets` (ảnh bị bỏ → `media_garbage`, ref-safe guard wave D1)<br>4. Body rỗng = reset về default của web | Admin | **SiteMediaSlot**, MediaAsset, MediaGarbage | site_media_slots, media_assets, media_garbage | Sequence | ✅ |
| A-MED-8 | Update Media Alt<br>`PATCH /admin/media/:id` | 1. Admin sửa alt text ngay trong drawer thư viện (wave D1)<br>2. Gửi `{ alt: string \| null }` — `null` xoá alt (web fallback về text tự sinh)<br>3. Id lạ → 404; cập nhật atomic (không check-rồi-update)<br>4. Trả bản ghi đã cập nhật | Admin | **MediaAsset** | media_assets | Activity | ✅ |
| A-MED-9 | Bulk Delete Media<br>`POST /admin/media/bulk-delete` | 1. Admin chọn nhiều tile trong thư viện (checkbox) → xác nhận xoá hàng loạt (wave D1)<br>2. Gửi `{ ids: uuid[] }` (1..100)<br>3. Trong **1 `$transaction`**: bỏ qua id thuộc owner USER (avatar, đếm vào `skipped`, không lỗi); id còn lại ghi `media_garbage` qua guard ref-safe rồi xoá row<br>4. Trả `{ deleted, skipped }` | Admin | **MediaAsset**, MediaGarbage | media_assets, media_garbage | Sequence | ✅ |

## `Review`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-REV-1 | Moderation Queue<br>`GET /admin/reviews` | 1. Admin mở hàng chờ duyệt<br>2. Gửi `GET /admin/reviews` (lọc `isApproved`/**`source`/`rating`/`search`** tùy chọn — `search` OR không phân biệt hoa thường trên `authorName`/`title`/`body`), mới nhất trước<br>3. Admin được xem PII — giữ `userId`/`bookingId` + join tên/email reviewer + mã booking + slug tour (null với review CURATED)<br>4. Phân trang; trả danh sách | Admin | **Review**, User, Tour, Booking | reviews, users, tours, bookings | Activity | ✅ |
| A-REV-2 | Moderate Review<br>`PATCH /admin/reviews/:id/moderation` | 1. Admin xem review chờ duyệt<br>2. Gửi `{ isApproved: true \| false }`<br>3. 404 `REVIEW_NOT_FOUND` nếu thiếu<br>4. Trong `$transaction`: cập nhật `isApproved`; **khi false→true** thì ghi `outbox` REVIEW_APPROVED (email — S-JOB-1, `skipDuplicates`)<br>5. Trả review | Admin | **Review**, Outbox | reviews, outbox | Activity | 🕒 Thêm audit `moderated_by`/`moderated_at` khi làm admin FE |
| A-REV-3 | Edit Curated Review<br>`PATCH /admin/reviews/:id` | 1. Admin sửa testimonial **CURATED** (`rating`/`title`/`body`/`authorName`/`authorLocation`/`tripLabel`… — mọi field optional)<br>2. 404 `REVIEW_NOT_FOUND` nếu thiếu; **review `VERIFIED` → 409 `REVIEW_NOT_CURATED`** (không sửa review thật của khách)<br>3. Field gửi `null` tường minh **xoá** field nullable (`authorLocation`/`tripLabel`…); field bỏ qua giữ nguyên giá trị cũ<br>4. Cập nhật; trả review | Admin | **Review** | reviews | Activity | ✅ |

## `Enquiry`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-ENQ-1 | CRM List<br>`GET /admin/enquiries` | 1. Admin mở CRM lead<br>2. Gửi `GET /admin/enquiries` (lọc `status` tùy chọn), mới nhất trước<br>3. `Promise.all` list+count (+ per-trang `groupBy(email)` tính **`repeatCount`**, exact-match, fallback 1 nếu lỗi); trả đầy đủ row (gồm lead fields P1.7d, **`repeatCount`**, **`notesCount`** từ `_count.notes`) | Admin | **Enquiry** | enquiries | Activity | ✅ |
| A-ENQ-2 | Update Enquiry Status<br>`PATCH /admin/enquiries/:id/status` | 1. Admin chuyển pipeline (`NEW → CONTACTED → QUOTED → WON/LOST`)<br>2. Gửi `{ status }`; 404 `ENQUIRY_NOT_FOUND` nếu thiếu<br>3. Cập nhật `status`; trả enquiry | Admin | **Enquiry** | enquiries | Activity | 🕒 Thêm `assignedTo`/note + alert lead mới khi vận hành sales |
| A-ENQ-3 | List Enquiry Notes<br>`GET /admin/enquiries/:id/notes` | 1. Admin mở drawer lead, xem thread ghi chú nội bộ<br>2. Gửi `GET /admin/enquiries/:id/notes`; 404 `ENQUIRY_NOT_FOUND` nếu thiếu<br>3. Trả danh sách tăng dần theo `createdAt` (kèm `authorName` snapshot) | Admin | **EnquiryNote**, Enquiry | enquiry_notes, enquiries | Activity | ✅ |
| A-ENQ-4 | Add Enquiry Note<br>`POST /admin/enquiries/:id/notes` | 1. Admin nhập `body` cho lead đang mở<br>2. 404 `ENQUIRY_NOT_FOUND` nếu thiếu<br>3. Snapshot `authorId` + `authorName` từ `@CurrentUser` (không đổi ngược nếu tên user đổi sau này)<br>4. Tạo note (append-only, không sửa/xoá); trả bản ghi | Admin | **EnquiryNote**, Enquiry, User | enquiry_notes, enquiries, users | Activity | ✅ |

## `Booking`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-BKG-1 | List Bookings<br>`GET /admin/bookings` | 1. Admin mở quản lý đơn hàng<br>2. Gửi `GET /admin/bookings` với `page`/`pageSize`; lọc `status` tùy chọn + `search` (khớp **case-insensitive** trên `code`/`contactEmail`/`contactName`)<br>3. `Promise.all` list (kèm tour + departure) + count (pooler-safe), mới nhất trước<br>4. **`meta.statusCounts`** (wave C): `groupBy` bổ sung trên cùng `where` **trừ `status`** — đếm từng status cho badge trên tab list; `groupBy` lỗi → field bị bỏ qua (không fail request)<br>5. Trả danh sách + `meta` (`page`/`pageSize`/`total`/`totalPages`/`statusCounts?`) | Admin | **Booking**, Tour, TourDeparture | bookings, tours, tour_departures | Activity | ✅ |
| A-BKG-2 | Booking Detail<br>`GET /admin/bookings/:code` | 1. Admin chọn đơn theo mã<br>2. Gửi `GET /admin/bookings/:code`<br>3. **Admin xem mọi đơn** (không owner-check như U-BKG-3); thiếu → 404 `BOOKING_NOT_FOUND`<br>4. Trả chi tiết + tour + departure | Admin | **Booking**, Tour, TourDeparture | bookings, tours, tour_departures | Activity | ✅ |
| A-BKG-3 | Refund Booking<br>`POST /admin/bookings/:code/refund` | 1. Admin chọn booking `PAID` + nhập `reason`; **`amount` tùy chọn** (theo tiền tệ của booking)<br>2. Phải `PAID` + có `providerPaymentId` (else 400 `BOOKING_NOT_REFUNDABLE`); `amount` ≤0 hoặc > tổng đơn → 400 `INVALID_REFUND_AMOUNT`<br>3. Bỏ trống `amount` (hoặc `amount = tổng`) → **hoàn toàn phần** (release ghế, `REFUNDED`); `0 < amount < tổng` → **hoàn một phần** (giữ nguyên ghế, `PARTIALLY_REFUNDED`, ghi `refunded_amount`)<br>4. **Gọi refund cổng TRƯỚC** (Stripe/PayPal, key idempotency `booking-refund:<id>` chống double-charge khi retry); lỗi → 400 `REFUND_FAILED` (giữ PAID); riêng "đã hoàn out-of-band" → hội tụ tiếp<br>5. **CTE nguyên tử** (gated `status='PAID'`): release ghế (chỉ nhánh full) + flip status + audit `refund_reason`/`refunded_by`/`refunded_amount`; **có cancellation request đang mở thì resolve luôn về `REFUNDED`** + ghi `outbox` BOOKING_REFUNDED (email — S-JOB-1)<br>6. Trả booking | Admin | **Booking**, CancellationRequest, TourDeparture, Outbox | bookings, cancellation_requests, tour_departures, outbox | Sequence | ✅ |

## `CancellationRequest`

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-CXR-1 | List Cancellation Requests<br>`GET /admin/cancellation-requests` | 1. Admin mở hàng đợi yêu cầu hủy/hoàn tiền<br>2. Gửi `GET /admin/cancellation-requests` — mặc định lọc `status=REQUESTED` (hàng đợi mở), đổi được qua query<br>3. `Promise.all` list (kèm booking + tour + departure + khách) + count (pooler-safe), mới nhất trước<br>4. Trả danh sách + `meta` | Admin | **CancellationRequest**, Booking, Tour, TourDeparture | cancellation_requests, bookings, tours, tour_departures | Activity | ✅ |
| A-CXR-2 | Deny Cancellation Request<br>`POST /admin/cancellation-requests/:id/deny` | 1. Admin từ chối 1 yêu cầu đang mở + nhập `decisionNote` tùy chọn<br>2. **Chuyển trạng thái nguyên tử** (gated `status='REQUESTED'`) — chỉ request đang mở mới đổi được<br>3. Không tồn tại → 404 `CANCELLATION_REQUEST_NOT_FOUND`; đã xử lý rồi → 409 `CANCELLATION_NOT_PENDING`<br>4. Set `DENIED` + audit `decision_note`/`decided_by`/`decided_at`; **booking giữ nguyên `PAID`** (deny không hủy đơn) + ghi `outbox` CANCELLATION_DENIED (email — S-JOB-1)<br>5. Trả request đã cập nhật | Admin | **CancellationRequest**, Booking, Outbox | cancellation_requests, bookings, outbox | Sequence | ✅ |

## Stats

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-STA-1 | Dashboard Stats<br>`GET /admin/stats/dashboard?from&to` | 1. Admin mở dashboard (tùy chọn `?from&to` — ngày `YYYY-MM-DD`, biên ngày UTC inclusive; không tham số = toàn thời gian, output như cũ; range ngược/sai → 400 `STATS_RANGE_INVALID`)<br>2. Server chạy **`Promise.all`** (pooler-safe): overview + `bookingsByStatus` + top tour (doanh thu / rating / wishlist) + `dailyTrend` (range kẹp 90 ngày gần nhất, neo tại `now`) lọc theo range; `monthlyTrend` 6 tháng + MoM giữ cố định<br>3. **Per-currency (wave D2, không FX)**: dominant currency = nhiều booking PAID nhất trong range; overview kèm `revenueByCurrency[]`, top-tours group theo (tour, currency), trend revenue chỉ tính dominant<br>4. Trả payload tổng hợp | Admin | **Booking**, Review, Wishlist, Tour | bookings, reviews, wishlist, tours | Activity | 🕒 (1) lời/vốn cần thêm `costPrice` vào Tour |

## `Post` (blog biên tập — P-Content)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-PST-1 | List Posts<br>`GET /admin/posts` | 1. Admin mở quản lý blog<br>2. Gửi `GET /admin/posts` (thấy cả `DRAFT`); lọc `status`/`search` tùy chọn, mới nhất trước<br>3. Phân trang; trả danh sách | Admin | **Post** | posts | Activity | ✅ |
| A-PST-2 | View Post<br>`GET /admin/posts/:slug` | 1. Gửi `GET /admin/posts/:slug` (không lọc status)<br>2. Trả chi tiết hoặc 404 `POST_NOT_FOUND` | Admin | **Post** | posts | Activity | ✅ |
| A-PST-3 | Create Post<br>`POST /admin/posts` | 1. Admin nhập `title`, `excerpt`, `content` (markdown), `status`; `slug` tùy chọn; **`tags[]`** (tên hiển thị) + **`relatedTourSlugs[]`** (≤3) tùy chọn (blog-v2 W1); **`metaTitle`/`metaDescription`** + **`publishedAt`** tùy chọn (wave C)<br>2. **`authorId` lấy từ JWT** (không nhận từ body)<br>3. Chuẩn hóa/sinh slug (`slugify`, cắt 80); trùng → 409 `POST_SLUG_EXISTS`<br>4. Tags **upsert theo slug** (tạo inline nếu chưa có) + link M:N; tour slugs resolve sang tour **đã publish** (sai → 400)<br>5. Tạo bản ghi; `publishedAt` **tường minh luôn thắng** (một ngày tương lai = **hẹn giờ đăng** — reader công khai lọc `publishedAt <= now()`, không cần cron) — bỏ trống thì `PUBLISHED` → stamp `now()`, DRAFT → null; `metaTitle`/`metaDescription` rỗng `''` gập về `null`<br>6. Trả post (kèm tags/author) | Admin | **Post**, PostTag, PostTagLink, PostTour, User | posts, post_tags, post_tag_links, post_tours, users | Activity | ✅ |
| A-PST-4 | Update Post<br>`PATCH /admin/posts/:slug` | 1. Admin sửa trường bất kỳ (publish/ẩn, nội dung, **`metaTitle`/`metaDescription`**, **`publishedAt`** — wave C); `tags[]`/`relatedTourSlugs[]` gửi kèm = **replace-all** (bỏ trống = không đổi)<br>2. slug gửi kèm qua `slugify()`; trùng → 409<br>3. **Lần đầu chuyển sang `PUBLISHED` → stamp `publishedAt`** (giữ nguyên về sau, kể cả khi quay lại DRAFT); `publishedAt` gửi tường minh **luôn thắng** stamp đó (chuỗi ISO → set; `null` = xoá lịch — trên bài đang/sắp `PUBLISHED` nghĩa là **đăng ngay** (re-stamp `now()`), trên `DRAFT` thì xoá hẳn ngày)<br>4. `metaTitle`/`metaDescription` gửi `null` xoá override (reader fallback về title/excerpt); `''` cũng gập về `null`<br>5. Cập nhật; trả post | Admin | **Post**, PostTag, PostTagLink, PostTour | posts, post_tags, post_tag_links, post_tours | Activity | ✅ |
| A-PST-5 | Delete Post<br>`DELETE /admin/posts/:slug` | 1. Admin xoá bài<br>2. 404 `POST_NOT_FOUND` nếu thiếu<br>3. `$transaction`: **media của post (cover + ảnh body) → `media_garbage`** (GC Cloudinary qua cron) rồi xoá post (tag/tour links cascade)<br>4. Trả xác nhận | Admin | **Post**, MediaAsset, MediaGarbage | posts, media_assets, media_garbage, post_tag_links, post_tours | Sequence | ✅ |
| A-PST-6 | List Post Tags<br>`GET /admin/posts/tags` | 1. Form bài viết mở combobox tag<br>2. Trả toàn bộ tag kèm **số bài dùng** (gợi ý + tạo inline ở FE) | Admin | **PostTag** | post_tags, post_tag_links | Activity | ✅ |
| A-PST-7 | Set Post Media<br>`PUT /admin/posts/:slug/media` | 1. Admin gửi `{ media: [...] }` (publicId từ A-MED-1, purpose `POST_COVER`, hoặc **tái dùng từ thư viện**, wave D1) — replace-all cho **cover**, item mang **`alt?`** tùy chọn<br>2. `$transaction` `syncAssets` với **carve-out `preserveRoles: [body]`** — ảnh body chèn trong bài KHÔNG bị GC khi đổi cover (blog-v2 W3); publicId trùng với một ảnh `body` đang giữ → 400 `MEDIA_ROLE_CONFLICT` thay vì lỗi P2002 (wave D1 — VD chọn nhầm ảnh body làm cover)<br>3. Media bỏ → `media_garbage` **chỉ khi không còn owner nào khác tham chiếu** (ref-safe guard, wave D1); trả media set kèm URL | Admin | **Post**, MediaAsset, MediaGarbage | posts, media_assets, media_garbage | Sequence | ✅ |
| A-PST-8 | Register Body Image<br>`POST /admin/posts/:slug/body-images` | 1. Editor upload ảnh (A-MED-1, purpose `POST_BODY`) rồi đăng ký publicId vào bài<br>2. 404 nếu slug lạ<br>3. **Upsert** trên unique `(ownerType, ownerId, publicId)` (idempotent, không race) — role `body`, sortOrder 0<br>4. Trả `{ url }` Cloudinary để chèn `![](url)` vào markdown; ảnh body được GC khi **xoá bài** (A-PST-5), gỡ giữa chừng thì xử lý ở thư viện `/media` (A-MED-3) | Admin | **Post**, MediaAsset | posts, media_assets | Sequence | ✅ |

## `Subscriber` (newsletter — blog-v2 W5)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-SUB-1 | List Subscribers<br>`GET /admin/newsletter/subscribers` | 1. Admin mở Operations → Subscribers<br>2. Lọc `search` (email contains, không phân biệt hoa thường), phân trang, mới nhất trước<br>3. Trả danh sách + meta; **CSV export** là việc của FE admin (route `/subscribers/export` page-through rồi dựng CSV có guard formula-injection) | Admin | **Subscriber** | subscribers | Activity | ✅ |
| A-SUB-2 | Delete Subscriber<br>`DELETE /admin/newsletter/subscribers/:id` | 1. Admin bấm Remove trên 1 dòng subscriber (wave C)<br>2. Không tồn tại → 404 `SUBSCRIBER_NOT_FOUND`<br>3. Xoá cứng; trả xác nhận | Admin | **Subscriber** | subscribers | Activity | ✅ |

## `Outbox` (email queue — quản trị)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-OUT-1 | Delete Outbox Row<br>`DELETE /admin/outbox/:id` | 1. Admin xoá 1 email đang chờ/lỗi trước khi drain gửi đi (wave C)<br>2. Chỉ `PENDING`/`FAILED` mới xoá được — **atomic `deleteMany`** (không check-rồi-xoá) để tránh race với drain cron; `SENT` (đã gửi thật) → 409 `OUTBOX_ROW_SENT` (giữ làm lịch sử gửi)<br>3. Không tồn tại → 404 `OUTBOX_NOT_FOUND`<br>4. Trả xác nhận | Admin | **Outbox** | outbox | Activity | ✅ |

## `PaymentEvent` (webhook log viewer)

| Code | Functions | Description | Entity | Models | Database | Diagram | Trạng thái |
| ---- | --------- | ----------- | ------ | ------ | -------- | ------- | ---------- |
| A-PAY-1 | List Payment Events<br>`GET /admin/payment-events` | 1. Admin mở `/payment-events` để debug webhook (wave C)<br>2. Lọc `provider`/`type` (contains)/`search` (theo `eventId`), phân trang, mới nhất trước<br>3. Trả **kèm `payload` thô** (chỉ admin viewer mới lộ payload, khác booking-detail embed) + `bookingId`/`bookingCode` suy ra **best-effort** từ payload (không có FK — có thể null)<br>4. Trả danh sách + meta | Admin | **PaymentEvent**, Booking | payment_events, bookings | Activity | ✅ |

---

## Lịch sử

- **2026-07-11** — **Media library upgrade (wave D1, `1d76c96`):** GC ref-safe ở
  cả hai đầu — `recordGarbage` (dùng chung bởi A-DST-5/A-TUR-5/A-PST-7/A-MED-3/
  A-MED-9) bỏ qua publicId còn owner khác tham chiếu; `reconcileMedia` (S-JOB)
  có backstop check-trước-khi-destroy; `syncAssets` xoá publicId vừa gắn lại
  khỏi `media_garbage` (re-attach defuse). **Bổ sung** A-MED-8 (PATCH alt
  set/clear) · A-MED-9 (bulk-delete, USER-owned bị skip không lỗi). A-MED-2
  nhận filter `excludeUserOwned` + trả `alt`. A-DST-5/A-TUR-5/A-PST-7 nhận
  payload `alt?` (round-trip qua form) + có thể tái dùng publicId từ thư viện;
  A-PST-7 riêng có 400 `MEDIA_ROLE_CONFLICT` khi publicId trùng vai trò `body`
  đang giữ. Model: cột mới `MediaAsset.alt` (migration `media_asset_alt`,
  live). Adversarial review (2 vòng, tập trung GC): sửa P2002-500 khi chọn
  ảnh body làm cover (nay 400 sạch) · admin FE bỏ swallow lỗi PUT media (form
  giờ hiện lỗi thật) · form owner không gửi lại alt cũ (tránh ghi đè alt mới
  sửa ở thư viện) · updateAlt 404 đúng chuẩn · bulkDelete trả đúng count tx ·
  picker loại avatar USER · thêm facet SITE. Rủi ro chấp nhận: write-skew
  READ COMMITTED giữa 2 tx song song có thể để lại 1 Cloudinary orphan hiếm
  gặp (chỉ tốn lưu trữ, không lộ dữ liệu); khe hở check→destroy mili-giây của
  reconcile. api 402 · admin 224 · web 232 tests. Xem
  [spec](../06-specs/2026-07-11-admin-media-library-design.md).
- **2026-07-11** — **Admin wave C:** A-BKG-1 nhận `meta.statusCounts` (groupBy
  theo status cho tab badge). A-PST-3/4 nhận `metaTitle`/`metaDescription` +
  `publishedAt` tường minh (ngày tương lai = hẹn giờ đăng, đọc-lúc-truy-vấn
  qua `publishedAt <= now()`, không cron). **Bổ sung** A-SUB-2 (delete
  subscriber) · nhóm `Outbox` mới với A-OUT-1 (delete row, atomic vs drain,
  409 `OUTBOX_ROW_SENT` nếu đã gửi) · nhóm `PaymentEvent` mới với A-PAY-1
  (webhook log viewer, kèm payload thô + booking link suy ra best-effort).
  Không có model mới, chỉ thêm cột `Post.metaTitle`/`metaDescription`
  (migration `post_seo_fields`, live). Adversarial review (2 vòng):
  outbox-delete TOCTOU vs drain (atomic
  `deleteMany`) · schedule-timezone corruption (chuyển conversion sang
  BROWSER-side ISO field) · blank publish-date khi edit = đăng ngay ·
  overshot-page dead-end trên Subscribers/Outbox · SEO field `''` gập `null`.
  api 386 · admin 213 · web 231 tests.
- **2026-07-11** — **Reviews upgrade + Enquiry CRM (wave B2):** A-REV-1 nhận filter
  `source`/`rating`/`search` + join `userName`/`userEmail`/`bookingCode`; **bổ sung**
  A-REV-3 (edit testimonial CURATED, 409 `REVIEW_NOT_CURATED` nếu VERIFIED, `null`
  tường minh xoá field nullable). A-ENQ-1 nhận `repeatCount` (per-trang `groupBy`
  theo email) + `notesCount`; **bổ sung** A-ENQ-3/A-ENQ-4 (thread ghi chú nội bộ
  `EnquiryNote`, append-only, author snapshot). Model mới `EnquiryNote` + index
  `Enquiry.email`. Adversarial review (3 vòng) bắt lỗi coercion boolean ở query
  (`?isApproved=false` bị hiểu thành `true`) → sửa bằng `ToBoolean()` chung cho 5
  query param boolean. Migration RLS-backfill riêng (`cancellation_requests`/
  `post_tags`/`post_tag_links`/`post_tours`) áp cùng đợt. Xem
  [spec](../06-specs/2026-07-11-admin-reviews-crm-design.md).
- **2026-07-05** — **Refund execution + cancellation-request queue:** A-BKG-3 nhận
  `amount` tùy chọn (400 `INVALID_REFUND_AMOUNT`), tách nhánh full (release ghế,
  `REFUNDED`) / partial (giữ ghế, `PARTIALLY_REFUNDED`, `refunded_amount`), gắn
  idempotency key `booking-refund:<id>`, resolve request đang mở về `REFUNDED`; xóa
  note 🕒 partial cũ. **Bổ sung** nhóm `CancellationRequest`: A-CXR-1 (hàng đợi admin,
  mặc định `REQUESTED`) · A-CXR-2 (deny, chuyển trạng thái nguyên tử, booking giữ
  `PAID`). Model mới `CancellationRequest` thay cho hack "Request cancellation" qua
  Enquiry. Xem [spec](../06-specs/2026-07-04-refund-cancellation-queue-design.md).
- **2026-07-05** — **blog-v2 (W1/W3/W5):** A-PST-3/4 nhận `tags[]` (upsert theo slug) +
  `relatedTourSlugs[]` (≤3, replace-all); A-PST-5 mô tả đúng GC media trong `$transaction`;
  **bổ sung** A-PST-6 (tag suggestions) · A-PST-7 (set cover, carve-out `preserveRoles:
  body`) · A-PST-8 (register body image, upsert idempotent) · **A-SUB-1** (list newsletter
  subscribers) · **A-MED-2…5** (thư viện media `/admin/media`: list/delete/garbage/reconcile
  — thiếu từ đợt admin enrichment) · A-MED-1 thêm purpose `DESTINATION_GALLERY`/`POST_COVER`/
  `POST_BODY`.
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
