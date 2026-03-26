package com.aiyal.mobibix.ui.features.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.data.network.AppNotificationItem

@Composable
fun NotificationBellIcon(
    viewModel: NotificationViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var expanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.refreshUnreadCount()
    }

    Box {
        IconButton(onClick = {
            expanded = true
            viewModel.loadNotifications()
        }) {
            Box {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = "Notifications",
                    tint = MaterialTheme.colorScheme.onSurface
                )
                if (state.unreadCount > 0) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .offset(x = 6.dp, y = (-4).dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.error)
                            .align(Alignment.TopEnd),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (state.unreadCount > 99) "99+" else state.unreadCount.toString(),
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.widthIn(min = 300.dp, max = 340.dp)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Notifications",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                if (state.unreadCount > 0) {
                    TextButton(onClick = {
                        viewModel.markAllAsRead()
                    }) {
                        Text("Mark all read", fontSize = 12.sp)
                    }
                }
            }

            HorizontalDivider()

            when {
                state.loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(80.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                }
                state.notifications.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(80.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No notifications",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp
                        )
                    }
                }
                else -> {
                    LazyColumn(modifier = Modifier.height(320.dp)) {
                        items(state.notifications, key = { it.id }) { notif ->
                            NotificationItem(
                                notification = notif,
                                onClick = {
                                    if (!notif.isRead) viewModel.markAsRead(notif.id)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationItem(
    notification: AppNotificationItem,
    onClick: () -> Unit
) {
    val bgColor = if (!notification.isRead)
        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f)
    else
        Color.Transparent

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(bgColor)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Unread dot
        Box(
            modifier = Modifier
                .padding(top = 6.dp)
                .size(8.dp)
                .clip(CircleShape)
                .background(
                    if (!notification.isRead) MaterialTheme.colorScheme.primary
                    else Color.Transparent
                )
        )
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            notification.title?.let {
                Text(
                    text = it,
                    fontSize = 13.sp,
                    fontWeight = if (!notification.isRead) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            notification.body?.let {
                Text(
                    text = it,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(
                text = formatNotifTime(notification.createdAt),
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
    HorizontalDivider(thickness = 0.5.dp)
}

private fun formatNotifTime(isoDate: String): String {
    return try {
        val millis = java.time.Instant.parse(isoDate).toEpochMilli()
        val diff = System.currentTimeMillis() - millis
        when {
            diff < 60_000 -> "Just now"
            diff < 3_600_000 -> "${diff / 60_000}m ago"
            diff < 86_400_000 -> "${diff / 3_600_000}h ago"
            else -> "${diff / 86_400_000}d ago"
        }
    } catch (_: Exception) {
        isoDate.take(10)
    }
}
