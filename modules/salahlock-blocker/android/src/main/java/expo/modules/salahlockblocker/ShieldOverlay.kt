package expo.modules.salahlockblocker

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/** Full-screen shield drawn over a selected app. System bars and calls stay reachable. */
class ShieldOverlay(
  private val context: Context,
  private var label: String,
  private val onOpenApp: () -> Unit,
  private val onEmergency: () -> Unit,
) {
  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private var root: View? = null
  private var title: TextView? = null

  fun show() {
    if (root != null) return
    val view = build()
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.OPAQUE,
    )
    windowManager.addView(view, params)
    root = view
  }

  fun update(newLabel: String) {
    if (newLabel == label) return
    label = newLabel
    title?.text = titleText()
  }

  fun hide() {
    root?.let { windowManager.removeViewImmediate(it) }
    root = null
    title = null
  }

  private fun titleText() = "It's time for $label"

  private fun dp(value: Int): Int = TypedValue.applyDimension(
    TypedValue.COMPLEX_UNIT_DIP,
    value.toFloat(),
    context.resources.displayMetrics,
  ).toInt()

  private fun build(): View {
    val heading = TextView(context).apply {
      text = titleText()
      setTextColor(IVORY)
      textSize = 30f
      typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
      gravity = Gravity.CENTER
    }
    title = heading

    val body = TextView(context).apply {
      text = "This app is paused until you confirm your prayer in Kushu."
      setTextColor(IVORY)
      alpha = 0.8f
      textSize = 16f
      gravity = Gravity.CENTER
      setPadding(0, dp(12), 0, dp(32))
    }

    val open = Button(context).apply {
      text = "Open Kushu"
      isAllCaps = false
      textSize = 17f
      setTextColor(FOREST)
      background = GradientDrawable().apply {
        setColor(GOLD)
        cornerRadius = dp(16).toFloat()
      }
      setOnClickListener { onOpenApp() }
    }

    val emergency = TextView(context).apply {
      text = "Emergency unlock"
      setTextColor(IVORY)
      alpha = 0.7f
      textSize = 14f
      gravity = Gravity.CENTER
      setPadding(dp(16), dp(20), dp(16), dp(20))
      setOnClickListener { onEmergency() }
    }

    val column = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(32), 0, dp(32), 0)
      addView(heading)
      addView(body)
      addView(
        open,
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56)),
      )
      addView(emergency)
    }

    return object : FrameLayout(context) {
      // The back key must leave the blocked app, not reach it behind the shield.
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
          if (event.action == KeyEvent.ACTION_UP) goHome()
          return true
        }
        return super.dispatchKeyEvent(event)
      }
    }.apply {
      setBackgroundColor(FOREST)
      isFocusableInTouchMode = true
      addView(
        column,
        FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.MATCH_PARENT,
          FrameLayout.LayoutParams.WRAP_CONTENT,
          Gravity.CENTER,
        ),
      )
    }
  }

  private fun goHome() {
    context.startActivity(
      Intent(Intent.ACTION_MAIN)
        .addCategory(Intent.CATEGORY_HOME)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
  }

  private companion object {
    val FOREST = Color.parseColor("#064635")
    val IVORY = Color.parseColor("#FAF8F3")
    val GOLD = Color.parseColor("#C9A55C")
  }
}
