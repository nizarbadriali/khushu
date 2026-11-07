package expo.modules.salahlockblocker

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.provider.Settings
import android.telecom.TelecomManager
import android.util.Base64
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class SalahlockBlockerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SalahlockBlocker")

    Function("getStatus") {
      val store = BlockStore(context)
      val active = store.activeWindow(System.currentTimeMillis())
      mapOf(
        "usageAccess" to BlockScheduler.hasUsageAccess(context),
        "overlay" to BlockScheduler.hasOverlay(context),
        "exactAlarm" to BlockScheduler.canExactAlarm(context),
        "activeWindowId" to active?.id,
        "activeLabel" to active?.label,
        "released" to store.released.toList(),
      )
    }

    AsyncFunction("getInstalledApps") { listApps() }

    AsyncFunction("openUsageAccessSettings") {
      openSettings(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    AsyncFunction("openOverlaySettings") {
      openSettings(
        Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${context.packageName}"),
        ),
      )
    }

    AsyncFunction("setPlan") { windows: List<Map<String, Any?>>, packages: List<String> ->
      val store = BlockStore(context)
      store.windows = windows.map {
        BlockWindow(
          it["id"] as String,
          it["label"] as String,
          (it["startMs"] as Number).toLong(),
          (it["endMs"] as Number).toLong(),
        )
      }
      store.packages = packages.toSet()
      store.pruneReleased()
      BlockScheduler.safeArm(context)
    }

    AsyncFunction("release") { id: String ->
      BlockStore(context).release(id)
      BlockScheduler.safeArm(context)
    }

    AsyncFunction("startDemoBlock") { label: String, durationMs: Double ->
      val now = System.currentTimeMillis()
      val store = BlockStore(context)
      store.released = store.released - DEMO_ID
      store.demoWindow = BlockWindow(DEMO_ID, label, now, now + durationMs.toLong())
      BlockScheduler.safeArm(context)
    }

    AsyncFunction("stopDemoBlock") {
      BlockStore(context).demoWindow = null
      BlockScheduler.safeArm(context)
    }
  }

  private fun openSettings(intent: Intent) {
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  /** Launchable apps, minus Kushu and anything needed in an emergency. */
  private fun listApps(): List<Map<String, String>> {
    val pm = context.packageManager
    val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val telecom = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
    val protected = setOfNotNull(
      context.packageName,
      telecom?.defaultDialerPackage,
      "com.android.settings",
      "com.android.emergency",
      "com.google.android.dialer",
    )
    return pm.queryIntentActivities(launcher, PackageManager.MATCH_ALL)
      .asSequence()
      .filter { it.activityInfo.packageName !in protected }
      .distinctBy { it.activityInfo.packageName }
      .map {
        mapOf(
          "packageName" to it.activityInfo.packageName,
          "label" to it.loadLabel(pm).toString(),
          "icon" to iconBase64(it.loadIcon(pm)),
        )
      }
      .sortedBy { it["label"]?.lowercase() }
      .toList()
  }

  private fun iconBase64(drawable: android.graphics.drawable.Drawable): String {
    val size = 96
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    drawable.setBounds(0, 0, size, size)
    drawable.draw(Canvas(bitmap))
    val out = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }

  private companion object {
    const val DEMO_ID = "demo"
  }
}
