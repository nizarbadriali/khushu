# Kushu

**A reminder that doesn't stop at reminding.**

Other prayer apps remind you when it's time to pray. Kushu keeps reminding you until you
confirm you've prayed, and can optionally pause distracting apps until you do.

Built for the MTC Hackathon, Track 2: Deen & Dunya.

- Android app (React Native, Expo SDK 58, TypeScript, Expo Router)
- Prayer times calculated on the device with [adhan-js](https://github.com/batoulapps/adhan-js), so they work offline
- All data stays on the device: no accounts, no backend
- Native Kotlin module for app blocking
- See [DEMO.md](./DEMO.md) for the judging walkthrough

## How it works

```
src/core/       Pure TypeScript, no React or native imports. All the rules live here.
  prayerTimes     calculation, windows, cutoffs
  stateMachine    UPCOMING -> ACTIVE_UNCONFIRMED -> CONFIRMED / WINDOW_ENDED_UNCONFIRMED
  reminderPlan    the reminder timeline for one prayer
  blockPlan       when restrictions start and end
  scheduler       diffs desired notifications against pending ones
  demoEngine      runs all of the above on a simulated clock
src/services/   Connects the core to the OS (notifications, location, blocker)
  engine          reconcile(): makes the OS match stored state; safe to run at any time
src/store/      Zustand store, persisted to AsyncStorage
src/app/        Screens (Expo Router)
modules/salahlock-blocker/   Local Expo module (Kotlin) for app blocking
```

**Reminders** are scheduled with the OS, not timers. `reconcile()` runs on launch, on returning to
the foreground, after any setting change and after any confirmation. It diffs what should be
pending against what is pending, using stable IDs, so it cannot create duplicates. It schedules
three days ahead, capped at 200 pending notifications.

**Blocking** uses three Android features, with no root and no Accessibility API:

| Piece | Job |
|---|---|
| Exact alarm | Starts the blocker when a prayer window begins |
| Foreground service + UsageStatsManager | Detects when a selected app opens |
| Overlay (`SYSTEM_ALERT_WINDOW`) | Draws the shield over that app |

The native side keeps its own copy of the plan, so a block starts and expires without JavaScript.
Every failure path unblocks: a window ending, a revoked permission, a crash, or a refused service
start all leave apps usable. The shield always has an Emergency unlock, and the dialer, Settings
and Kushu itself can't be selected.

## Run it

Requirements: Node 22.13+ or 24.3+, JDK 17, Android SDK (platform 37, build-tools 37.0.0,
NDK 27.1.12297006). `ANDROID_HOME` and `JAVA_HOME` must be set. No environment variables are
needed by the app itself.

```bash
npm install
npx expo prebuild --platform android

# Standalone APK, no dev server needed. Install this one for a demo.
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64
adb install -r app/build/outputs/apk/release/app-release.apk

# Or, for development with fast refresh:
npx expo run:android
```

`android/` is generated, so make native changes in `app.json` or `modules/`, not there.

The release APK is signed with the debug key. That is fine for sideloading at a demo, but it can't
go on Google Play.

### On a physical phone

1. On the phone, turn on Developer options and USB debugging.
2. Connect it and accept the prompt. `adb devices` should list it.
3. Install the APK as above.
4. Open Kushu, pick a location and allow notifications.
5. Go to Settings, then Kushu Mode, and grant Usage access and Display over other apps.
6. Select a few apps, turn on Kushu Mode and choose which prayers activate it.

Some manufacturers (Samsung, Xiaomi, Huawei and others) delay background work aggressively. If
reminders arrive late, set Kushu's battery usage to Unrestricted.

## Live preview on Windows (no emulator)

This renders the real app with Expo Web at iPhone size, so you can work on the UI without an Android
SDK. It is a browser view, not an iOS simulator.

```bash
npm run preview     # or the VS Code task "Kushu: Web Preview Server"
```

Then open <http://localhost:8081/iphone-preview.html>. In VS Code, run **Browser: Open Integrated
Browser** from the Command Palette, enter that URL, and drag the tab to the right-hand editor group.

`public/iphone-preview.html` is a development-only frame around the running app. It holds a fixed
393 x 852 viewport, scales down to fit narrow panels, reports bundling errors with the code frame,
and reconnects if the server restarts. Saved changes appear through Fast Refresh.

| Works in the browser | Needs a real device |
| --- | --- |
| Prayer times, countdown, confirmation, history | Scheduled notifications and their action buttons |
| Settings, per-prayer intervals, Demo Mode | Adhan as a notification sound |
| Playing the full Adhan in Settings | App blocking (the browser can only simulate the shield) |
| Yes, I Prayed and Not Yet | Real widgets, Live Activity and Dynamic Island |

The **App**, **Home Screen** and **Lock Screen** buttons above the phone switch views. The Home and
Lock Screen views are labeled simulations: the prayer data is real, and they share the data layer
with the native widgets, but the SwiftUI versions can look different. Tap the island to cycle its
presentations, and tap a widget or the Live Activity to see where a deep link lands.

Notifications are stubbed in `src/services/notifications.web.ts`, and screens label what is
simulated. The Android blocker is not loaded on web.

## Not Yet

"Have you prayed?" has two answers. **Yes, I Prayed** confirms, cancels the remaining reminders,
releases any restriction and updates widgets. **Not Yet** only collapses the prompt until the next
scheduled reminder. It lives in a separate `deferrals` store, apart from prayer records, and
reminders and restrictions are derived from records, so it cannot cancel, reschedule or unlock
anything.

Fajr ends at sunrise: its reminders and restrictions stop there, and the app says so.

## Widgets and Live Activity (iOS)

`src/widgets/index.tsx` holds three Home Screen widgets and the Live Activity, built with
`expo-widgets`. Functions marked `'widget'` run in an isolated runtime, so they take all their data
as props from `src/core/widgetData.ts` and can't import app code. `src/components/os-surfaces.tsx` is
a separate React Native approximation used for previews. It is not what appears on the phone.

- **Widgets** get a timeline covering about three days, with an entry at every prayer, cutoff and
  midnight, so they advance with the app closed. Countdowns are drawn by the system. If the app
  isn't opened before the timeline runs out, they ask you to open Kushu rather than show old data.
- **The Live Activity** counts down to the next prayer on the Lock Screen and Dynamic Island.

### Live Activity limits

These come from iOS, and Kushu has no server by design:

- It can only be started or changed while the app is running. When a prayer begins with the app
  closed, it can't move on to the next prayer. It changes to "It's time for Asr" by itself, and
  moves on when you next open Kushu. The normal prayer notification is unaffected.
- iOS ends Live Activities after about 8 hours, so a long gap such as Isha to Fajr can outlast it.
- If you dismiss it, it stays away until the next prayer.
- People can turn Live Activities off in iOS Settings. Settings > Widgets & Live Activity shows this.

Moving automatically between prayers would need push notifications from a server.

### Building for iPhone

This needs an Apple Developer account and an EAS login. It can't be done from Windows without EAS.

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile development
```

The iOS bundle ID is `com.kushu.app` and the App Group is `group.com.kushu.app`.

## Android countdown

`modules/kushu-countdown` posts a quiet ongoing notification whose countdown is drawn by Android's
chronometer, so no JavaScript runs while it ticks. An inexact alarm moves it to the next prayer.
`expo-widgets` doesn't expose a chronometer, which is why this is a small separate module.

Android Home Screen widgets are not enabled. `expo-widgets` supports them, but without timelines or
system-drawn countdowns, so they could only change when the app runs. `expo-widgets` and `@expo/ui`
are excluded from Android autolinking and only imported by `surfaces.ios.ts`. To add Android
widgets, remove that exclusion and set `enableAndroid` in `app.json`.

## Checks

```bash
npm test            # core logic, including acceptance tests A to F
npm run typecheck
npx eslint src modules --ext .ts,.tsx
npx expo-doctor
```

## Known limitations

- **Android only.** iOS would need a Mac or EAS cloud builds, an Apple Developer account and
  Apple's Family Controls entitlement, so the blocker is Android-only and shows an explanation on
  other platforms.
- **The shield is an accountability tool, not a hard lock.** It is an overlay rather than an OS
  restriction. Someone can get past it with Emergency unlock, by revoking a permission, or by
  force-stopping or uninstalling Kushu. That is deliberate: the app must never trap anyone.
- **Detection takes up to about a second.** A selected app can show briefly before the shield
  appears.
- **Reminders stop after about three days** if the app is never opened, because the schedule is
  only extended when it runs.
- **Delivery timing is up to the OS.** Doze and manufacturer battery savers can delay reminders.
  The app warns if exact alarms are off.
- **Adhan audio.** Notifications play a 17 second clip at most, and silent mode or Do Not Disturb
  can mute it. The full Adhan only plays when started inside the app.
- **Changing the start sound** uses a different Android notification channel, because channel
  sounds are fixed once created. Users can also override channels in system settings.
- **"Yes, I Prayed" on a notification opens the app** to complete the confirmation, because
  background JavaScript isn't dependable.
- **Prayer times display in the device's time zone**, so a manual city in another zone shows that
  city's prayer moments in your local time.
- **The Hijri date is tabular** and can differ by a day from local moon-sighting.
- **Google Play.** `USE_EXACT_ALARM`, `PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW` and the
  `specialUse` foreground service all need Play Console declarations and review, and approval
  isn't guaranteed. `SCHEDULE_EXACT_ALARM` is the fallback if `USE_EXACT_ALARM` is refused.
- **Confirmation is self-reported.** Kushu can't know whether anyone prayed, and never claims
  to. Reminder cutoffs are app settings, not religious rulings.

## Credits

- Adhan recording: ["Beautiful adhan"](https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg)
  by Adam-synagda, Wikimedia Commons, CC0. Re-encoded, and trimmed for the notification clip.
- Chime: synthesized for this project.
- Fonts: Fraunces and Inter, SIL Open Font License.
