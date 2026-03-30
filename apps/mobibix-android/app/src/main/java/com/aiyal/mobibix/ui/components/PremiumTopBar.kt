package com.aiyal.mobibix.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.ui.features.notifications.NotificationBellIcon

/**
 * A unified premium top bar that should be used across all main screens.
 * Supports a navigation icon (usually Menu), a title or custom content, and the notification center.
 */
@Composable
fun PremiumTopBar(
    modifier: Modifier = Modifier,
    title: String? = null,
    navigationIcon: ImageVector = Icons.Default.Menu,
    onNavigationClick: () -> Unit = {},
    customContent: @Composable (RowScope.() -> Unit)? = null,
    showNotifications: Boolean = true
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Navigation Icon (Menu/Back)
        IconButton(
            onClick = onNavigationClick,
            modifier = Modifier.size(40.dp)
        ) {
            Icon(
                navigationIcon, 
                contentDescription = null, 
                tint = MaterialTheme.colorScheme.onBackground
            )
        }
        
        Spacer(Modifier.width(12.dp))
        
        // Title or Custom Content
        if (customContent != null) {
            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                customContent()
            }
        } else if (title != null) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f)
            )
        } else {
            Spacer(Modifier.weight(1f))
        }

        // Action Icons
        if (showNotifications) {
            NotificationBellIcon()
        }
    }
}
