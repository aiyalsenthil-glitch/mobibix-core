package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.R
import com.aiyal.mobibix.ui.theme.ThemeState

data class DrawerItem(
    val label: String,
    val icon: ImageVector,
    val route: String
)

private val drawerItems = listOf(
    DrawerItem("Products", Icons.Default.ShoppingBag, "product_list"),
    DrawerItem("Inventory", Icons.Default.Inventory, "inventory"),
    DrawerItem("Customers", Icons.Default.People, "customers"),
    DrawerItem("WhatsApp", Icons.AutoMirrored.Filled.Chat, "whatsapp_dashboard"),
    DrawerItem("CRM", Icons.Default.AssignmentInd, "crm_dashboard"),
    DrawerItem("Suppliers", Icons.Default.LocalShipping, "suppliers"),
    DrawerItem("Purchases", Icons.Default.ShoppingCart, "purchases"),
    DrawerItem("Payments", Icons.Default.CreditCard, "finance"),
    DrawerItem("Reports", Icons.Default.Assessment, "reports"),
    DrawerItem("Shops", Icons.Default.Store, "shop_management"),
    DrawerItem("Staff", Icons.Default.People, "staff"),
    DrawerItem("Settings", Icons.Default.Settings, "settings"),
)

@Composable
fun AppDrawerContent(
    currentRoute: String?,
    onItemClick: (String) -> Unit,
    onLogout: () -> Unit,
    onClose: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val isDark = ThemeState.isDarkMode ?: isSystemInDarkTheme()

    Column(
        modifier = Modifier
            .fillMaxHeight()
            .width(280.dp)
            .background(colorScheme.surface)
    ) {
        // ── Logo Header ──
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            colorScheme.primary.copy(alpha = 0.08f),
                            Color.Transparent
                        )
                    )
                )
                .padding(top = 48.dp, bottom = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Dark mode toggle
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (isDark) Icons.Default.DarkMode else Icons.Default.LightMode,
                        contentDescription = "Theme",
                        tint = colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                    Switch(
                        checked = isDark,
                        onCheckedChange = { ThemeState.isDarkMode = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = colorScheme.primary,
                            checkedTrackColor = colorScheme.primary.copy(alpha = 0.3f),
                            uncheckedThumbColor = colorScheme.outline,
                            uncheckedTrackColor = colorScheme.outlineVariant
                        ),
                        modifier = Modifier.height(28.dp)
                    )
                }
                IconButton(onClick = onClose) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Image(
                painter = painterResource(id = R.drawable.mobibix_logo),
                contentDescription = "MobiBix Logo",
                modifier = Modifier.size(64.dp),
                contentScale = ContentScale.Fit
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "MOBIBIX",
                color = colorScheme.primary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 3.sp
            )
        }

        HorizontalDivider(
            color = colorScheme.outlineVariant,
            thickness = 1.dp,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(Modifier.height(8.dp))

        // ── Nav Items ──
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
        ) {
            items(drawerItems) { item ->
                val isSelected = currentRoute == item.route
                DrawerNavItem(
                    item = item,
                    isSelected = isSelected,
                    onClick = {
                        onItemClick(item.route)
                        onClose()
                    }
                )
            }
        }

        // ── Logout ──
        HorizontalDivider(
            color = colorScheme.outlineVariant,
            thickness = 1.dp,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onLogout() }
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                Icons.AutoMirrored.Filled.Logout,
                contentDescription = "Logout",
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(22.dp)
            )
            Text(
                "Logout",
                color = MaterialTheme.colorScheme.error,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium
            )
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun DrawerNavItem(
    item: DrawerItem,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val bgColor = if (isSelected) colorScheme.primary.copy(alpha = 0.12f) else Color.Transparent
    val textColor = if (isSelected) colorScheme.primary else colorScheme.onSurface
    val iconColor = if (isSelected) colorScheme.primary else colorScheme.onSurfaceVariant

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            item.icon,
            contentDescription = item.label,
            tint = iconColor,
            modifier = Modifier.size(22.dp)
        )
        Text(
            item.label,
            color = textColor,
            fontSize = 15.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
        )
    }
}
