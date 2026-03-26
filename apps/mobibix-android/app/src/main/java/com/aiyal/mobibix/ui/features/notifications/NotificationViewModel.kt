package com.aiyal.mobibix.ui.features.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.AppNotificationItem
import com.aiyal.mobibix.data.network.NotificationApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationState(
    val notifications: List<AppNotificationItem> = emptyList(),
    val unreadCount: Int = 0,
    val loading: Boolean = false
)

@HiltViewModel
class NotificationViewModel @Inject constructor(
    private val notificationApi: NotificationApi
) : ViewModel() {

    private val _state = MutableStateFlow(NotificationState())
    val state = _state.asStateFlow()

    fun loadNotifications() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            try {
                val items = notificationApi.getNotifications()
                val unread = items.count { !it.isRead }
                _state.value = NotificationState(notifications = items, unreadCount = unread, loading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false)
            }
        }
    }

    fun refreshUnreadCount() {
        viewModelScope.launch {
            try {
                val response = notificationApi.getUnreadCount()
                _state.value = _state.value.copy(unreadCount = response.count)
            } catch (_: Exception) {}
        }
    }

    fun markAsRead(id: String) {
        viewModelScope.launch {
            try {
                notificationApi.markAsRead(id)
                _state.value = _state.value.copy(
                    notifications = _state.value.notifications.map {
                        if (it.id == id) it.copy(isRead = true) else it
                    },
                    unreadCount = maxOf(0, _state.value.unreadCount - 1)
                )
            } catch (_: Exception) {}
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            try {
                notificationApi.markAllAsRead()
                _state.value = _state.value.copy(
                    notifications = _state.value.notifications.map { it.copy(isRead = true) },
                    unreadCount = 0
                )
            } catch (_: Exception) {}
        }
    }
}
