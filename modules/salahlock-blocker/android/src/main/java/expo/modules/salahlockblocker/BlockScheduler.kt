package expo.modules.salahlockblocker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.app.AppOpsManager
import android.util.Log

object BlockScheduler {
  private const val TAG = "SalahLockBlocker"

  fun hasUsageAccess(context: Context): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = ops.unsafeCheckOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      context.packageName,
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  fun hasOverlay(context: Context): Boolean = Settings.canDrawOverlays(context)

  fun canBlock(context: Context): Boolean = hasUsageAccess(context) && hasOverlay(context)

  fun canExactAlarm(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarms.canScheduleExactAlarms()
  }

  /** Brings the system in line with the stored plan. Safe to call at any time. */
  fun arm(context: Context, allowStart: Boolean = true) {
    val store = BlockStore(context)
    val now = System.currentTimeMillis()
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = alarmIntent(context)
    alarms.cancel(pending)

    if (!canBlock(context)) {
      BlockerService.stop(context)
      return
    }
    if (allowStart && store.activeWindow(now) != null) {
      BlockerService.start(context)
      return
    }
    BlockerService.stop(context)
    val next = store.nextWindow(now) ?: return
    if (canExactAlarm(context)) {
      alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.startMs, pending)
    } else {
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.startMs, pending)
    }
  }

  private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
    context,
    0,
    Intent(context, BlockAlarmReceiver::class.java),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  /** Used by the service as it shuts down: arms the next window, never restarts itself. */
  fun safeArmNextOnly(context: Context) = safeArm(context, allowStart = false)

  fun safeArm(context: Context, allowStart: Boolean = true) {
    try {
      arm(context, allowStart)
    } catch (e: Exception) {
      // Failing to arm leaves apps unrestricted, which is the safe direction.
      Log.w(TAG, "arm failed", e)
    }
  }
}

class BlockAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) = BlockScheduler.safeArm(context)
}

class BlockRearmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) = BlockScheduler.safeArm(context)
}
