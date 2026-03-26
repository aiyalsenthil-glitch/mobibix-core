package com.aiyal.mobibix.data.network

import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path

data class AppNotificationItem(
    val id: String,
    val eventId: String,
    val title: String? = null,
    val body: String? = null,
    val isRead: Boolean = false,
    val createdAt: String
)

data class UnreadCountResponse(val count: Int)

interface NotificationApi {

    @GET("api/notifications")
    suspend fun getNotifications(): List<AppNotificationItem>

    @GET("api/notifications/unread-count")
    suspend fun getUnreadCount(): UnreadCountResponse

    @PATCH("api/notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: String): Map<String, Boolean>

    @PATCH("api/notifications/read-all")
    suspend fun markAllAsRead(): Map<String, Int>
}
