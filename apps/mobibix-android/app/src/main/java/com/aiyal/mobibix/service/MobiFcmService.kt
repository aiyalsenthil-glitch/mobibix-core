package com.aiyal.mobibix.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.REMOVED_AUTH_PROVIDER.messaging.FirebaseMessagingService
import com.google.REMOVED_AUTH_PROVIDER.messaging.RemoteMessage

/**
 * Firebase Cloud Messaging service.
 * Handles incoming push notifications for:
 * - Low stock alerts
 * - Job card status updates
 * - Approval requests
 * - Payment reminders
 * - Daily closing reminders
 */
class MobiFcmService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val notification = remoteMessage.notification

        val title = data["title"] ?: notification?.title ?: "MobiBix"
        val body = data["body"] ?: notification?.body ?: ""
        val type = data["type"] ?: "GENERAL"
        val referenceId = data["referenceId"]

        sendNotification(title, body, type, referenceId)
    }

    override fun onNewToken(token: String) {
        // Persist the latest FCM token so it can be sent to the backend on next authenticated session
        getSharedPreferences("mobi_fcm", Context.MODE_PRIVATE)
            .edit()
            .putString("pending_fcm_token", token)
            .apply()
        Log.i("MobiFcmService", "FCM token refreshed — stored for registration on next login")
    }

    private fun sendNotification(
        title: String,
        body: String,
        type: String,
        referenceId: String?
    ) {
        val channelId = getChannelId(type)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create channel for Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                getChannelName(type),
                getChannelImportance(type)
            ).apply {
                description = getChannelDescription(type)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = buildDeepLinkIntent(type, referenceId)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notifBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(getNotifPriority(type))

        notificationManager.notify(System.currentTimeMillis().toInt(), notifBuilder.build())
    }

    private fun buildDeepLinkIntent(type: String, referenceId: String?): Intent {
        val activityClass = try {
            Class.forName("com.aiyal.mobibix.MainActivity")
        } catch (e: ClassNotFoundException) {
            return Intent()
        }
        return Intent(this, activityClass).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            when (type) {
                "LOW_STOCK" -> putExtra("navigate_to", "product_list")
                "JOB_CARD" -> putExtra("navigate_to", referenceId?.let { "job_detail/$it" } ?: "home")
                "APPROVAL" -> putExtra("navigate_to", "approvals")
                "PAYMENT" -> putExtra("navigate_to", referenceId?.let { "invoice_details/${it.split(":")[0]}/${it.split(":").getOrElse(1) { it }}" } ?: "home")
                "DAILY_CLOSING" -> putExtra("navigate_to", "daily_closing")
                "STOCK_VERIFICATION" -> putExtra("navigate_to", "stock_verification")
                "CREDIT_NOTE" -> putExtra("navigate_to", "credit_notes")
                else -> putExtra("navigate_to", "home")
            }
        }
    }

    private fun getChannelId(type: String) = when (type) {
        "LOW_STOCK" -> "channel_inventory"
        "JOB_CARD" -> "channel_jobs"
        "APPROVAL" -> "channel_approvals"
        "PAYMENT" -> "channel_finance"
        else -> "channel_general"
    }

    private fun getChannelName(type: String) = when (type) {
        "LOW_STOCK" -> "Inventory Alerts"
        "JOB_CARD" -> "Job Cards"
        "APPROVAL" -> "Approvals"
        "PAYMENT" -> "Finance & Payments"
        else -> "General"
    }

    private fun getChannelDescription(type: String) = when (type) {
        "LOW_STOCK" -> "Notifications for low stock items"
        "JOB_CARD" -> "Job card status updates"
        "APPROVAL" -> "Pending approval requests"
        "PAYMENT" -> "Payment and invoice notifications"
        else -> "General MobiBix notifications"
    }

    private fun getChannelImportance(type: String) = when (type) {
        "APPROVAL" -> NotificationManager.IMPORTANCE_HIGH
        "LOW_STOCK" -> NotificationManager.IMPORTANCE_DEFAULT
        else -> NotificationManager.IMPORTANCE_DEFAULT
    }

    private fun getNotifPriority(type: String) = when (type) {
        "APPROVAL" -> NotificationCompat.PRIORITY_HIGH
        else -> NotificationCompat.PRIORITY_DEFAULT
    }
}
