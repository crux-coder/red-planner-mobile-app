# Employee profile

The Profile tab now uses the approved flat layout: one navy identity card with
photo (initials fallback), name, job title, email and phone; the other sections
use headings and dividers. Existing app header, notifications and navigation are
retained.

## Coverage

- Editable personal information: title, first/middle/last name, date of birth,
  gender, ethnicity and marital status.
- Editable contact details: personal email, home/mobile/work phone and extension.
- Editable home address, including country choices from the backend.
- Add/edit emergency contacts, full address/phone fields and primary-contact status.
- All eight clothing selections, including Not required.
- Read-only employment, department/workplace, salary, payroll, bank details,
  country-specific payroll, identity/right-to-work, leave-policy assignments,
  qualifications and DBS records. Internal HR notes and assessments are excluded.
- Personal document requirements, statuses, uploaded documents, preview links,
  evidence uploads and additional documents.
- Training requirements, records, historical certificates and new certificate
  submissions for HR review. Verification remains an administrator operation.
- HR shortcut for assigned/signed HR documents and leave workflows; account sign-out.

## Loading and edits

Initial loading uses a navy identity skeleton and flat section skeletons matching
personal/contact/address row counts. Secondary resources load independently with
skeletons and retry controls. Pull-to-refresh reloads all profile resources;
foreground refresh retains an open edit draft. Country-dependent editing waits
for country choices. Save buttons show progress and block duplicate submissions;
failed edits retain input. Closing an edited profile form asks whether to discard. The header and handle support swipe-down dismissal with the job brief drawer’s distance/velocity thresholds and spring-back behavior. Unsaved-change confirmation stays visible in the fixed footer, and gestures are disabled during saving.
Inputs validate email and real calendar dates before sending. Mutations still
use the web handlers' authoritative validation and ownership checks.

## Backend companion change

`../red-laser-job-scheduler/app/api/mobile/employee/[...path]/route.ts` now exposes
an explicit `/profile` route family. Employee IDs come from the validated bearer
identity, never from the caller. Existing handlers perform writes, document
ownership checks, training review rules and uploads. Browser cookies are stripped.
The backend must be deployed together with the mobile change. No migrations,
production-data writes or new native dependencies were required.

## Verification

- Mobile TypeScript, ESLint and all 50 unit tests.
- Backend lint, TypeScript check and production build pass.
- Backend gateway tests cover binding profile/contact mutations to the current
  employee, preserving server denials, blocking administrator operations and
  filtering internal fields. Full backend suite: 3,231 tests across 410 files.
- Browser fixture QA at 390×844 and 1024×900: profile loads, skeletons render,
  invalid email is rejected, save progress is shown, saved values refresh,
  unsaved changes can be discarded, and a failed profile load can be retried.
  No page runtime errors. Temporary fixture route removed after testing.
- Browser plugin unavailable; used the installed Playwright browser runtime.
- Live authenticated writes, file uploads and physical-device keyboard/picker
  behavior remain unverified. The browser test used fictional data and intercepted
  requests; it did not update employee records.

## Shared drawer motion

Profile editors and home job briefs use `components/home/use-drawer-motion.ts`
for spring entry/exit, continuous header dragging, velocity/distance dismissal,
and backdrop opacity tied to drawer position. The profile modal uses no native
slide transition. Unsaved drafts spring back before showing the discard prompt.
Browser gesture checks verified held-drag displacement and proportional backdrop
fading, clean dismissal, draft retention, confirmed discard, short-drag return,
and dismissal blocking during a save.

## Profile section menu

The profile landing screen now contains only the navy identity card and five flat
navigation rows. Training & certificates comes first, followed by Documents,
Personal details, Employment & pay, and Clothing sizes. A Sign out button sits below the menu. Each destination
opens at the top with a Back to profile button; Android hardware back also returns
to the menu. The surrounding app navigation remains in place.

All existing fields and editing permissions are retained. Personal details includes
emergency contacts. Employment & pay includes identity/right-to-work, country
payroll and leave entitlement. Qualifications live under Training; DBS checks and
the HR document shortcut live under Documents. Sign-out progress and errors appear beside the button on the main profile.

Training and document resources load only in their destination, with skeletons,
errors and retry actions preserved. Menu loading uses a shorter skeleton. Existing
edit drawers retain saving indicators and unsaved-change confirmation. Returning
to the menu is disabled during a record upload or document-opening operation.

Verification: TypeScript and ESLint pass, and all 50 existing tests pass. Browser
fixture checks at 390×844 verified all six destinations, Training loading, isolated
record sections, read-only managed fields, save progress/payload, discard prompts,
and return navigation with no runtime errors. Temporary fixture route removed.
This change has not been checked on a physical device.

Clothing sizes uses inline selectors that automatically PATCH only the changed
item, including when the other sizes have not yet been selected. There is no Save
button. Selectors show up/down chevrons and are disabled while saving. A failed
save restores the previous selection and displays an error toast; choosing it again
retries. The backend preserves the other sizes, validates permitted keys/values,
and only marks the profile confirmed once every item has a selection. Existing
full-form PUT validation remains unchanged. The menu and section heading use a
clothing icon.

Browser fixture checks verified immediate partial autosave, progress feedback,
failed-save rollback, and retry. The new PATCH endpoint must accompany the mobile
change when deploying; the local backend supports it for device testing.

Clothing feedback uses Sonner Native 0.17.0 (compatible with Expo SDK 52), with
Reanimated 3.16 and Gesture Handler 2.20. The root toaster sits above the bottom
navigation. One toast changes from saving to success/error, with errors visible
for eight seconds. Clothing load errors also use a toast; the Retry action stays
on the page. Selected clothing values and the selected picker option are bold black,
with a checkmark in the option list. The clothing icon sits in the page header;
the form has no duplicate section title or autosave helper text and uses tighter spacing. These native dependencies require a rebuild.
Browser fixtures verified toast transitions, rollback/retry, and selected color.

The clothing page now uses the compact-row concept: eight flat, full-width tap
rows with garment icons, item names, bold selected sizes and up/down chevrons.
Separators appear only between rows. Existing pickers, autosave and Sonner feedback
are reused. Phone-width browser QA confirmed all rows fit above the bottom dock,
selection color, immediate saves, failure rollback and retry. Temporary fixture
removed; typecheck, lint and all 50 mobile tests passed.

## Native profile navigation

Profile now owns a nested React Navigation native stack: menu, training,
documents, personal, work and clothing. Every menu destination is a real screen,
with the existing custom header and bottom app dock preserved. iOS uses the native
left-edge swipe-back gesture (not a custom pan recognizer); Android system back
and the header button use the same stack. Navigation and gestures are blocked
while records or clothing save and while an edit drawer is open. The drawer keeps
its own discard confirmation. The menu refreshes profile data when refocused.

The existing Expo Router native-stack dependencies are now declared directly;
no new native module was introduced. Browser fixtures verified all five section
routes, loading skeletons, permissions, save progress and payload, discard
confirmation, and header back navigation. Physical-device swipe interaction still
needs user verification.

## Inline personal details

Personal details is first in the profile menu. Personal, contact and address fields
are inline: text fields save changed fields on blur, selections save immediately,
and date of birth uses the Expo-compatible native date picker. iOS date selection
opens in the same slide-up page sheet as dropdowns, with Done/Cancel; web uses
a date input inside that sheet. Dismissing or cancelling leaves the saved date unchanged.
Android retains its native date dialog. Dates display as day, month name, and year,
and use local calendar components for YYYY-MM-DD transport without timezone shifts.

Emergency contacts appear as compact cards showing full name, relationship and
mobile phone, with matching card skeletons. Tapping a card or Add emergency contact
opens the shared profile editor drawer, retaining all contact fields and primary
status. Save changes submits the form with Sonner feedback; closing a dirty drawer
asks before discarding changes.
Existing contact writes retain the API's full-contact validation. Save requests
show Sonner loading/success/error feedback; failures preserve drafts with a Retry
action. Navigation is blocked during writes and unsaved drafts have discard
confirmation. Personal loading uses labeled input-shaped skeletons; the menu
skeleton follows the new order. HR-managed fields remain read-only elsewhere.

Verification: typecheck, lint, 51 tests, date tests in UTC-10 and UTC+14, and browser
fixture checks covering blur-only partial writes, date display/selection, invalid
email, failed-save draft retention/retry, new inline contacts, and menu refresh.
The date-picker native build succeeded and was installed on iPhone 17. Native
picker interactions still require on-device testing by the user.

Emergency-contact card/drawer verification: typecheck, lint and 51 tests pass.
Browser fixture verified card summaries, edit and add drawers, discard confirmation,
failed-save draft retention, retry, explicit creation and refreshed cards.

## Compact personal sections

Personal details uses compact label/value rows with hairline separators and fixed
Personal, Contact, Address and Emergency shortcuts. Shortcuts scroll within the
same page, and the active underline follows scrolling, including the last section
when the page reaches its bottom. All existing personal, contact and address fields
remain inline; text saves on blur, selectors save on selection, and dates save on
Done in the date drawer. Loading placeholders follow the compact row geometry.
Emergency-contact cards and add/edit drawers retain their saving indicators,
Sonner feedback and unsaved-change guard.

Browser fixtures verified blur-only partial writes, date selection, validation,
failed-save draft retention/retry, section jumps, menu refresh, and emergency
contact add/edit/discard behavior. Visual checks covered the compact form and
contact cards at a 390px viewport.

## Individual field drawers

Personal-details sections now have soft rounded grouping without section tabs.
Text rows are buttons with subtle chevrons and open an individual-field editor
instead of editing inline. Save changes sends only that field in PATCH /profile;
Cancel, backdrop dismissal and dragging use the existing unsaved-change guard.
Saving and failure feedback retains Sonner and the drawer's busy/error states.
Dropdowns and dates retain their existing selectors, and emergency contacts keep
their full contact editor. Loading dots sit directly below the page header.
Browser verification covered explicit saving, partial writes, failed-save draft
retention, retry, discarding and refreshed profile values.

Drawers now fit their content and are capped by the available viewport; longer
forms and option lists scroll. Select and calendar drawers share the animated
backdrop and draggable rounded sheet. Text editors focus their first field after
the native modal is shown, with keyboard avoidance keeping the sheet above the
keyboard. Browser checks verified autofocus, saving/discard/retry, and the smaller
text/select/date presentations; native keyboard placement needs device testing.
