package expo.modules.kushucountdown

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray

/**
 * An ongoing notification counting down to the next prayer. Android draws the countdown
 * through the chronometer, so no JavaScript or service runs while it ticks. At each prayer
 * one inexact alarm moves it on to the next stored entry, with the app closed.
 */
object CountdownController {
  private const val PREFS = "kushu_countdown"
  private const val KEY_PLAN = "plan"
  private const val CHANNEL = "kushu_countdown"
  private const val NOTIFICATION_ID = 7301

  private data class Entry(val label: String, val timeLabel: String, val startMs: Long)

  fun setPlan(context: Context, entriesJson: String) {
    prefs(context).edit().putString(KEY_PLAN, entriesJson).apply()
    show(context)
  }

  fun clear(context: Context) {
    prefs(context).edit().remove(KEY_PLAN).apply()
    alarms(context).cancel(alarmIntent(context))
    manager(context).cancel(NOTIFICATION_ID)
  }

  fun canPost(context: Context): Boolean = manager(context).areNotificationsEnabled()

  /** Brings the notification in line with the stored plan. Safe to call at any time. */
  fun show(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val now = System.currentTimeMillis()
    val next = readPlan(context).firstOrNull { it.startMs > now }
    alarms(context).cancel(alarmIntent(context))

    if (next == null) {
      manager(context).cancel(NOTIFICATION_ID)
      return
    }

    manager(context).createNotificationChannel(
      NotificationChannel(CHANNEL, "Prayer countdown", NotificationManager.IMPORTANCE_LOW).apply {
        setShowBadge(false)
      },
    )

    val notification = Notification.Builder(context, CHANNEL)
      .setSmallIcon(smallIcon(context))
      .setContentTitle("Next prayer: ${next.label}")
      .setContentText("Begins at ${next.timeLabel}")
      .setContentIntent(openApp(context))
      .setWhen(next.startMs)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setTimeoutAfter(next.startMs - now)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .build()

    if (canPost(context)) manager(context).notify(NOTIFICATION_ID, notification)

    // Inexact on purpose: the notification removes itself on time, and the following
    // countdown appearing a few minutes later costs nothing.
    alarms(context).setAndAllowWhileIdle(
      AlarmManager.RTC_WAKEUP,
      next.startMs,
      alarmIntent(context),
    )
  }

  private fun readPlan(context: Context): List<Entry> {
    val json = prefs(context).getString(KEY_PLAN, null) ?: return emptyList()
    return try {
      val array = JSONArray(json)
      List(array.length()) { i ->
        val o = array.getJSONObject(i)
        Entry(o.getString("label"), o.getString("timeLabel"), o.getLong("startMs"))
      }
    } catch (e: org.json.JSONException) {
      emptyList()
    }
  }

  /** The deep link Expo Router maps to the dashboard. */
  private fun openApp(context: Context): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("kushu://"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      NOTIFICATION_ID,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun smallIcon(context: Context): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
    context,
    NOTIFICATION_ID,
    Intent(context, CountdownReceiver::class.java),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun alarms(context: Context) =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}

/** Runs at each prayer, and after a reboot or clock change, when alarms are lost. */
class CountdownReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    CountdownController.show(context)
  }
}
