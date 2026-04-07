package com.aiyal.mobibix.ui.features.home

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import com.aiyal.mobibix.data.network.Shop
import com.aiyal.mobibix.ui.components.GlassCard
import com.aiyal.mobibix.ui.components.PremiumTopBar
import java.text.NumberFormat
import java.util.*

enum class DashboardCategory { Sales, Repairs, Inventory, Staff, Finance }

@Composable
fun OwnerDashboardScreen(
    state: OwnerDashboardState,
    onShopSelected: (String?) -> Unit,
    onNavigateToJobs: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToNegativeStock: () -> Unit = {},
    onNavigateToNewSale: () -> Unit,
    onNavigateToNewPurchase: () -> Unit,
    onNavigateToAddCustomer: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onOpenDrawer: () -> Unit = {}
) {
    var selectedCategory by remember { mutableStateOf(DashboardCategory.Sales) }
    val colorScheme = MaterialTheme.colorScheme

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC)) // High-end soft background
    ) {
        // --- Compact Integrated Header ---
        PremiumTopBar(
            onNavigationClick = onOpenDrawer,
            customContent = {
                ShopSelector(
                    selectedShopId = state.selectedShopId,
                    shops = state.shops,
                    onShopSelected = onShopSelected
                )
            }
        )

        CategoryTabs(
            selectedCategory = selectedCategory,
            onCategorySelected = { selectedCategory = it },
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
        )

        HorizontalDivider(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            color = colorScheme.outlineVariant.copy(alpha = 0.3f),
            thickness = 0.5.dp
        )

        // --- Adaptive Analytics Section ---
        val isEmpty = state.monthSales == 0.0

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 100.dp)
        ) {
            item {
                MainBalanceDisplay(
                    amount = state.monthSales,
                    percentageChange = state.percentageChange,
                    changeAmount = (state.monthSales * (state.percentageChange / 100)),
                    isEmpty = isEmpty,
                    onAddSale = onNavigateToNewSale,
                    onAddCustomer = onNavigateToAddCustomer
                )
            }

            if (isEmpty) {
                // --- EMPTY STATE CONTENT ---
                item {
                    MiniStatsRow()
                }
                item {
                    Spacer(Modifier.height(16.dp))
                    EmptyStateGuidance()
                }
                item {
                    QuickActionsGrid(
                        onAddSale = onNavigateToNewSale,
                        onAddCustomer = onNavigateToAddCustomer,
                        onViewReports = onNavigateToReports,
                        onSendReminder = { /* Placeholder */ }
                    )
                }
            } else {
                // --- DATA STATE CONTENT ---
                item {
                    CategoryTabs(
                        selectedCategory = selectedCategory,
                        onCategorySelected = { selectedCategory = it },
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)
                    )
                }

                // Category Specific Content
                when (selectedCategory) {
                    DashboardCategory.Sales -> salesDashboardContent(state, onNavigateToReports)
                    DashboardCategory.Repairs -> repairsDashboardContent(state, onNavigateToJobs)
                    DashboardCategory.Inventory -> inventoryDashboardContent(state, onNavigateToInventory)
                    DashboardCategory.Staff -> staffDashboardContent(state)
                    DashboardCategory.Finance -> financeDashboardContent(state)
                }
            }
            
            // Operational Alerts
            if (state.negativeStock > 0 || state.inProgress > 0) {
                 item {
                     Spacer(Modifier.height(40.dp))
                     OperationalAlertsSection(
                         pendingJobs = state.inProgress,
                         negativeStock = state.negativeStock,
                         onJobsClick = onNavigateToJobs,
                         onStockClick = onNavigateToNegativeStock
                     )
                     Spacer(Modifier.height(100.dp)) // Extra space for bottom nav
                 }
            } else {
                 item { Spacer(Modifier.height(100.dp)) }
            }
        }
    }
}

private fun LazyListScope.salesDashboardContent(
    state: OwnerDashboardState,
    onNavigateToReports: () -> Unit
) {
    item {
        Column(Modifier.padding(horizontal = 24.dp)) {
            TimeFilterTabs()
            Spacer(Modifier.height(32.dp))
            ConversionMetricCard()
            Spacer(Modifier.height(32.dp))
            PremiumBarChart(data = state.salesTrend)
            Spacer(Modifier.height(32.dp))
            Button(
                onClick = onNavigateToReports,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                Text("View Detailed Reports", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

private fun LazyListScope.repairsDashboardContent(
    state: OwnerDashboardState,
    onNavigateToJobs: () -> Unit
) {
    item {
        Column(Modifier.padding(horizontal = 24.dp)) {
            Text("REPAIR PIPELINE", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricCard(Modifier.weight(1f), "12", "Pending", Color(0xFFF59E0B))
                MetricCard(Modifier.weight(1f), "5", "Ready", Color(0xFF10B981))
                MetricCard(Modifier.weight(1f), "8", "Delivered", Color(0xFF3B82F6))
            }
            Spacer(Modifier.height(32.dp))
            Button(
                onClick = onNavigateToJobs,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Manage Repair Jobs", fontWeight = FontWeight.Bold)
            }
        }
    }
}

private fun LazyListScope.inventoryDashboardContent(
    state: OwnerDashboardState,
    onNavigateToInventory: () -> Unit
) {
    item {
        Column(Modifier.padding(horizontal = 24.dp)) {
            Text("STOCK SUMMARY", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(16.dp))
            DepartmentProgressItem("Premium Phones", "12 Units", 0.4f)
            Spacer(Modifier.height(12.dp))
            DepartmentProgressItem("Accessories", "450 Units", 0.9f)
            Spacer(Modifier.height(12.dp))
            DepartmentProgressItem("Spare Parts", "1,200 Units", 0.7f)
            
            Spacer(Modifier.height(32.dp))
            Button(
                onClick = onNavigateToInventory,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
            ) {
                Text("View Full Inventory", fontWeight = FontWeight.Bold)
            }
        }
    }
}

private fun LazyListScope.staffDashboardContent(state: OwnerDashboardState) {
    item {
        Column(Modifier.padding(horizontal = 24.dp)) {
            Text("STAFF ACTIVITY", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(16.dp))
            repeat(3) { i ->
                Row(
                    Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(32.dp).background(Color.LightGray, CircleShape))
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(if (i == 0) "Arun Kumar" else if (i == 1) "Suresh" else "Priya", fontWeight = FontWeight.Bold)
                            Text("Last active: 10m ago", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        }
                    }
                    Text(if (i == 0) "12 Sales" else if (i == 1) "5 Repairs" else "8 Invoices", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
                if (i < 2) HorizontalDivider(thickness = 0.5.dp, color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
            }
        }
    }
}

private fun LazyListScope.financeDashboardContent(state: OwnerDashboardState) {
    item {
        DepartmentCostsCard()
        Spacer(Modifier.height(32.dp))
    }

    item {
        IncomeChartCard(data = state.salesTrend)
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
fun MetricCard(modifier: Modifier, value: String, label: String, color: Color) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = color.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f))
    ) {
        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, fontSize = 24.sp, fontWeight = FontWeight.Black, color = color)
            Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = color.copy(alpha = 0.8f))
        }
    }
}

@Composable
fun CategoryTabs(
    selectedCategory: DashboardCategory,
    onCategorySelected: (DashboardCategory) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        items(DashboardCategory.entries.toTypedArray()) { category ->
            val isSelected = category == selectedCategory
            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onCategorySelected(category) }
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    category.name,
                    style = if (isSelected) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    letterSpacing = 0.2.sp
                )
                if (isSelected) {
                    Spacer(Modifier.height(4.dp))
                    Box(
                        Modifier
                            .width(12.dp)
                            .height(3.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                    )
                }
            }
        }
    }
}

@Composable
fun ConversionMetricCard() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color.White, // Pure white for premium feel
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.05f))
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Conversion Rate", 
                    color = MaterialTheme.colorScheme.onSurfaceVariant, 
                    fontSize = 13.sp, 
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.weight(1f))
                Icon(
                    Icons.AutoMirrored.Filled.TrendingUp, 
                    null, 
                    tint = MaterialTheme.colorScheme.primary, 
                    modifier = Modifier.size(14.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    "+4.5%", 
                    style = MaterialTheme.typography.labelSmall, 
                    color = MaterialTheme.colorScheme.primary, 
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(16.dp))
            
            // Refined Gradient Indicator
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.3f))
            ) {
                val accentColor = MaterialTheme.colorScheme.primary
                Canvas(Modifier.fillMaxSize()) {
                    val path = Path().apply {
                        moveTo(0f, size.height * 0.7f)
                        lineTo(size.width * 0.4f, size.height * 0.6f)
                        lineTo(size.width * 0.8f, size.height * 0.3f)
                        lineTo(size.width, size.height * 0.4f)
                        lineTo(size.width, size.height)
                        lineTo(0f, size.height)
                        close()
                    }
                    drawPath(
                        path = path,
                        brush = Brush.verticalGradient(
                            listOf(accentColor.copy(alpha = 0.4f), Color.Transparent)
                        )
                    )
                }
            }
            
            Spacer(Modifier.height(20.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                MetricItem("3,280", "Enquiries")
                MetricItem("394", "Repairs")
                MetricItem("280", "Collections")
            }
        }
    }
}

@Composable
fun MetricItem(value: String, label: String) {
    Column {
        Text(value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.ExtraBold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun DepartmentCostsCard() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Income by Category", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
            }
            Spacer(Modifier.height(24.dp))
            
            DepartmentProgressItem("Retail Sales", "₹ 16,56,000", 0.8f)
            Spacer(Modifier.height(16.dp))
            DepartmentProgressItem("Repair Services", "₹ 12,37,000", 0.6f)
            Spacer(Modifier.height(16.dp))
            DepartmentProgressItem("Part Sales", "₹ 5,67,000", 0.3f)
        }
    }
}

@Composable
fun DepartmentProgressItem(name: String, amount: String, progress: Float) {
    Column {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(name, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            Text(amount, color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(8.dp))
        Box(Modifier.fillMaxWidth().height(10.dp).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f), CircleShape)) {
            Box(
                Modifier
                    .fillMaxWidth(progress)
                    .fillMaxHeight()
                    .background(MaterialTheme.colorScheme.primary, CircleShape)
            )
        }
    }
}

@Composable
fun IncomeChartCard(data: List<DashboardTrendItem>) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
    ) {
        Column(Modifier.padding(20.dp)) {
            Text("Income Performance", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.AutoMirrored.Filled.TrendingDown, null, tint = Color(0xFFEF4444), modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(6.dp))
                Text("₹ 80.52 L (-26.3%)", style = MaterialTheme.typography.titleMedium, color = Color(0xFFEF4444), fontWeight = FontWeight.ExtraBold)
            }
            Spacer(Modifier.height(24.dp))
            PremiumLineChart(data = data, modifier = Modifier.height(160.dp))
        }
    }
}

@Composable
private fun ShopSelector(
    selectedShopId: String?,
    shops: List<Shop>,
    onShopSelected: (String?) -> Unit
) {
    var showShopSelector by remember { mutableStateOf(false) }
    val selectedShopName = shops.find { it.id == selectedShopId }?.name 
        ?: shops.firstOrNull()?.name 
        ?: "My Shop"
    val colorScheme = MaterialTheme.colorScheme

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { showShopSelector = true }
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            selectedShopName,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.ExtraBold,
            color = Color.Black, // Explicit black for contrast
            maxLines = 1
        )
        Icon(
            Icons.Default.KeyboardArrowDown,
            null,
            tint = colorScheme.primary,
            modifier = Modifier.size(20.dp)
        )

        DropdownMenu(
            expanded = showShopSelector, 
            onDismissRequest = { showShopSelector = false },
            modifier = Modifier.background(colorScheme.surface)
        ) {
            shops.forEach { shop ->
                DropdownMenuItem(
                    text = { Text(shop.name) }, 
                    onClick = { onShopSelected(shop.id); showShopSelector = false }
                )
            }
        }
    }
}

@Composable
fun MainBalanceDisplay(
    amount: Double,
    percentageChange: Double,
    changeAmount: Double,
    isEmpty: Boolean = false,
    onAddSale: () -> Unit = {},
    onAddCustomer: () -> Unit = {}
) {
    val currencyFormatter = remember {
        NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")).apply {
            maximumFractionDigits = 0
        }
    }
    
    val colorScheme = MaterialTheme.colorScheme

    Column(Modifier.padding(horizontal = 24.dp, vertical = 32.dp)) {
        // --- Dominant Revenue Figure ---
        Text(
            currencyFormatter.format(amount).replace("₹", "₹ "),
            style = MaterialTheme.typography.displayLarge.copy(
                fontWeight = FontWeight.Black,
                letterSpacing = (-2).sp,
                fontSize = 56.sp
            ),
            color = Color.Black
        )
        
        Text(
            "THIS MONTH REVENUE",
            style = MaterialTheme.typography.labelSmall,
            color = colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.5.sp
        )

        if (isEmpty) {
            Spacer(Modifier.height(32.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = onAddSale,
                    modifier = Modifier.weight(1.2f).height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = colorScheme.primary)
                ) {
                    Icon(Icons.Default.Add, null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Add Sale", fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
                OutlinedButton(
                    onClick = onAddCustomer,
                    modifier = Modifier.weight(1f).height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.5.dp, colorScheme.primary)
                ) {
                    Text("Add Customer", color = colorScheme.primary, fontWeight = FontWeight.Bold)
                }
            }
        } else {
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                val isPositive = percentageChange >= 0
                val color = if (isPositive) colorScheme.primary else Color(0xFFEF4444)
                Icon(
                    if (isPositive) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                    null,
                    tint = color,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    "${if (isPositive) "+" else ""}${currencyFormatter.format(changeAmount).replace("₹", "₹ ")} (${String.format("%.1f", percentageChange)}%)",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            }
        }
    }
}

@Composable
fun EmptyStateGuidance() {
    Surface(
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp).fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFFE8F5E9), // Premium soft green tint
        border = BorderStroke(1.dp, Color(0xFFC8E6C9))
    ) {
        Row(
            modifier = Modifier.padding(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(48.dp).background(Color.White.copy(alpha = 0.6f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = Color(0xFF2E7D32),
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(Modifier.width(20.dp))
            Text(
                "Start by adding your first customer to track sales and repair jobs precisely.",
                style = MaterialTheme.typography.bodyMedium.copy(lineHeight = 22.sp),
                color = Color(0xFF1B5E20),
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun MiniStatsRow() {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        MiniStatItem(Modifier.weight(1f), "0", "Sales")
        MiniStatItem(Modifier.weight(1f), "0", "Customers")
        MiniStatItem(Modifier.weight(1f), "0", "Repairs")
    }
}

@Composable
fun MiniStatItem(modifier: Modifier, value: String, label: String) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            value, 
            style = MaterialTheme.typography.headlineSmall, 
            fontWeight = FontWeight.Black,
            color = Color.Black
        )
        Text(
            label.uppercase(), 
            style = MaterialTheme.typography.labelSmall, 
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
    }
}

@Composable
fun QuickActionsGrid(
    onAddSale: () -> Unit,
    onAddCustomer: () -> Unit,
    onViewReports: () -> Unit,
    onSendReminder: () -> Unit
) {
    Column(Modifier.padding(24.dp)) {
        Text(
            "QUICK ACTIONS",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.2.sp
        )
        Spacer(Modifier.height(16.dp))
        
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            QuickActionItem(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.AddShoppingCart,
                label = "Add Sale",
                onClick = onAddSale
            )
            QuickActionItem(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.PersonAdd,
                label = "Add Customer",
                onClick = onAddCustomer
            )
        }
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            QuickActionItem(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Assessment,
                label = "View Reports",
                onClick = onViewReports
            )
            QuickActionItem(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.NotificationsActive,
                label = "Send Reminder",
                onClick = onSendReminder
            )
        }
    }
}

@Composable
fun QuickActionItem(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val elevation by animateDpAsState(if (isPressed) 8.dp else 2.dp, label = "elevation")
    val scale by animateFloatAsState(if (isPressed) 0.98f else 1f, label = "scale")

    Surface(
        modifier = modifier
            .height(125.dp)
            .graphicsLayer(scaleX = scale, scaleY = scale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            ),
        shape = RoundedCornerShape(24.dp),
        color = Color.White,
        shadowElevation = elevation,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.05f))
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val tintColor = when (label) {
                "Add Sale" -> Color(0xFFE3F2FD)
                "Add Customer" -> Color(0xFFF3E5F5)
                "View Reports" -> Color(0xFFFFF3E0)
                else -> Color(0xFFF1F8E9)
            }
            val iconColor = when (label) {
                "Add Sale" -> Color(0xFF1976D2)
                "Add Customer" -> Color(0xFF7B1FA2)
                "View Reports" -> Color(0xFFE65100)
                else -> Color(0xFF388E3C)
            }

            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(tintColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    null,
                    tint = iconColor,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(Modifier.height(10.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun TimeFilterTabs() {
    val filters = listOf("All time", "3 months", "12 months")
    var selectedFilter by remember { mutableStateOf("12 months") }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        filters.forEach { filter ->
            val isSelected = filter == selectedFilter
            Surface(
                modifier = Modifier.clickable { selectedFilter = filter },
                shape = RoundedCornerShape(12.dp),
                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                border = if (isSelected) null else BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.05f))
            ) {
                Text(
                    filter,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun OperationalAlertsSection(
    pendingJobs: Int,
    negativeStock: Int,
    onJobsClick: () -> Unit,
    onStockClick: () -> Unit
) {
    Column {
        Text(
            "OPERATIONAL ALERTS",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.2.sp
        )
        Spacer(Modifier.height(16.dp))
        
        if (negativeStock > 0) {
            AlertRow(
                icon = Icons.Default.Inventory,
                text = "$negativeStock items with negative stock",
                color = Color(0xFFEF4444),
                onClick = onStockClick
            )
            Spacer(Modifier.height(12.dp))
        }
        
        if (pendingJobs > 0) {
            AlertRow(
                icon = Icons.Default.Build,
                text = "$pendingJobs active jobs pending",
                color = MaterialTheme.colorScheme.primary,
                onClick = onJobsClick
            )
        }
    }
}

@Composable
fun AlertRow(icon: ImageVector, text: String, color: Color, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).clickable { onClick() },
        color = color.copy(alpha = 0.08f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(12.dp))
            Text(text, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, null, tint = color.copy(alpha = 0.5f), modifier = Modifier.size(18.dp))
        }
    }
}
