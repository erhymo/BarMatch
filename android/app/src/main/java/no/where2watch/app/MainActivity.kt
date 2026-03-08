package no.where2watch.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging

/**
 * Main activity — hosts a full-screen WebView pointing at the where2watch website.
 *
 * Exposes a JavaScript interface `AndroidBridge` so the web app can:
 *   - request push notification permission
 *   - query push permission state
 *   - receive the FCM token
 *
 * This mirrors the iOS WKWebView + messageHandlers pattern.
 */
class MainActivity : AppCompatActivity() {

    lateinit var webView: WebView
        private set

    private val BASE_URL = "https://where2watch.no"

    // Permission launcher for POST_NOTIFICATIONS (Android 13+)
    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val status = if (granted) "granted" else "denied"
            evaluateJs("window.dispatchEvent(new CustomEvent('push-permission-result', { detail: { status: '$status' } }))")
            if (granted) fetchAndSendFcmToken()
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        createNotificationChannel()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            @Suppress("DEPRECATION")
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString = settings.userAgentString + " Where2WatchAndroid/1.0"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                // Keep navigation within our domain in the WebView
                return if (url.startsWith(BASE_URL) || url.startsWith("https://where2watch.no")) {
                    false
                } else {
                    // Open external links in the browser
                    startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, request.url))
                    true
                }
            }
        }

        webView.webChromeClient = WebChromeClient()

        // Add JavaScript interface — accessible as `window.AndroidBridge` in JS
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        setContentView(webView)

        webView.loadUrl(BASE_URL)
    }

    @Suppress("DEPRECATION")
    @Deprecated("Use OnBackPressedDispatcher instead", ReplaceWith("onBackPressedDispatcher"))
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    fun evaluateJs(script: String) {
        runOnUiThread {
            webView.evaluateJavascript(script, null)
        }
    }

    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED -> {
                    evaluateJs("window.dispatchEvent(new CustomEvent('push-permission-result', { detail: { status: 'granted' } }))")
                    fetchAndSendFcmToken()
                }
                else -> {
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        } else {
            // Pre-Android 13: notifications are allowed by default
            evaluateJs("window.dispatchEvent(new CustomEvent('push-permission-result', { detail: { status: 'granted' } }))")
            fetchAndSendFcmToken()
        }
    }

    fun queryPushState() {
        val status = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) "granted" else "default"
        } else {
            "granted" // Pre-13 always allowed
        }

        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                evaluateJs("window.dispatchEvent(new CustomEvent('push-state', { detail: { status: '$status', token: '$token' } }))")
            } else {
                evaluateJs("window.dispatchEvent(new CustomEvent('push-state', { detail: { status: '$status' } }))")
            }
        }
    }

    private fun fetchAndSendFcmToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                evaluateJs("window.dispatchEvent(new CustomEvent('push-token', { detail: { token: '$token' } }))")
                // Register the token with the backend
                registerTokenWithBackend(token)
            }
        }
    }

    private fun registerTokenWithBackend(token: String) {
        Thread {
            try {
                val url = java.net.URL("$BASE_URL/api/push/register")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                val body = """{"deviceToken":"$token","platform":"android"}"""
                conn.outputStream.use { it.write(body.toByteArray()) }
                conn.responseCode // trigger the request
                conn.disconnect()
            } catch (e: Exception) {
                android.util.Log.e("W2W", "Failed to register FCM token", e)
            }
        }.start()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            "match_alerts",
            getString(R.string.channel_name),
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = getString(R.string.channel_description)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }
}

