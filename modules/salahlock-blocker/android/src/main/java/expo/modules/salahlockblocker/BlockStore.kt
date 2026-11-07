package expo.modules.salahlockblocker

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class BlockWindow(val id: String, val label: String, val startMs: Long, val endMs: Long)

/**
 * Native copy of the plan, so restrictions start and expire without JavaScript.
 * `released` holds ids the user unlocked; a released window stays dead even if
 * JS resubmits it. Corrupt data reads as "no windows", which fails open.
 */
class BlockStore(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  var packages: Set<String>
    get() = prefs.getStringSet(KEY_PACKAGES, emptySet())?.toSet() ?: emptySet()
    set(value) = prefs.edit().putStringSet(KEY_PACKAGES, value).apply()

  var windows: List<BlockWindow>
    get() = readWindows(KEY_WINDOWS)
    set(value) = writeWindows(KEY_WINDOWS, value)

  var demoWindow: BlockWindow?
    get() = readWindows(KEY_DEMO).firstOrNull()
    set(value) = writeWindows(KEY_DEMO, listOfNotNull(value))

  var released: Set<String>
    get() = prefs.getStringSet(KEY_RELEASED, emptySet())?.toSet() ?: emptySet()
    set(value) = prefs.edit().putStringSet(KEY_RELEASED, value).apply()

  private fun usable(nowMs: Long): List<BlockWindow> {
    val dead = released
    return (windows + listOfNotNull(demoWindow)).filter { it.id !in dead && it.endMs > nowMs }
  }

  fun activeWindow(nowMs: Long): BlockWindow? =
    if (packages.isEmpty()) null else usable(nowMs).firstOrNull { it.startMs <= nowMs }

  fun nextWindow(nowMs: Long): BlockWindow? =
    if (packages.isEmpty()) null
    else usable(nowMs).filter { it.startMs > nowMs }.minByOrNull { it.startMs }

  fun release(id: String) {
    released = released + id
    if (demoWindow?.id == id) demoWindow = null
  }

  /** Forgets released ids for windows that are gone, so the set cannot grow forever. */
  fun pruneReleased() {
    val live = windows.map { it.id }.toSet()
    released = released.filter { it in live }.toSet()
  }

  private fun readWindows(key: String): List<BlockWindow> = try {
    val array = JSONArray(prefs.getString(key, "[]"))
    List(array.length()) { i ->
      val o = array.getJSONObject(i)
      BlockWindow(o.getString("id"), o.getString("label"), o.getLong("startMs"), o.getLong("endMs"))
    }
  } catch (e: Exception) {
    emptyList()
  }

  private fun writeWindows(key: String, value: List<BlockWindow>) {
    val array = JSONArray()
    value.forEach {
      array.put(
        JSONObject()
          .put("id", it.id)
          .put("label", it.label)
          .put("startMs", it.startMs)
          .put("endMs", it.endMs),
      )
    }
    prefs.edit().putString(key, array.toString()).apply()
  }

  private companion object {
    const val FILE = "salahlock_blocker"
    const val KEY_PACKAGES = "packages"
    const val KEY_WINDOWS = "windows"
    const val KEY_DEMO = "demo"
    const val KEY_RELEASED = "released"
  }
}
