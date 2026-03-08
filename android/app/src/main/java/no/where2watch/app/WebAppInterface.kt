package no.where2watch.app

import android.webkit.JavascriptInterface

/**
 * JavaScript interface exposed as `window.AndroidBridge` in the WebView.
 *
 * The web app can call these methods to interact with native Android features.
 * This mirrors the iOS pattern where Swift exposes `window.webkit.messageHandlers`.
 *
 * Detection in JS:  `!!window.AndroidBridge`
 */
class WebAppInterface(private val activity: MainActivity) {

    /**
     * Request push notification permission.
     * Dispatches `push-permission-result` CustomEvent back to JS.
     */
    @JavascriptInterface
    fun requestPushPermission() {
        activity.requestNotificationPermission()
    }

    /**
     * Query current push permission state and FCM token.
     * Dispatches `push-state` CustomEvent back to JS.
     */
    @JavascriptInterface
    fun queryPushState() {
        activity.queryPushState()
    }

    /**
     * Returns true — used by the web app to confirm we're in the Android app.
     */
    @JavascriptInterface
    fun isAndroidApp(): Boolean = true
}

