# RedPlanner

Minimal Expo / React Native app for redevelopment: email/password login, magic links, Microsoft sign-in, password recovery, and an authenticated native home screen matching the main repo’s `/mobile` design. Supabase manages authentication and persisted sessions. The home screen reads the signed-in employee’s assigned jobs from Supabase using the existing session and row-level security. It displays the current London business week, crew, equipment, site information, and job briefs. Pull to refresh or reopen the app to reload. HR, notifications, directions launch, and phone calls are not connected. Equipment checks remain local; sign out is under More. No database changes, web-app links, or uploads are added.

## Run

1. `npm ci`
2. Copy `.env.example` to `.env` and supply your Supabase URL and publishable key.
3. `npm run ios:device` to build and install on an iPhone.
4. `npm run start:device` for subsequent development sessions.

See [iPhone setup](docs/project-configuration.md) for signing and device requirements.

## Structure

- `app/`: root navigation, login, and home.
- `context/auth.tsx`: session restoration, auth events, and refresh lifecycle.
- `config/supabase.ts`: Supabase client configuration.
- `components/ui.tsx`: shared native controls and light/dark colors.
- `ios/`, `android/`: native projects. Reinstall CocoaPods after changing native dependencies.

Use `npm run typecheck`, `npm run lint`, and `npm test` (Node 22.18+) to check changes. Styling uses React Native StyleSheet; npm is the package manager and `package-lock.json` is the lockfile.

## Authentication callbacks

Add `red-planner://auth/callback` to Supabase Authentication → URL Configuration → Redirect URLs for each environment. Enable the Azure provider with the Microsoft application credentials to use Microsoft login. The current staging project has Azure disabled; production is configured separately.

Magic links only sign in existing users. Open the link on the same device that requested it, since the PKCE verifier is stored locally. Password recovery uses the same callback.

Use `supabase/templates/magic_link.html` and `supabase/templates/recovery.html` in the project's Supabase Auth email templates. Both web and mobile emails first open the web `/auth/confirm` page, which must never verify tokens on GET. After the user submits the confirmation form, the web app sends mobile requests to Supabase's verification endpoint with the exact `red-planner://auth/callback` redirect. The iPhone exchanges the returned PKCE code using its stored verifier. Deploy the web app's mobile confirmation handler before applying these templates to hosted Supabase. Request a new email after saving, since previously sent links do not change.

The native callback uses PKCE with secure random values and SHA-256 via Expo Crypto. Native auth browser sessions use Expo WebBrowser. The exact web logo is bundled as SVG source and rendered with React Native SVG.

## Pending actions

`EXPO_PUBLIC_WEB_API_ORIGIN=https://stage.codepeaktrail.dev` selects the main app's staging API (the same Supabase environment as this build). Restart Metro after changing it. The home screen requests `GET /api/mobile/action-required` with the current Supabase access token. The backend validates that token and reuses the existing document, form, and risk-assessment loaders; it returns only pending-action summaries. Each category can fail independently without hiding successful results. Pull to refresh and returning to the app reload both the schedule and pending actions.

The native Action required section matches the `/mobile` reference. Selecting a row shows its summary locally; completing or signing documents/forms/risk assessments in the mobile app is not implemented yet. No web links are opened. Deploy the main-repo endpoint before testing against staging; an unavailable endpoint is shown as an error with Retry, never as an empty list.
