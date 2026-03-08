package no.where2watch.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Handles incoming FCM messages and token refresh events.
 *
 * When a push notification arrives:
 *   - If the app is in the foreground, we display a local notification.
 *   - If the app is in the background, the system tray notification is
 *     handled automatically by FCM (when using `notification` payload).
 *
 * We use FCM `data` messages from our backend so we always control display.
 */
class W2WFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "W2W_FCM"
        private const val CHANNEL_ID = "match_alerts"
    }

    /**
     * Called when the FCM token is created or refreshed.
     * The new token should be sent to the backend, but since we don't have
     * persistent auth, we store it and the WebView will pick it up on next load.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed: ${token.take(10)}…")
        // Token will be picked up by WebAppInterface.queryPushState()
        // when the WebView is next loaded.
    }

    /**
     * Called when a data message is received from FCM.
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "Message received from: ${message.from}")

        val title = message.data["title"]
            ?: message.notification?.title
            ?: "where2watch"

        val body = message.data["body"]
            ?: message.notification?.body
            ?: return  // nothing to show

        showNotification(title, body, message.data)
    }

    private fun showNotification(title: String, body: String, data: Map<String, String>) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            // Pass fixture/bar data so we can deep-link
            data.forEach { (k, v) -> putExtra(k, v) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        // Use a unique ID based on time so multiple notifications can show
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}

