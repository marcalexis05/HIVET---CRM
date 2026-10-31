# Hi-Vet QA revision report

Updated October 31, 2026. Changes are implemented in the existing source files for this QA revision batch.

## Completed changes

- Guest product details remain viewable; cart actions require login or signup using the requested message. Existing cart functionality is reused. Guest hearts are hidden; store buttons use cart icons.
- Customer settings use deactivation instead of permanent deletion and preserve orders, reservations and related records. Profile-photo changes are disabled while its display remains.
- Desktop customer Account menu contains profile, support and logout. Mobile uses the customer avatar, first/last name and fetched loyalty level instead of the logo/dropdown, per the later request. More panel attaches to the bottom navigation.
- Appointment statistics open the existing history with the matching filter. Add Pet has a styled pet-type selector.
- Logout revokes the server session, clears local authentication and returns to the landing page. Role-specific sign-in endpoints reject credentials belonging to another portal; protected API access checks session and account status.
- Clinic/rider rejection labels read Rejected. Customer filters support apply and clear. Admin account actions deactivate rather than permanently delete.
- Registration and login links were moved below the requested primary/Google buttons. Rider Log In Instead sits directly below Next. First-name person icons were removed from customer, clinic and rider registration.
- Manual registration names allow Unicode letters and spaces only, following the user's latest instruction. Invalid characters are blocked in the inputs and rejected by backend validation. Earlier permission for hyphens/apostrophes was superseded by the latest request.
- Catalog weight, numeric fields and nested variant/branch inventory values are validated without changing legitimate text fields. Branch/search/Add Product controls wrap without overlapping. Rider earnings card spacing is compacted without changing balances or calculations.
- Order/reservation creation queues customer SMS after successful saves. SMS failures do not roll back transactions. Provider sends were mocked in tests.
- Footer help panels stay white and use a transparent overlay. Existing PWA bottom-panel behavior remains. Public navbar install entry was removed while footer installation remains.
- Public navbar links are centered. Clinic/rider logo clicks on their hero return to the main landing page; clicks from lower sections return to the top of the same role landing page. Mobile menu attachment and scrolled navbar blur remain.
- Shared sidebar account card and category item-count captions were removed as requested.
- Address picker region list has a bounded scroll area; details use full-width fields on mobile, readable labels and a fixed action area. Selection and address-save logic are unchanged.
- Tracking button height matches the order-status selector. The extra padding around the selector was removed. Pickup summary card uses existing filtered orders and follows the current card style, with four desktop columns and responsive stacking.
- Order labels use HV-year-lastFourDigits across customer, clinic and rider responses, receipts, SMS and new notifications. Existing four-part labels in notification text are shortened on read. Existing orders derive their label from their existing creation timestamp, preserving the original four-digit ending. Numeric order keys, product serials, pickup verification and relations are unchanged. No order migration or rekeying is required.
- The corrupted separator on customer reservation details is replaced with the Unicode bullet: Cat • Golden Siamese.

## Validation performed

- Backend: 37 automated tests pass using isolated SQLite databases and mocked external services. Tests include portal-role combinations, rejected-login session behavior, server-side logout, expired/tampered sessions, deactivation preserving a shipped order and reservation, name/catalog validation, and SMS save/failure paths.
- A seeded existing order with internal ID 182 is checked through the actual customer, clinic, rider available-order and rider archive APIs. All return the same compact label with suffix 1183; numeric ID and pickup serial remain unchanged.
- Frontend: 16 tests pass, including compact legacy references, shared customer/rider formatting and search, name rules, compliance display and existing PWA URL/viewport configuration.
- Production TypeScript/Vite build passes. Existing warnings about old Browserslist data and bundle size remain.
- Earlier browser checks with isolated test data covered guest-cart gating, customer account header/loyalty, attached More menu, appointment filters, admin customer filters, signup-link placement, catalog weight validation, responsive catalog controls, centered navigation, role-landing logo behavior, white help panel, region list scrolling and mobile address form at 390px and 320px. Region list scrollTop changed from 0 to approximately 325; details body scrollTop reached approximately 401 with its action visible.
- Browser use was subsequently disabled in Work settings. The final Pickup card, order-control alignment, compact order IDs and bullet correction therefore have build/source/automated checks but no final live visual verification. An earlier order-control screenshot still showed stale markup and must not be used as proof of the final change.
- git diff --check passes. No live payment, real SMS, Google OAuth login, installed Android PWA or financial payout was performed in testing.

## Deployment and remaining limitations

Deploy frontend and backend together and restart the API so the new order_reference fields are available. Refresh existing clients after deployment.

Role/session enforcement requires the additive auth_sessions and account_access_locks tables in backend/migrations/20261031_auth_sessions.sql. Application startup also creates these tables through SQLAlchemy. Existing accounts and transaction tables are not replaced. Tokens issued before server session tracking require one new login.

Short four-digit display references are labels, not unique database keys; internal numeric IDs continue to identify actions and records. Existing orders keep their creation year.

Google Maps billing was unavailable in the isolated browser preview, so map-provider behavior and final Google location saving were not verified. Native Android status/navigation-bar transparency and both install methods require physical-device verification; no PWA-only code can be claimed to override Chrome's system-bar restrictions from these checks.

Payment-flow inspection found pre-existing issues: checkout sends cash while COD accounting checks cod; rider payout is simulated; no automatic clinic/rider split settlement or remittance-completion endpoint was found. Hosted payment confirmation does not itself independently fetch provider payment success. These financial flows were documented, not modified by the diagram request. See the separate delivery-payment-flow files.

Changes target the requested behaviors. Unrelated functionality was not intentionally removed or redesigned, but the checks above are not an exhaustive production regression certification.

## Delivery proof and notification follow-up

- Assigned riders must upload a real JPG, PNG or WebP image after verified pickup and before completion. The server checks image bytes, size (8 MB maximum), dimensions (at least 200 pixels per side, at most 20 megapixels), assignment and delivery/order state. Images are re-encoded as JPEG, with metadata removed and orientation preserved.
- Completion through either rider status endpoint is blocked without a valid stored image. Clinic status updates cannot bypass the rider completion flow for delivery orders. Repeated completion does not duplicate rider wallet credits or notifications; completed deliveries cannot be reopened by the rider. Existing historical completed orders are preserved.
- The existing proof_of_delivery_url column is reused. No new delivery schema migration is needed. Photos are stored outside the public uploads mount and served only through an authenticated, ownership-checked API. Customer and clinic details can display/enlarge the same photo. Completion adds a notification for each party in the same database transaction.
- The photo records evidence supplied by a rider. It is not automated verification of who appears in a photo or whether a delivery was truthful.
- Notification X actions remove immediately, normalize IDs, prevent stale polls from restoring dismissed items and restore items if saving fails. Header and dedicated notification screens synchronize after changes. Mark all as read checks the actual server result. Remove all is available in the notification panel. Its static backend route now precedes the dynamic notification-ID route.
- Failed requests show a readable connection/server error. Requests have a 15-second timeout instead of hanging indefinitely. Busy action buttons prevent repeated bulk requests.
- Four backend integration tests cover missing/fake/oversized images, wrong uploader, customer/clinic access and unrelated-account denial, successful upload/completion, frozen evidence after completion, idempotent wallet credit, notifications for both parties and persisted notification read/delete/clear behavior. Two frontend tests cover configured API URLs/methods, synchronization events and failed-request handling.
- The previously unresponsive local development API was restarted using its existing python main.py entry point. The live API then returned 200 for its OpenAPI document and notification DELETE CORS preflight, and 401 for an unauthenticated proof request. No live customer notifications were deleted and no live order was completed during verification. The API was observed to take about three seconds under current polling load.
- Browser use remains disabled in Work settings. These latest UI additions have build and API test coverage, but their final on-device appearance and camera/file-picker behavior have not been visually verified.

Deployment: deploy the new backend helper, frontend component and modified files together. Keep backend/private_delivery_proofs on persistent storage, or set HIVET_DELIVERY_PROOF_DIR to a private persistent directory. A host with an ephemeral filesystem will otherwise lose evidence on restart; this task does not provision a hosting disk. The private evidence folder and runtime logs are excluded from the source bundle.

## Pickup masking and direct camera follow-up

- Rider active-order API responses now mask every digit in package serials, including per-item and primary serial fields. Task acceptance no longer sends the pickup PIN to the rider. Clinic order details retain the full values. The rider UI also masks older API responses defensively.
- The pickup prompt instructs the rider to ask the clinic for the full package serial. The server rejects masked/incorrect values; for orders containing product serials it no longer accepts a separate legacy PIN instead. The PIN fallback remains for legacy deliveries with no item serial available.
- Mark as delivered already required an uploaded server photo; it now also has a clear grey disabled appearance. It stays disabled while uploading/completing. A native mobile camera capture input powers a separate Take photo action; Upload photo remains available for a stored image. Desktop camera-capture behavior depends on the browser and may fall back to a file picker.
- An additional backend integration test verifies that rider responses never disclose full serial/PIN values, clinic responses retain them, masked/incorrect/PIN-only submissions fail, and the correct clinic serial permits pickup. A frontend test verifies defensive masking of older responses. Camera launching still requires physical-device verification.

## Customer receipt, points and refund evidence follow-up

- Delivered/completed orders now have an Order received customer action. A separate customer_order_receipts ledger records confirmation without replacing the order's delivery status. The Order received filter uses that persistent confirmation state, includes a count and retains the existing search, fulfillment filters and pagination.
- Product reward points are no longer automatically credited by rider delivery completion or clinic order completion. The owning customer receives eligible product points after confirming receipt. Product point snapshots are used when positive, with the existing catalog fallback preserved, multiplied by item quantity. Products without points do not generate rewards. Appointment/service rewards are untouched.
- Order and customer rows are locked during receipt confirmation, and the receipt table has a primary key on order_id. Repeated confirmation returns successfully without adding points again. Existing reward history for older orders is checked before any new credit; balances and previously awarded points are not reset. Confirmation is blocked before delivery and while a return/refund is pending, approved or refunded.
- Refund requests remain available before customer receipt confirmation, avoiding a requirement to accept damaged goods to report them. A reason of 10–1000 characters containing letters and one to four different supply photos are required on both client and server.
- Refund photo uploads now include authentication and the order ID. The server verifies order ownership, delivered/completed status, real image bytes, size and dimensions. New evidence is privately stored and bound to its customer/order; arbitrary URLs and photos from another order are rejected. Owning customers and clinics can view it through authenticated APIs. Existing historical public evidence links remain displayable without exposing authentication tokens to those hosts.
- Photo enlargement uses an in-page native dialog. A replaced rider photo reloads its preview. New order confirmations refresh the mobile loyalty-tier label.
- Five additional backend integration tests cover delivery-only reward gating, one-time quantity-based awards, zero-point supplies, existing historical awards, customer ownership, refund-state blocking, pickup completion waiting for customer receipt, invalid reasons/images, private evidence access, cross-order photo rejection and duplicate refund submission. Total: 37 backend and 16 frontend tests pass; production build passes.
- Additive migration: backend/migrations/20261031_customer_order_receipts.sql. Application startup also creates the new receipt table through the existing SQLAlchemy setup. No existing order rows, statuses, reward balances or transaction records are removed or rewritten. For production, deploy the backend and frontend together and ensure the new table exists.
- No real customer receipt confirmation, points award or refund request was submitted during testing. Test data and images used isolated SQLite databases and temporary folders. Final browser/device verification remains unavailable because browser access is disabled.

API responsiveness: JWT/session verification in the HTTP middleware now runs in the existing worker pool rather than blocking the event loop on synchronous database I/O. Protected handlers reuse the already validated identity within that same request; tokens are still checked afresh on every new request. Role, revocation, expiry and account-status checks remain unchanged. All 37 backend tests, including the existing pet and role/session suites, pass. Receipt lookups on the customer order list are batched in one query.

Local startup verification: the API was blocked by an old unconditional ALTER TABLE rider_profiles ALTER COLUMN customer_id DROP NOT NULL, even though that column was already nullable. The startup migration now checks column nullability before running that statement; the equivalent return-request legacy checks also skip already-applied changes. The redundant blocked startup operation was cancelled after verifying the target state was already correct. No customer order, reward balance or existing account transaction was deleted or rewritten. The development backend then returned HTTP 200 immediately and its live API definition includes both receipt confirmation and private refund-evidence routes.

## Store, delivery actions, session recovery and test API configuration follow-up

- Legacy products with a NULL is_archived flag now remain visible; explicitly archived products remain hidden. Public and clinic catalog queries share this narrow fix. The live customer catalog returns HTTP 200 with 31 products, compared with 22 previously. Failed catalog requests now show a retryable error instead of a false empty result.
- The older Sustainable Insect Protein order retains its purchased-name snapshot. Current catalog product 9 has been renamed Reflective Outdoor Harness (Medium), under Dogs / Accessories. Current catalog data was not renamed to match an old order.
- Some historical orders have no saved order_items rows. Their cards now display Item details unavailable with a package placeholder rather than a broken image. Actual missing products cannot be reconstructed from the available data; no item records were invented.
- Customer receipt confirmation and new refund requests/photo uploads are blocked after 72 hours from delivered_at. Old completed orders without a saved completion timestamp use their original creation timestamp. Exact deadline boundaries are enforced by the backend, and the customer interface refreshes its deadline state. Newly completed clinic pickups now record delivered_at. Existing submitted refund processing and previously awarded points are preserved.
- Saved-session verification has a 10-second timeout and cancels on navigation. A server rejection clears the session; a temporary connection problem retains the existing saved offline view without an endless restoration spinner. The connection warning popup was removed as requested. Protected APIs still require server authorization.
- Riders confirm before accepting, cancelling or undoing pickup. Original API calls run only after confirmation, and repeated clicks are guarded. The delivery details panel is hidden while confirmation is open to avoid competing focus traps.
- Available rider cards show only the saved shipping fee; the redundant Your pay field was removed at the user's request. Delivery details retain the separate order total, shipping fee and saved delivery payment, including valid zero fees. Earnings and payout calculations were not modified.
- With explicit user permission, PULSO browser Maps key/map ID, backend Maps key and Gemini key were copied into Hi-Vet frontend/.env and backend/.env for local testing only. No PULSO files or Google Cloud restrictions were changed; frontend/.env.production was not changed. Keys are excluded from this report and source ZIP. Backend geocoding returned HTTP 200 / OK. Gemini model access returned HTTP 200, but a generation attempt timed out and a retry returned HTTP 503 UNAVAILABLE; successful AI generation is not yet verified. Local browser use is disabled, so browser Maps restrictions and map rendering could not be checked.
- Verification: 37 backend tests, 16 frontend tests, TypeScript/Vite production build and source whitespace checks pass. API readiness and live public catalog checks return HTTP 200. Tests include exact 72-hour expiry, rejection of expired receipt/refund/photo actions, legacy unarchived product visibility, distinct order/shipping/rider fee fields and valid zero rider fees, plus stalled/cancelled session restoration. No live order completion, refund, points award, payment or real SMS was submitted.

## Rider map and Street View follow-up

- Rider map shows one clinic pickup marker and one customer drop-off marker, with numbered white labels. Initial bounds include both addresses; displaying directions preserves that overview. Invalid or missing coordinates are not rendered as bogus pins.
- Street View opens at the selected stop and faces its address pin. Classic marker overlays are created only while the panorama is visible and removed when leaving it, preventing duplicate pins/labels on the regular map. Route renderers and stale route responses are cleaned up when changed or unmounted.
- Clinic and Drop-off buttons remain available inside Street View and switch directly between the two addresses. Back to map exits the panorama. Extra Google navigation, fullscreen, motion, address and zoom controls are disabled through supported options; Google attribution remains visible. Pegman and zoom buttons are also hidden on the regular map, with touch gestures preserved.
- Travel distance/time uses a compact white box at the top-left of the map, with its route-close action retained. The rider Contact action and its now-unused duplicate communications dialogs were removed; the cancellation/undo action fills its row. Existing phone information in delivery details and address popups remains.
- Clinic/customer address popups are compact and retain address, phone, Directions and close actions. The GPS Connected badge is removed. Both map pin captions explicitly use white text. Street View pins are enlarged to 64 by 80 pixels with a thicker white outline, larger bold white labels and bordered orange captions. Opening a stop uses a wide panorama facing that address, tilted slightly toward its ground pin. Regular-map keyboard shortcuts are disabled through the supported option; required Google attribution and legal links remain visible.
- TypeScript/Vite build, existing 16 frontend tests and source whitespace checks pass. Browser interaction remains disabled in Work settings, so final Street View imagery, coverage, pin placement and mobile touch behavior need live verification. Street View availability depends on provider coverage at each saved address. No delivery status, saved coordinates or API settings were changed for this map work.

## Checkout pickup branch follow-up

- Checkout uses one targeted /api/checkout/pickup-branches request for its product IDs instead of serial full-directory and product requests. The endpoint returns real seller/branch details in three batched reads, omits archived products, validates IDs, and does not change clinic approvals or expose account credentials. Existing public product details already expose these seller branches. An older-backend fallback remains for rolling deployments.
- Address loading is separate from branch loading. Branch loading, failure/retry and genuinely empty states are visible. Branch cards show both clinic and branch names with full addresses, avoid duplicate branch IDs, preserve selected IDs in the order payload, and clear a selection that no longer belongs to the checkout seller.
- The local API also experienced connection-pool timeouts and blocking dashboard polls. Ten read-only handlers for catalog/products, clinics, customer orders, notifications and the rider home/order polling path now run in FastAPI's worker pool. Their queries, responses and authorization are unchanged. The available-tasks alias awaits the worker call. Reference: https://fastapi.tiangolo.com/async/ . The development API was restarted with python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload, avoiding duplicate application imports from python main.py.
- Live verification after restart: /api/checkout/pickup-branches?product_ids=2 returned HTTP 200 in 6.89 seconds with Hi-Vet Main Hospital Branch (1), Main Branch (3), and Hi-Vet (11). The local API completed startup successfully.
- Verification: all 38 backend tests, 22 frontend tests, the TypeScript/Vite build and source whitespace checks pass. Tests cover scoped batched branch results, invalid IDs, archived products, approval preservation, cart and resumed-order handling, older-server fallback and the single-request path. Earlier read-only inspection confirmed product 1 belongs to clinic 1 and its product data contains three real branches omitted from the approved-clinic directory. No live purchase was submitted. This follow-up requires both frontend and backend deployment to appear on Vercel/Render.

## Modified source files

- `.gitignore`
- `backend/auth_sessions.py`
- `backend/delivery_proofs.py`
- `backend/input_validation.py`
- `backend/main.py`
- `backend/migrations/20261031_auth_sessions.sql`
- `backend/migrations/20261031_customer_order_receipts.sql`
- `backend/order_actions.py`
- `backend/order_references.py`
- `backend/refund_evidence.py`
- `backend/sms_service.py`
- `backend/sms_templates.py`
- `backend/test_pet_profiles.py`
- `backend/test_qa_revisions.py`
- `frontend/src/App.tsx`
- `frontend/src/components/AddPetDialog.tsx`
- `frontend/src/components/AvailableDeliveryDetailsModal.tsx`
- `frontend/src/components/BusinessOrderDetailsModal.tsx`
- `frontend/src/components/CatalogPreview.tsx`
- `frontend/src/components/DashboardLayout.tsx`
- `frontend/src/components/DeliveryProof.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/components/MapPickerModal.tsx`
- `frontend/src/components/NotificationBell.tsx`
- `frontend/src/components/ProductCard.tsx`
- `frontend/src/constants/riderWording.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/context/CartContext.tsx`
- `frontend/src/pages/BusinessLogin.tsx`
- `frontend/src/pages/BusinessRegister.tsx`
- `frontend/src/pages/Catalog.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/RiderLogin.tsx`
- `frontend/src/pages/RiderRegister.tsx`
- `frontend/src/pages/dashboard/AccountSettings.tsx`
- `frontend/src/pages/dashboard/AdminClinicCompliance.tsx`
- `frontend/src/pages/dashboard/AdminCustomerRecords.tsx`
- `frontend/src/pages/dashboard/AdminCustomers.tsx`
- `frontend/src/pages/dashboard/AdminRiderCompliance.tsx`
- `frontend/src/pages/dashboard/AdminRiders.tsx`
- `frontend/src/pages/dashboard/BusinessCatalog.tsx`
- `frontend/src/pages/dashboard/BusinessOrders.tsx`
- `frontend/src/pages/dashboard/BusinessProductEditor.tsx`
- `frontend/src/pages/dashboard/Checkout.tsx`
- `frontend/src/pages/dashboard/CustomerAlerts.tsx`
- `frontend/src/pages/dashboard/CustomerCatalog.tsx`
- `frontend/src/pages/dashboard/CustomerDashboard.tsx`
- `frontend/src/pages/dashboard/CustomerOrdersList.tsx`
- `frontend/src/pages/dashboard/CustomerReservations.tsx`
- `frontend/src/pages/dashboard/ProductDetail.tsx`
- `frontend/src/pages/dashboard/ReservationCheckout.tsx`
- `frontend/src/pages/dashboard/RiderAlerts.tsx`
- `frontend/src/pages/dashboard/RiderDashboard.tsx`
- `frontend/src/pages/dashboard/RiderEarnings.tsx`
- `frontend/src/pwa.css`
- `frontend/src/utils/nameValidation.ts`
- `frontend/src/utils/notifications.ts`
- `frontend/src/utils/sessionCheck.ts`
- `frontend/src/utils/textFormatters.ts`
- `frontend/tests/nameValidation.test.mjs`
- `frontend/tests/notifications.test.mjs`
- `frontend/tests/orderReferences.test.mjs`
- `frontend/tests/sessionCheck.test.mjs`
- `frontend/src/components/RiderMapControls.tsx`
- `frontend/src/utils/checkoutBranches.ts`
- `frontend/tests/checkoutBranches.test.mjs`
