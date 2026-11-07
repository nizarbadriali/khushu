package expo.modules.salahlockblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log

/**
 * Runs only during an active block window. It watches the foreground app and
 * shows the shield over selected apps. Every path that loses certainty (window
 * ended, permission revoked, an exception) stops the service, so failure unblocks.
 */
class BlockerService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var store: BlockStore
  private var shield: ShieldOverlay? = null
  private var foregroundPackage: String? = null
  private var lastQueryMs = 0L
  private var focusRequest: AudioFocusRequest? = null

  private val tick = object : Runnable {
    override fun run() {
      try {
        evaluate()
        handler.postDelayed(this, POLL_MS)
      } catch (e: Exception) {
        Log.w(TAG, "tick failed, releasing", e)
        shutdown()
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    store = BlockStore(this)
    lastQueryMs = System.currentTimeMillis() - INITIAL_LOOKBACK_MS
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val window = store.activeWindow(System.currentTimeMillis())
    enterForeground(window?.label ?: "Prayer")
    if (window == null) {
      shutdown()
      return START_NOT_STICKY
    }
    handler.removeCallbacks(tick)
    handler.post(tick)
    return START_NOT_STICKY
  }

  private fun evaluate() {
    val now = System.currentTimeMillis()
    val window = store.activeWindow(now)
    if (window == null || !BlockScheduler.canBlock(this)) {
      shutdown()
      return
    }
    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    if (!power.isInteractive) {
      hideShield()
      return
    }
    refreshForeground(now)
    if (foregroundPackage in store.packages) showShield(window) else hideShield()
  }

  private fun refreshForeground(now: Long) {
    val usage = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usage.queryEvents(lastQueryMs, now)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
        foregroundPackage = event.packageName
      }
    }
    lastQueryMs = now - QUERY_OVERLAP_MS
  }

  private fun showShield(window: BlockWindow) {
    val existing = shield
    if (existing != null) {
      existing.update(window.label)
      return
    }
    shield = ShieldOverlay(
      this,
      window.label,
      onOpenApp = ::openApp,
      onEmergency = {
        store.release(window.id)
        BlockScheduler.safeArm(this)
      },
    ).also { it.show() }
    takeAudioFocus()
  }

  private fun hideShield() {
    shield?.hide()
    shield = null
    releaseAudioFocus()
  }

  private fun openApp() {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
    startActivity(launch)
    foregroundPackage = packageName
    hideShield()
  }

  /** The shield hides video but not sound, so ask the covered app to pause. */
  private fun takeAudioFocus() {
    val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
      .setAudioAttributes(
        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).build(),
      )
      .build()
    audio.requestAudioFocus(request)
    focusRequest = request
  }

  private fun releaseAudioFocus() {
    val request = focusRequest ?: return
    (getSystemService(Context.AUDIO_SERVICE) as AudioManager).abandonAudioFocusRequest(request)
    focusRequest = null
  }

  private fun shutdown() {
    handler.removeCallbacks(tick)
    hideShield()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
    BlockScheduler.safeArmNextOnly(this)
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    hideShield()
    super.onDestroy()
  }

  private fun enterForeground(label: String) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL, "Kushu active", NotificationManager.IMPORTANCE_LOW),
    )
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val content = launch?.let {
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
    val notification = Notification.Builder(this, CHANNEL)
      .setSmallIcon(smallIcon())
      .setContentTitle("Kushu is on for $label")
      .setContentText("Selected apps are paused until you confirm or the window ends.")
      .setContentIntent(content)
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun smallIcon(): Int {
    val id = resources.getIdentifier("notification_icon", "drawable", packageName)
    return if (id != 0) id else applicationInfo.icon
  }

  companion object {
    private const val TAG = "SalahLockBlocker"
    private const val CHANNEL = "salahlock_active"
    private const val NOTIFICATION_ID = 7301
    private const val POLL_MS = 700L
    private const val INITIAL_LOOKBACK_MS = 60 * 60 * 1000L
    private const val QUERY_OVERLAP_MS = 2_000L

    fun start(context: Context) {
      try {
        context.startForegroundService(Intent(context, BlockerService::class.java))
      } catch (e: Exception) {
        // Android refused the background start. The block is skipped, never stuck.
        Log.w(TAG, "could not start blocker", e)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, BlockerService::class.java))
    }
  }
}
