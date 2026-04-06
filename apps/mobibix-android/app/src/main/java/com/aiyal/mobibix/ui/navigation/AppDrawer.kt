package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.AssignmentReturn
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.FactCheck
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.TrendingDown
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
    val allowedRoles: List<String>? = null
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
            DrawerItem("Sales Return", Icons.AutoMirrored.Filled.AssignmentReturn, "sales_return", "SALES_VIEW"),
            DrawerItem("Quotations", Icons.Default.Description, "quotations", "SALES_VIEW"),
            DrawerItem("Trade-in / Buyback", Icons.Default.SwapHoriz, "trade_in", "SALES_VIEW"),
            DrawerItem("Consumer Finance", Icons.Default.AccountBalance, "consumer_finance", "SALES_VIEW"),
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
            DrawerItem("Purchase Orders", Icons.Default.ShoppingBasket, "purchase_orders", "INVENTORY_MANAGE"),
            DrawerItem("GRNs", Icons.Default.Inventory, "grns", "INVENTORY_MANAGE"),
            DrawerItem("Purchases", Icons.Default.ShoppingCart, "purchases", "INVENTORY_MANAGE"),
            DrawerItem("Stock Ledger", Icons.Default.Inventory2, "stock_ledger", "INVENTORY_VIEW"),
            DrawerItem("Barcode Labels", Icons.Default.QrCode, "barcode_labels", "INVENTORY_VIEW"),
        )
    ),
    DrawerSection(
        title = "Finance",
        items = listOf(
            DrawerItem("Payments", Icons.Default.CreditCard, "finance", "SALES_VIEW"),
            DrawerItem("Sales Receipts", Icons.Default.Receipt, "receipts", "SALES_VIEW"),
            DrawerItem("Payment Vouchers", Icons.Default.Money, "vouchers", "SALES_VIEW"),
            DrawerItem("Expenses", Icons.Default.AccountBalanceWallet, "expenses", "SALES_VIEW"),
            DrawerItem("E-Way Bills", Icons.Default.LocalShipping, "eway_bill", "SALES_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER)),
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
            // Web: AI features restricted to OWNER/MANAGER only (not ADMIN)
            DrawerItem("AI Assistant", Icons.AutoMirrored.Filled.Chat, "ai_chat",
                allowedRoles = listOf(UserRole.OWNER, UserRole.MANAGER)),
            DrawerItem("Inventory Intelligence", Icons.Default.Psychology, "inventory_intelligence", "INVENTORY_VIEW"),
            DrawerItem("Demand Forecast", Icons.Default.Assessment, "demand_forecast", "INVENTORY_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Shrinkage Analysis", Icons.AutoMirrored.Filled.TrendingDown, "shrinkage_intelligence", "INVENTORY_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Expense Intelligence", Icons.Default.Analytics, "expense_intelligence", "DASHBOARD_VIEW"),
            // Web: requires mobile_shop.compatibility.view; blocks ACCOUNTANT role explicitly
            DrawerItem("Compatibility", Icons.Default.DevicesOther, "compatibility", "INVENTORY_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER,
                    UserRole.STAFF, UserRole.TECHNICIAN, UserRole.SUPERVISOR)),
        )
    ),
    DrawerSection(
        title = "Operations",
        items = listOf(
            // Repair knowledge base — for technical staff, not accountants
            DrawerItem("Repair Knowledge", Icons.Default.Build, "repair_knowledge", "REPAIR_MANAGE"),
            DrawerItem("Stock Verification", Icons.AutoMirrored.Filled.FactCheck, "stock_verification", "INVENTORY_MANAGE",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERVISOR)),
            DrawerItem("WhatsApp", Icons.AutoMirrored.Filled.Chat, "whatsapp_dashboard", "SALES_VIEW"),
        )
    ),
    DrawerSection(
        title = "Administration",
        items = listOf(
            DrawerItem("Shops", Icons.Default.Store, "shop_management", "SHOP_MANAGE",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN)),
            DrawerItem("Staff", Icons.Default.People, "staff", "STAFF_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Commissions", Icons.Default.MonetizationOn, "commission", "STAFF_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Approvals", Icons.Default.Approval, "approvals", "STAFF_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)),
            DrawerItem("Roles & Permissions", Icons.Default.AdminPanelSettings, "role_list", "STAFF_VIEW",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN)),
            // Web: Settings requires core.settings.manage — OWNER/ADMIN only
            DrawerItem("Settings", Icons.Default.Settings, "settings", "SHOP_MANAGE",
                allowedRoles = listOf(UserRole.OWNER, UserRole.ADMIN)),
        )
    )
)

// Brand teal accent colors — matches TopAppBar and website
private val GlassAccent = Color(0xFF14B8A6)       // Brand Teal
private val GlassAccentAlt = Color(0xFF0D9488)    // Teal Dark
private val GlassSurface = Color(0xFF0D1F1E)
private val GlassBorder = Color(0x33FFFFFF)
private val GlassSelected = Color(0xFF14B8A6)

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

    val isDistributor = appState.isDistributorUser

    val sections = remember(appState) {
        val base = buildDrawerSections().mapNotNull { section ->
            val visibleItems = section.items.filter { item ->
                val permOk = item.requiredPermission == null || appState.hasPermission(item.requiredPermission)
                val roleOk = item.allowedRoles == null || isSystemOwner ||
                    (currentRole != null && item.allowedRoles.contains(currentRole))
                permOk && roleOk
            }
            if (visibleItems.isEmpty()) null else section.copy(items = visibleItems)
        }.toMutableList()

        // Add distributor section for users who are BOTH distributor+ERP
        if (isDistributor && (appState is AppState.Owner || appState is AppState.Staff)) {
            base.add(0, DrawerSection(
                title = "Distributor Network",
                items = listOf(
                    DrawerItem("Distributor Hub", Icons.Default.Hub, "distributor_dashboard", null)
                )
            ))
        }
        base
    }

    // Drawer background: glass-style gradient
    val drawerBg = if (isDark) {
        Brush.verticalGradient(
            listOf(
                Color(0xFF0F0F1A),
                Color(0xFF141428),
                Color(0xFF0A0A15)
            )
        )
    } else {
        Brush.verticalGradient(
            listOf(
                Color(0xFFFFFFFF),
                Color(0xFFF0FDFB),
                Color(0xFFFFFFFF)
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxHeight()
            .width(288.dp)
            .background(drawerBg)
            .border(
                width = 1.dp,
                brush = Brush.verticalGradient(
                    listOf(
                        if (isDark) Color(0x40FFFFFF) else Color(0x20000000),
                        Color.Transparent
                    )
                ),
                shape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp)
            )
    ) {
        // ── Header ──────────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        listOf(
                            GlassAccent.copy(alpha = if (isDark) 0.25f else 0.12f),
                            GlassAccentAlt.copy(alpha = if (isDark) 0.15f else 0.08f),
                            Color.Transparent
                        )
                    )
                )
                .padding(top = 52.dp, bottom = 20.dp, start = 16.dp, end = 16.dp)
        ) {
            Column {
                // Theme toggle + close row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Theme toggle
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(
                                if (isDark) Color(0x26FFFFFF) else Color(0x14000000)
                            )
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            if (isDark) Icons.Default.DarkMode else Icons.Default.LightMode,
                            contentDescription = null,
                            tint = if (isDark) Color(0xFFB0B0FF) else GlassAccent,
                            modifier = Modifier.size(16.dp)
                        )
                        Switch(
                            checked = isDark,
                            onCheckedChange = { ThemeState.isDarkMode = it },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = GlassAccent,
                                uncheckedThumbColor = GlassAccent,
                                uncheckedTrackColor = GlassAccent.copy(alpha = 0.25f)
                            ),
                            modifier = Modifier.height(24.dp)
                        )
                    }
                    IconButton(
                        onClick = onClose,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(if (isDark) Color(0x26FFFFFF) else Color(0x14000000))
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Close",
                            tint = if (isDark) Color(0xCCFFFFFF) else Color(0x99000000),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Logo + App name
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(GlassAccent, GlassAccentAlt)
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.mobibix_logo),
                            contentDescription = "MobiBix Logo",
                            modifier = Modifier.size(32.dp),
                            contentScale = ContentScale.Fit
                        )
                    }
                    Column {
                        Text(
                            "MOBIBIX",
                            color = if (isDark) Color.White else Color(0xFF1A1A3E),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 2.sp
                        )
                        Text(
                            "Mobile Repair Suite",
                            color = if (isDark) Color(0x99FFFFFF) else Color(0x99000000),
                            fontSize = 11.sp,
                            letterSpacing = 0.5.sp
                        )
                    }
                }

                // Role badge
                if (currentRole != null) {
                    Spacer(Modifier.height(12.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                Brush.horizontalGradient(
                                    listOf(
                                        GlassAccent.copy(alpha = 0.3f),
                                        GlassAccentAlt.copy(alpha = 0.2f)
                                    )
                                )
                            )
                            .border(
                                1.dp,
                                GlassAccent.copy(alpha = 0.4f),
                                RoundedCornerShape(8.dp)
                            )
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            currentRole,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isDark) Color(0xFFB0B0FF) else GlassAccent,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }

        // Subtle separator
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Color.Transparent,
                            GlassAccent.copy(alpha = 0.4f),
                            GlassAccentAlt.copy(alpha = 0.3f),
                            Color.Transparent
                        )
                    )
                )
        )

        // ── Nav Items ────────────────────────────────────────────────────────
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
        ) {
            sections.forEach { section ->
                item {
                    Row(
                        modifier = Modifier.padding(start = 8.dp, top = 16.dp, bottom = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .width(16.dp)
                                .height(1.5.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(GlassAccent.copy(alpha = 0.7f), Color.Transparent)
                                    ),
                                    RoundedCornerShape(2.dp)
                                )
                        )
                        Text(
                            section.title.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isDark) Color(0x80B0B0FF) else GlassAccent.copy(alpha = 0.6f),
                            letterSpacing = 1.5.sp
                        )
                    }
                }
                items(section.items) { item ->
                    GlassDrawerNavItem(
                        item = item,
                        isSelected = currentRoute == item.route,
                        isDark = isDark,
                        onClick = {
                            onItemClick(item.route)
                            onClose()
                        }
                    )
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }

        // ── Logout ──────────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Color.Transparent,
                            Color(0xFFEF4444).copy(alpha = 0.3f),
                            Color.Transparent
                        )
                    )
                )
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onLogout() }
                .padding(horizontal = 24.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFFEF4444).copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.Logout,
                    contentDescription = "Logout",
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(18.dp)
                )
            }
            Text(
                "Logout",
                color = Color(0xFFEF4444),
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun GlassDrawerNavItem(
    item: DrawerItem,
    isSelected: Boolean,
    isDark: Boolean,
    onClick: () -> Unit
) {
    val selectedBg = if (isDark) {
        Brush.horizontalGradient(
            listOf(
                GlassAccent.copy(alpha = 0.25f),
                GlassAccentAlt.copy(alpha = 0.15f),
                Color.Transparent
            )
        )
    } else {
        Brush.horizontalGradient(
            listOf(
                GlassAccent.copy(alpha = 0.12f),
                GlassAccentAlt.copy(alpha = 0.06f),
                Color.Transparent
            )
        )
    }

    val textColor = when {
        isSelected -> if (isDark) Color(0xFFB0B0FF) else GlassAccent
        isDark -> Color(0xCCFFFFFF)
        else -> Color(0xCC1A1A3E)
    }

    val iconBg = when {
        isSelected -> Brush.linearGradient(listOf(GlassAccent, GlassAccentAlt))
        isDark -> Brush.linearGradient(listOf(Color(0x26FFFFFF), Color(0x1AFFFFFF)))
        else -> Brush.linearGradient(listOf(Color(0x14000000), Color(0x0A000000)))
    }

    val iconTint = when {
        isSelected -> Color.White
        isDark -> Color(0x99FFFFFF)
        else -> Color(0x99000000)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clip(RoundedCornerShape(12.dp))
            .then(
                if (isSelected) Modifier.background(selectedBg) else Modifier
            )
            .then(
                if (isSelected) Modifier.border(
                    1.dp,
                    GlassAccent.copy(alpha = if (isDark) 0.3f else 0.2f),
                    RoundedCornerShape(12.dp)
                ) else Modifier
            )
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Icon container
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(iconBg),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                item.icon,
                contentDescription = item.label,
                tint = iconTint,
                modifier = Modifier.size(17.dp)
            )
        }

        Text(
            item.label,
            color = textColor,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            modifier = Modifier.weight(1f)
        )

        // Selected indicator dot
        if (isSelected) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(GlassAccent)
            )
        }
    }
}
