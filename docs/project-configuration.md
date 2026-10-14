# ⚙️ Project Configuration

## Running on an iPhone

This project uses Expo SDK 52 and requires a development build on a physical
iPhone; the current Expo Go app does not support this SDK.

1. Run `npm ci` to install JavaScript dependencies.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` and
   `EXPO_PUBLIC_API_KEY` for the intended Supabase project. Use a publishable or
   legacy anon key, never a service-role or secret key. `.env` is gitignored.
3. Sign in to your Apple account in Xcode → Settings → Accounts. The existing
   Xcode project uses team `R5L8RZTV6R`; select your appropriate signing team if
   that team is unavailable.
4. Connect and unlock the iPhone, trust this Mac, and enable Developer Mode under
   Settings → Privacy & Security on the phone.
5. Run `npm run ios:device` and choose your iPhone. This compiles, signs, and
   installs the app, then starts Metro. Accept Local Network access on the phone
   if prompted, and keep it on the same network as the Mac.

For later sessions, run `npm run start:device` and open RedPlanner on the phone.
The development server must remain running while using this development build.

For an EAS cloud build, use
`npx eas-cli@latest build --platform ios --profile development-device`.
This profile targets physical devices; the existing `development` profile still
targets the simulator. EAS device builds require Apple Developer membership,
device registration, signing credentials, and the same environment variables
configured for the build.

## Checks

Run `npm run typecheck`, `npm run lint`, and `npm test`. Format with Prettier.

Native dependency changes require `pod install` inside `ios/` and a new device build.

## iOS scene lifecycle

The checked-in `AppDelegate.mm` includes a single-window scene delegate for iOS 27.
Expo initializes after the scene supplies its window, and cold/warm URL callbacks
are forwarded into React Native. Keep this native customization when regenerating
`ios/`; the scene manifest in `app.json` refers to `RedPlannerSceneDelegate`.
In development builds, cold app links are queued until Expo reopens the last
bundle, so authentication links reach the app instead of stopping at the launcher.
