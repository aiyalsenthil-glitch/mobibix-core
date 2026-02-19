package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.*
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

data class DrawerItem(
    val label: String,
    val icon: ImageVector,
    val route: String
)

private val drawerItems = listOf(
    DrawerItem("Products", Icons.Default.ShoppingBag, "products"),
    DrawerItem("Inventory", Icons.Default.Inventory, "inventory"),
    DrawerItem("Customers", Icons.Default.People, "customers"),
    DrawerItem("WhatsApp", Icons.Default.Chat, "whatsapp_dashboard"),
    DrawerItem("Suppliers", Icons.Default.LocalShipping, "suppliers"),
    DrawerItem("Purchases", Icons.Default.ShoppingCart, "purchases"),
    DrawerItem("Payments", Icons.Default.CreditCard, "finance"),
    DrawerItem("Reports", Icons.Default.Assessment, "reports"),
    DrawerItem("Shops", Icons.Default.Store, "shop_management"),
    DrawerItem("Staff", Icons.Default.People, "staff"),
    DrawerItem("Settings", Icons.Default.Settings, "settings"),
)

// Dark sidebar colors matching the web version
private val DrawerBackground = Color(0xFF1E1B26)
private val DrawerItemHover = Color(0xFF2A2634)
private val DrawerTextColor = Color(0xFFE6E1E5)
private val DrawerTextMuted = Color(0xFF9CA3AF)
private val DrawerAccent = Color(0xFF00C896)

@Composable
fun AppDrawerContent(
    currentRoute: String?,
    onItemClick: (String) -> Unit,
    onLogout: () -> Unit,
    onClose: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxHeight()
            .width(280.dp)
            .background(DrawerBackground)
    ) {
        // ── Logo Header ──
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 48.dp, bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            IconButton(
                onClick = onClose,
                modifier = Modifier.align(Alignment.End).padding(end = 8.dp)
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Close",
                    tint = DrawerTextMuted
                )
            }
            Image(
                painter = painterResource(id = R.drawable.mobibix_logo),
                contentDescription = "MobiBix Logo",
                modifier = Modifier.size(80.dp),
                contentScale = ContentScale.Fit
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "MOBIBIX",
                color = DrawerAccent,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 3.sp
            )
        }

        HorizontalDivider(
            color = Color(0xFF2A2634),
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
            color = Color(0xFF2A2634),
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
                tint = Color(0xFFEF4444),
                modifier = Modifier.size(22.dp)
            )
            Text(
                "Logout",
                color = Color(0xFFEF4444),
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
    val bgColor = if (isSelected) DrawerAccent.copy(alpha = 0.12f) else Color.Transparent
    val textColor = if (isSelected) DrawerAccent else DrawerTextColor
    val iconColor = if (isSelected) DrawerAccent else DrawerTextMuted

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
