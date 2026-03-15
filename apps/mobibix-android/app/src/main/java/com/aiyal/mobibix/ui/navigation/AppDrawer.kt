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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
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
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.core.app.UserRole
import com.aiyal.mobibix.ui.theme.ThemeState

data class DrawerItem(
    val label: String,
    val icon: ImageVector,
    val route: String,
    val requiredPermission: String? = null,
    val allowedRoles: List<String>? = null // null = all roles
)

data class DrawerSection(
    val title: String,
    val items: List<DrawerItem>
)

private fun buildDrawerSections(): List<DrawerSection> = listOf(
    DrawerSection(
        title = "Sales & Customers",
        items = listOf(
            DrawerItem("Customers", Icons.Default.People, "customers", "MEMBER_VIEW"),
            DrawerItem("Credit Notes", Icons.Default.Receipt, "credit_notes", "SALES_VIEW"),
            DrawerItem("Sales Return", Icons.Default.AssignmentReturn, "sales_return", "SALES_VIEW"),
            DrawerItem("Quotations", Icons.Default.Description, "quotations", "SALES_VIEW"),
            DrawerItem("Loyalty", Icons.Default.Stars, "loyalty", "SALES_VIEW"),
            DrawerItem("CRM", Icons.Default.AssignmentInd, "crm_dashboard", "MEMBER_VIEW"),
            DrawerItem("B2B", Icons.Default.Business, "b2b", "SALES_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
        )
    ),
    DrawerSection(
        title = "Inventory",
        items = listOf(
            DrawerItem("Products", Icons.Default.ShoppingBag, "product_list", "INVENTORY_VIEW"),
            DrawerItem("Suppliers", Icons.Default.LocalShipping, "suppliers", "INVENTORY_VIEW"),
            DrawerItem("Purchases", Icons.Default.ShoppingCart, "purchases", "INVENTORY_MANAGE"),
            DrawerItem("Stock Ledger", Icons.Default.Inventory2, "stock_ledger", "INVENTORY_VIEW"),
            DrawerItem("Barcode Labels", Icons.Default.QrCode, "barcode_labels", "INVENTORY_VIEW"),
        )
    ),
    DrawerSection(
        title = "Finance",
        items = listOf(
            DrawerItem("Payments", Icons.Default.CreditCard, "finance", "SALES_VIEW"),
            DrawerItem("Expenses", Icons.Default.Money, "expenses", "SALES_VIEW"),
            DrawerItem("Daily Closing", Icons.Default.Lock, "daily_closing", "SALES_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)),
        )
    ),
    DrawerSection(
        title = "Reports",
        items = listOf(
            DrawerItem("Reports", Icons.Default.Assessment, "reports", "DASHBOARD_VIEW"),
            DrawerItem("Purchase Report", Icons.Default.ShoppingCart, "purchase_report", "DASHBOARD_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER)),
            DrawerItem("GSTR-1", Icons.Default.AccountBalance, "gstr1_report", "DASHBOARD_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)),
            DrawerItem("Monthly Report", Icons.Default.CalendarMonth, "monthly_report", "DASHBOARD_VIEW"),
        )
    ),
    DrawerSection(
        title = "Intelligence",
        items = listOf(
            DrawerItem("AI Assistant", Icons.AutoMirrored.Filled.Chat, "ai_chat"),
            DrawerItem("Inventory Intelligence", Icons.Default.Psychology, "inventory_intelligence", "INVENTORY_VIEW"),
            DrawerItem("Shrinkage Analysis", Icons.Default.TrendingDown, "shrinkage_intelligence", "INVENTORY_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Expense Intelligence", Icons.Default.Analytics, "expense_intelligence", "DASHBOARD_VIEW"),
            DrawerItem("Compatibility", Icons.Default.DevicesOther, "compatibility"),
        )
    ),
    DrawerSection(
        title = "Operations",
        items = listOf(
            DrawerItem("Repair Knowledge", Icons.Default.Build, "repair_knowledge"),
            DrawerItem("Stock Verification", Icons.Default.FactCheck, "stock_verification", "INVENTORY_MANAGE",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERVISOR)),
            DrawerItem("WhatsApp", Icons.AutoMirrored.Filled.Chat, "whatsapp_dashboard", "REPAIR_MANAGE"),
        )
    ),
    DrawerSection(
        title = "Administration",
        items = listOf(
            DrawerItem("Shops", Icons.Default.Store, "shop_management", "SHOP_MANAGE",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN)),
            DrawerItem("Staff", Icons.Default.People, "staff", "STAFF_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Approvals", Icons.Default.Approval, "approvals", "STAFF_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Settings", Icons.Default.Settings, "settings"),
        )
    )
)

@Composable
fun AppDrawerContent(
    currentRoute: String?,
    appState: AppState,
    onItemClick: (String) -> Unit,
    onLogout: () -> Unit,
    onClose: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val isDark = ThemeState.isDarkMode ?: isSystemInDarkTheme()

    val currentRole = when (appState) {
        is AppState.Owner -> appState.role
        is AppState.Staff -> appState.role
        else -> null
    }
    val isSystemOwner = when (appState) {
        is AppState.Owner -> appState.isSystemOwner
        is AppState.Staff -> appState.isSystemOwner
        else -> false
    }

    val sections = remember(appState) {
        buildDrawerSections().mapNotNull { section ->
            val visibleItems = section.items.filter { item ->
                val permOk = item.requiredPermission == null || appState.hasPermission(item.requiredPermission)
                val roleOk = item.allowedRoles == null || isSystemOwner ||
                    (currentRole != null && item.allowedRoles.contains(currentRole))
                permOk && roleOk
            }
            if (visibleItems.isEmpty()) null else section.copy(items = visibleItems)
        }
    }

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
                        listOf(colorScheme.primary.copy(alpha = 0.08f), Color.Transparent)
                    )
                )
                .padding(top = 48.dp, bottom = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
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
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.height(8.dp))
            Image(
                painter = painterResource(id = R.drawable.mobibix_logo),
                contentDescription = "MobiBix Logo",
                modifier = Modifier.size(56.dp),
                contentScale = ContentScale.Fit
            )
            Spacer(Modifier.height(4.dp))
            Text("MOBIBIX", color = colorScheme.primary, fontSize = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 3.sp)

            // Role badge
            if (currentRole != null) {
                Spacer(Modifier.height(4.dp))
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = colorScheme.primary.copy(alpha = 0.12f)
                ) {
                    Text(
                        currentRole,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colorScheme.primary
                    )
                }
            }
        }

        HorizontalDivider(color = colorScheme.outlineVariant, thickness = 1.dp, modifier = Modifier.padding(horizontal = 16.dp))

        // ── Sectioned Nav Items ──
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
        ) {
            sections.forEach { section ->
                item {
                    Text(
                        section.title.uppercase(),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        letterSpacing = 1.5.sp
                    )
                }
                items(section.items) { item ->
                    DrawerNavItem(
                        item = item,
                        isSelected = currentRoute == item.route,
                        onClick = {
                            onItemClick(item.route)
                            onClose()
                        }
                    )
                }
                item { Spacer(Modifier.height(4.dp)) }
            }
        }

        // ── Logout ──
        HorizontalDivider(color = colorScheme.outlineVariant, thickness = 1.dp, modifier = Modifier.padding(horizontal = 16.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onLogout() }
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Logout", tint = colorScheme.error, modifier = Modifier.size(22.dp))
            Text("Logout", color = colorScheme.error, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun DrawerNavItem(item: DrawerItem, isSelected: Boolean, onClick: () -> Unit) {
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
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Icon(item.icon, contentDescription = item.label, tint = iconColor, modifier = Modifier.size(20.dp))
        Text(item.label, color = textColor, fontSize = 14.sp, fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal)
    }
}
