# Kushu demo script (about 90 seconds)

This script is for the Android app. The browser preview (see the README) can show the flow, but its
notifications and shield are simulated, so don't present it as real blocking.

## Before you present

1. Install the release APK. It needs no laptop or dev server.
2. Open Kushu and pick a location.
3. In **Settings > Kushu Mode**, grant both permissions and select an app you can open quickly
   (YouTube or Chrome work well).
4. Leave that app installed and easy to reach on the home screen.
5. Turn the phone's sound on, and allow notifications.
6. Do one full practice run, then press **Reset demo**.

If the permissions or selected apps are missing, Demo Mode says so and falls back to a shield
preview labelled **SIMULATED**. Set it up beforehand so you can show the real thing.

## The pitch (15 seconds)

> You're in class, the prayer notification comes in, and you swipe it away meaning to pray later.
> Then you open Instagram, and it's gone. Every prayer app stops at that notification.
> Kushu doesn't stop until you say you've prayed.

## The walkthrough

| # | Do this | Say this |
|---|---|---|
| 1 | Show the Home screen | "These are today's real prayer times for this location, calculated on the phone. They work offline." |
| 2 | Tap **Try Demo Mode** | "So you don't have to wait for Asr, this runs the app's real logic on a simulated clock. It can't touch my real records." |
| 3 | Tap **Simulate Asr starting** | "Asr starts, and a real notification arrives." |
| 4 | Switch the interval from **30 min** to **10 min** | "Every prayer has its own reminder interval. Watch the pending count change." |
| 5 | Tap **Skip ahead** | "Ten minutes later it asks again, and it keeps asking until the window closes." |
| 6 | Tap **Restrict selected apps**, press Home, open the selected app | "Here's the difference. This isn't a mockup. The app is actually blocked on this phone." |
| 7 | Tap **Open Kushu** on the shield | "The only way forward is back to Kushu." |
| 8 | Press **YES, I PRAYED** | "One tap. Reminders are cancelled and the restriction lifts." |
| 9 | Open the selected app again | "Unlocked." |
| 10 | Tap **Reset demo** | |

## If someone asks

**Can you get around it?** Yes, on purpose. There's an Emergency unlock, and it always ends at the
prayer cutoff. It's a commitment you make to yourself, not a cage. It can't lock anyone out of
calls or settings.

**Does it know if you really prayed?** No, and it doesn't claim to. It's between you and Allah. The
app only records what you tell it, and that stays on your phone.

**Why Android only?** iOS has Screen Time APIs that can do this, but they need an Apple entitlement
that takes time to approve. The planning logic is shared, so iOS needs a new native module rather
than a new app.

**What about different madhabs?** Calculation method, Asr preference and the Isha cutoff are all
settings. The app says plainly that these are preferences, not rulings.

**What data do you collect?** None. There are no accounts and no servers.

## If something goes wrong

- **No notification appears:** check the phone isn't on Do Not Disturb, and keep going. The
  on-screen count still shows the logic working.
- **The shield doesn't appear:** make sure you opened the app selected in Kushu Mode, and that
  both permissions show Granted.
- **Stuck on a shield:** tap **Emergency unlock**. A demo restriction also ends by itself after
  5 minutes, or when you leave Demo Mode.
