# Frontend responsive audit

The audit covers all 20 routes in `src/App.tsx`, all three layouts, shared UI,
subscription states, and nested result/admin sections. The application uses plain
CSS and semantic HTML tables; there is no sidebar or separate UI table library
to adapt. Inline sizes in the rendered pages are data-driven progress/chart
percentages. The only video player is in the admin video review page.

## Coverage and changes

| Area | Routes/components | Changes |
| --- | --- | --- |
| Public | Home, About, Contact, Privacy, Terms; header/footer | Shared collapsible navigation, wrapping actions, bounded containers, adaptive feature/contact/report grids, logical list padding |
| Authentication | Login, Signup, Forgot Password, Reset Password, Confirm Email | Removed viewport-height clipping, readable inputs, adaptive card padding, wrapping validation/actions, logical password toggle position |
| Mobile app shell | Protected user/admin routes at phone widths | Dedicated sticky app bar, safe-area bottom navigation, profile bottom sheet, admin drawer sheet, secondary-route back affordance, active route mapping |
| User workspace | Dashboard, Upload, Processing, Analysis | Adaptive summaries, mobile history cards, phone-first upload selection, long filenames, consent and progress rows, sticky enabled actions, advanced detector/evidence/metadata/origin sections, proportional probability bars |
| Admin | Dashboard, Users, Videos, Video Detail, Requests, Logs | Local table/chart scrolling on desktop/tablet, mobile record cards for data-heavy lists, responsive filters and pagination, flexible metrics and key/value rows, accessible request details, constrained media with inline playback |
| Shared | Cards, buttons, fields, labels, badges, alerts, loading/empty/error states | Shrinkable grid/flex children, wrapping text, 44px buttons, 16px form controls, fluid spacing |
| Overlays | Profile, recovery, pause/cancel, subscription/payment | Logical alignment, bounded heights, internal scrolling, dedicated modal footer with visible actions |
| Languages/themes | English, Urdu, Pashto; light/dark | Existing colors retained; logical alignment and extra Arabic-script line height; long mixed-direction content fits |

## Responsive contract

`src/responsive.css` is imported after `App.css`, which retains existing branding
and theme rules. `src/mobile.css` is imported after both files and contains the
phone-only app-style presentation layer. Keep shared responsive rules in
`responsive.css`; keep dedicated phone UI behavior in `mobile.css`.

- Content stays within 1280px; document pages stay within 980px.
- Page gutters scale from 12px to 32px. Panel padding scales from 16px to 24px.
- Auto-fit grids respond to available container width, including tablet widths.
- Desktop/tablet navigation occupies two rows through 1440px and becomes an
  in-flow disclosure at 768px. Protected phone routes use `MobileAppChrome`
  instead, with a compact app bar, bottom navigation, profile sheet, and admin
  sheet. The desktop topbar is hidden only below 768px.
- Detailed workspaces split at 1024px and rebalance at 1280px.
- Authentication stacks below 1024px, prioritizing the form. Desktop forms grow
  with their contents and scroll with the document.
- `ScrollRegion` preserves semantic tables and gives keyboard users access to
  horizontal scrolling. All columns remain available. Charts use the same wrapper.
- `AppModal` accepts a `footer`; put primary/close actions there. Its content body
  scrolls independently. Existing focus trapping, dismissal restrictions and
  pending-action guards remain in place.
- The exhausted upload area is an informational container rather than a disabled
  button, so its Upgrade action remains accessible. Upload/quota guards are unchanged.
- Mobile record lists are rendered beside the existing tables and shown only at
  phone widths. They reuse the same fetched data, links, mutations and pagination;
  there are no duplicated API calls.
- Sticky phone actions are used only where they improve access to the next step.
  The upload action becomes sticky only once it is enabled, so disabled controls
  do not float over content.
- Do not conceal page overflow to mask a layout defect. Fix intrinsic sizing or
  put intentionally wide data in a named scroll region.

## Repeatable verification

```sh
npm ci
npx playwright install chromium
npm run test:responsive
npm run build
npm test -- --maxWorkers=1 --testTimeout=15000 --hookTimeout=15000
npm run lint
```

On Windows PowerShell with script execution disabled, use `npm.cmd` and `npx.cmd`.
The browser suite starts a local Vite server on port 5174 and mocks every API
request. It creates no real accounts, uploads, analyses, payments or admin changes.
Fixtures include long filenames, emails, log references, metadata, populated
tables and report details.

`e2e/responsive.spec.ts` checks every route in all three languages at 320, 360,
375, 390, 414, 480, 600, 768, 820, 1024, 1280, 1366, 1440, 1920 and 2560px,
plus 667×375 and 1024×600 landscape/short layouts. Interaction checks cover
mobile app chrome, admin/profile sheets, language/theme/profile controls, table
scrolling/filtering/pagination, file selection/removal, validation, modal
actions, subscription states, and empty/error data states. `e2e/visual.spec.ts`
saves representative full-page screenshots in `test-results` for visual review,
including phone upload, processing, dashboard, result, admin user, and admin
detail screens. To diagnose a failure with a trace, use
`npm run test:responsive -- --trace on`.

Browser geometry tests use Chromium. They do not replace testing native iOS/
Android keyboards, safe areas, media decoding, or live backend integrations on
physical devices. The existing unit suite checks API/auth/upload/processing
behavior separately.

The repository already has two `react-hooks/set-state-in-effect` lint errors in
`UploadVideoPage.tsx` and `SubscriptionUpgradeModal.tsx`. Their state/reset logic
is outside this presentation audit and is retained.

## Verification results

- All 60 route/language combinations passed the 17-viewport geometry matrix
  (1,020 checks), including populated admin tables and advanced result details.
- All nine interaction/state tests passed, including the new mobile app chrome,
  profile sheet, admin sheet, RTL switching, sticky/dialog, subscription, empty,
  and error-state checks.
- All 11 screenshot checks passed horizontal text-clipping assertions; the
  screenshots were visually reviewed. Dashboard, upload and admin user phone
  screenshots were rerun after the final mobile polish.
- All 24 existing functional tests passed using one worker and a 15-second
  test/hook timeout on the resource-constrained local machine.
- The final TypeScript/production build passed. ESLint reports only the two
  pre-existing errors described above; the build also retains its bundle-size warning.
