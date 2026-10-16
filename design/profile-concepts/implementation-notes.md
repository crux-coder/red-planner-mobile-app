# Profile concepts

The user selected option 1, then requested a design refinement before implementation:
only the top identity section should be a card, containing photo, name, email and
phone. All remaining sections should use unboxed headings and subtle dividers.
The revised concept includes a matching loading skeleton state and a saving-button
indicator. No application code has been changed yet.

The requested implementation remains the full profile with all details and editing
for permitted fields, including proper initial-loading skeletons and operation
loading indicators.

1. Section cards: readable details in stacked groups, with per-section editing.
2. Profile hub: category tiles that open focused detail screens.
3. Tabbed details: personal, employment and documents tabs with an edit sheet.

## Verified existing behavior

The sibling web application is the source for profile fields and permissions.
Its employee endpoint allows self-service updates to title, first/middle/last
name, date of birth, gender, ethnicity, marital status, address lines, town/city,
county, postcode, country, personal email, home/mobile/work phone and extension.
Emergency contacts and clothing sizes have separate editable sections.
Employment, salary, payroll, bank and compliance details are HR-managed.
Employee document and training workflows need separate coverage in the final scope.

The generated images place employee number and/or National Insurance number
inside an editable personal card. The implementation must place these in the
appropriate read-only section. The images are visual concepts, not permission
specifications. All names and values shown are fictional examples.

The current mobile employee API adapter supports HR and form routes, but does not
yet expose employee profile, countries, clothing or emergency-contact endpoints.
Implementation must extend that authenticated adapter while preserving the existing
web handlers' validation and ownership checks. Do not bypass it with privileged
client-side database access.
