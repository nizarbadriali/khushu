package expo.modules.kushucountdown

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KushuCountdownModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("KushuCountdown")

    Function("setPlan") { entriesJson: String ->
      CountdownController.setPlan(context, entriesJson)
    }

    Function("clear") {
      CountdownController.clear(context)
    }

    Function("canPost") {
      CountdownController.canPost(context)
    }
  }
}
