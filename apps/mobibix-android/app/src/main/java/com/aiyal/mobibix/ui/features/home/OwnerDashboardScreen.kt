package com.aiyal.mobibix.ui.features.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.ui.components.GlassCard
import java.text.NumberFormat
import java.util.*

private val BrandTeal = Color(0xFF14B8A6)

@Composable
fun OwnerDashboardScreen(
    state: OwnerDashboardState,
    onShopSelected: (String?) -> Unit,
    onNavigateToJobs: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToNegativeStock: () -> Unit = {},
    onNavigateToNewSale: () -> Unit,
    onNavigateToNewPurchase: () -> Unit,
    onNavigateToReports: () -> Unit = {},
    onOpenDrawer: () -> Unit = {}
) {
    val bg = MaterialTheme.colorScheme.background

    if (state.loading) {
        Box(
            Modifier.fillMaxSize().background(bg),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(bottom = 100.dp)
    ) {
        // Shop selector + greeting
        item {
            DashboardHeader(
                state = state,
                onShopSelected = onShopSelected,
                onNavigateToReports = onNavigateToReports
            )
        }

        // Alerts
        if (state.negativeStock > 0 || state.inProgress > 0) {
            item {
                Spacer(Modifier.height(8.dp))
                OperationalAlerts(
                    pendingJobs = state.inProgress,
                    negativeStock = state.negativeStock,
                    onJobsClick = onNavigateToJobs,
                    onStockClick = onNavigateToNegativeStock
                )
            }
        }

        item { Spacer(Modifier.height(12.dp)) }

        // KPI card
        item { BusinessPerformanceKpi(state = state) }

        item { Spacer(Modifier.height(12.dp)) }

        // Today snapshot
        item {
            TodayFinancials(
                todaySales = state.todaySales,
                onNavigateToNewSale = onNavigateToNewSale
            )
        }

        item { Spacer(Modifier.height(12.dp)) }

        // Revenue trend chart
        item { DailyRevenueChart(data = state.salesTrend) }

        // Payment mode chart
        if (state.paymentStats.isNotEmpty()) {
            item {
                Spacer(Modifier.height(12.dp))
                PaymentModeChart(data = state.paymentStats)
            }
        }

        item { Spacer(Modifier.height(12.dp)) }

        // Quick operations
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(
                    "QUICK OPERATIONS",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(Modifier.height(8.dp))
                PremiumOperationsCard(
                    title = "Inventory",
                    icon = Icons.Default.Inventory,
                    stats = listOf("Total: ${state.totalProducts}", "Dead: ${state.deadStock}"),
                    accentColor = Color(0xFFF59E0B),
                    onClick = onNavigateToInventory
                )
                Spacer(Modifier.height(8.dp))
                PremiumOperationsCard(
                    title = "Service & Repairs",
                    icon = Icons.Default.Build,
                    stats = listOf("Waiting: ${state.waitingParts}", "Ready: ${state.ready}"),
                    accentColor = Color(0xFF3B82F6),
                    onClick = onNavigateToJobs
                )
            }
        }
    }
}

@Composable
fun DashboardHeader(
    state: OwnerDashboardState,
    onShopSelected: (String?) -> Unit,
    onNavigateToReports: () -> Unit
) {
    var showShopSelector by remember { mutableStateOf(false) }
    val selectedShopName = state.shops.find { it.id == state.selectedShopId }?.name ?: "All Businesses"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Shop selector
            Box {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.clickable { showShopSelector = true }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            Icons.Default.Store,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = selectedShopName,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Icon(
                            Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                DropdownMenu(
                    expanded = showShopSelector,
                    onDismissRequest = { showShopSelector = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("All Businesses") },
                        onClick = { onShopSelected(null); showShopSelector = false }
                    )
                    state.shops.forEach { shop ->
                        DropdownMenuItem(
                            text = { Text(shop.name) },
                            onClick = { onShopSelected(shop.id); showShopSelector = false }
                        )
                    }
                }
            }

            // Reports link
            TextButton(onClick = onNavigateToReports) {
                Text(
                    "Reports",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(Modifier.width(4.dp))
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

@Composable
fun OperationalAlerts(
    pendingJobs: Int,
    negativeStock: Int,
    onJobsClick: () -> Unit,
    onStockClick: () -> Unit
) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Text(
            "ACTION REQUIRED",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
        Spacer(Modifier.height(8.dp))
        var expanded by remember { mutableStateOf(true) }

        GlassCard(modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded }) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF59E0B))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${(if (pendingJobs > 0) 1 else 0) + (if (negativeStock > 0) 1 else 0)} alerts",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(Modifier.weight(1f))
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                AnimatedVisibility(visible = expanded) {
                    Column(modifier = Modifier.padding(top = 12.dp)) {
                        if (negativeStock > 0) {
                            AlertItem(
                                icon = Icons.Default.Inventory,
                                text = "$negativeStock items with negative stock",
                                onClick = onStockClick,
                                color = Color(0xFFEF4444)
                            )
                        }
                        if (pendingJobs > 0) {
                            if (negativeStock > 0) Spacer(Modifier.height(8.dp))
                            AlertItem(
                                icon = Icons.Default.Build,
                                text = "$pendingJobs jobs pending",
                                onClick = onJobsClick,
                                color = Color(0xFFF59E0B)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AlertItem(icon: ImageVector, text: String, onClick: () -> Unit, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .background(color.copy(alpha = 0.08f))
            .padding(10.dp)
    ) {
        Surface(shape = CircleShape, color = color.copy(alpha = 0.15f), modifier = Modifier.size(30.dp)) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.padding(6.dp))
        }
        Spacer(Modifier.width(10.dp))
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f)
        )
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
    }
}

@Composable
fun BusinessPerformanceKpi(state: OwnerDashboardState) {
    val currencyFormatter = NumberFormat.getCurrencyInstance(
        Locale.Builder().setLanguage("en").setRegion("IN").build()
    )

    GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Business Performance",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(Modifier.weight(1f))
                Surface(
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        "This Month",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Revenue",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        currencyFormatter.format(state.monthSales),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Growth",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(2.dp))
                    val isPositive = state.percentageChange >= 0
                    val growthColor = if (isPositive) Color(0xFF10B981) else Color(0xFFEF4444)
                    val growthIcon = if (isPositive) Icons.AutoMirrored.Filled.TrendingUp else Icons.AutoMirrored.Filled.TrendingDown
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(growthIcon, contentDescription = null, tint = growthColor, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(
                            "${String.format("%.1f", state.percentageChange)}%",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = growthColor
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
            Spacer(Modifier.height(16.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Collection Rate",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "100%",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { 1f },
                        modifier = Modifier.height(4.dp).width(64.dp).clip(RoundedCornerShape(2.dp)),
                        color = Color(0xFF10B981),
                        trackColor = MaterialTheme.colorScheme.outlineVariant
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Active Jobs",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "${state.inProgress}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (state.inProgress > 0) {
                            Spacer(Modifier.width(6.dp))
                            Surface(
                                color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    "Pending",
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                                    color = Color(0xFFF59E0B),
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TodayFinancials(todaySales: Double, onNavigateToNewSale: () -> Unit) {
    val currencyFormatter = NumberFormat.getCurrencyInstance(
        Locale.Builder().setLanguage("en").setRegion("IN").build()
    )

    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Text(
            "TODAY'S SNAPSHOT",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
        Spacer(Modifier.height(8.dp))

        if (todaySales <= 0.0) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(24.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(
                            Icons.Default.AddShoppingCart,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(14.dp)
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "No sales yet today",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        "Start by creating your first sale.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = onNavigateToNewSale,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Text("Create Sale", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            val profit = todaySales * 0.3
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                GlassCard(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                Icons.Default.AttachMoney,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Revenue",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            currencyFormatter.format(todaySales),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
                GlassCard(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF3B82F6).copy(alpha = 0.12f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.TrendingUp,
                                contentDescription = null,
                                tint = Color(0xFF3B82F6),
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Profit (Est)",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            currencyFormatter.format(profit),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumOperationsCard(
    title: String,
    icon: ImageVector,
    stats: List<String>,
    accentColor: Color,
    onClick: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable { onClick() }) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                color = accentColor.copy(alpha = 0.12f),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.size(44.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(22.dp))
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    stats.joinToString(" · "),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
