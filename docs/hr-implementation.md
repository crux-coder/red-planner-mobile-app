# Employee HR in the mobile app

Scope: employee `user` accounts only. No manager or administrator screens or
operations are exposed. The approved concepts are adapted to the existing app
header, navigation, typography, icons and refresh control.

## Workflow coverage

| Web workflow | Mobile implementation |
| --- | --- |
| Current leave balance and leave year | HR overview; entitlement, used/booked, pending, carry-over, absence totals |
| Request absence | All four web absence types, full/half days, dates, notes; server calculates units and checks entitlement, holidays, employment dates and overlaps |
| Pending requests | Edit and delete own requests, with confirmation |
| Approved requests | Request cancellation; show pending/approved/declined cancellation and notes; retry declined cancellation |
| Absence history | Year and status filters, decisions, resolver, notes, public holidays |
| Calendar | Month navigation, selected-day absences and public holidays |
| Assigned HR documents | Pack progress, due dates, messages, overdue status, document selection |
| Review and respond | PDF opens in the system browser; existing external-file review qualification; monitoring disclosure before opening |
| Document outcomes | Acknowledge, accept, decline, accept under protest, reasons, declarations, read receipts, working-time choices |
| Signatures | Typed and drawn PNG signatures; honours typed-only policy |
| Contractual variations | Terms, changes, impact, contact route, query window |
| Deferred/withdrawn packs | Status, reason and follow-up date; no completion controls |
| Completed documents | Searchable history, versions, evidence record, signed PDF, declaration and outcome |
| Working-time opt-out | Current state, withdrawal notice with exact web wording, effective date; subsequent voluntary opt-out |
| Employee forms | Assigned/history/available forms, pagination, search, reviewer selection, idempotent start |
| Form completion | All ten web block types, sections, declarations, choices/checklists, dates, informational files, uploads, immutable submitted responses and review outcome |
| Home action-required items | Document and form items open the corresponding HR workflow |

## Backend companion change

The sibling `red-laser-job-scheduler` repository contains the approved
`/api/mobile/employee/[...path]` adapter. Deploy it alongside the mobile release.
It validates the bearer token with Supabase Auth, requires the `user` role and a
linked employee, and exposes an explicit self-service route/method allowlist.
Employee-filtered reads are forced to the authenticated employee. Existing web
handlers retain record ownership, validation, notifications, audit evidence and
storage behavior. Browser cookies are not accepted as fallback credentials.
A request-scoped AsyncLocalStorage client lets those handlers use the validated
mobile identity without changing ordinary browser authentication.

No schema migrations or production-data changes were made.

`EXPO_PUBLIC_WEB_API_ORIGIN` must point to this backend. The mobile app uses HTTPS
in release builds and permits private-network HTTP in development only. Responses
are not persisted on the device; screens refresh on foreground and after writes.

## Native dependency

`expo-document-picker` 13.0.3 supports employee form attachments. iOS pods have
been installed. Rebuild the development client or release app before testing
attachments on a device. The picker loads only when requested, so other HR
screens remain usable in an older development client.

## Validation

- Mobile: TypeScript and ESLint pass; all 44 tests pass, including HR transport and workflow tests.
- Backend: employee gateway tests cover token validation, role/link checks,
  ownership scoping, cookie isolation, route/method restrictions and concurrent
  request isolation; all 3,224 tests in 410 files pass. Backend lint and the production build pass. The local endpoint returns 401 for an anonymous request.
- Browser QA: local fixture responses exercised overview, request form, calendar
  date selection, history, document disclosure and signature mode selection.
  Screenshots are in `design/hr-concepts/implemented/`. Fixtures are not live HR
  records. The temporary preview route is removed after testing.
- Live authenticated submissions and physical-device behavior still require
  verification with a test employee account and a rebuilt app.
