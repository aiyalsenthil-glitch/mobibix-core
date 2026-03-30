package com.aiyal.mobibix.ui.features.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.data.network.Shop
import com.aiyal.mobibix.ui.components.GlassCard
import com.aiyal.mobibix.ui.components.PremiumTopBar
import java.text.NumberFormat
import java.util.*

enum class DashboardCategory { Marketing, Sales, Finance, Inventory, Staff }

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
    var selectedCategory by remember { mutableStateOf(DashboardCategory.Sales) }
    val colorScheme = MaterialTheme.colorScheme

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colorScheme.background)
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

        // --- Scrollable Analytics Section ---
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
        ) {
            // Category Specific Content
            when (selectedCategory) {
                DashboardCategory.Sales -> salesDashboardContent(state, onNavigateToReports)
                DashboardCategory.Finance -> financeDashboardContent(state)
                else -> {
                    item {
                        MainBalanceDisplay(
                            amount = state.monthSales,
                            percentageChange = state.percentageChange,
                            changeAmount = (state.monthSales * (state.percentageChange / 100))
                        )
                        Spacer(Modifier.height(32.dp))
                        TimeFilterTabs()
                        Spacer(Modifier.height(32.dp))
                        PremiumBarChart(data = state.salesTrend)
                    }
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
        MainBalanceDisplay(
            amount = state.monthSales,
            percentageChange = state.percentageChange,
            changeAmount = (state.monthSales * (state.percentageChange / 100))
        )
        Spacer(Modifier.height(32.dp))
    }

    item {
        TimeFilterTabs()
        Spacer(Modifier.height(32.dp))
    }

    item {
        ConversionMetricCard()
        Spacer(Modifier.height(32.dp))
    }

    item {
        PremiumBarChart(data = state.salesTrend)
        Spacer(Modifier.height(32.dp))
    }

    item {
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
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
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
                MetricItem("3,280", "Visitors")
                MetricItem("394", "Leads")
                MetricItem("280", "Payment")
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
                Text("Costs by department", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
            }
            Spacer(Modifier.height(24.dp))
            
            DepartmentProgressItem("Development", "₹ 16,56,000", 0.8f)
            Spacer(Modifier.height(16.dp))
            DepartmentProgressItem("Management", "₹ 12,37,000", 0.6f)
            Spacer(Modifier.height(16.dp))
            DepartmentProgressItem("Inventory", "₹ 5,67,000", 0.3f)
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
    val selectedShopName = shops.find { it.id == selectedShopId }?.name ?: "All Businesses"
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
            color = colorScheme.onBackground,
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
            DropdownMenuItem(
                text = { Text("All Businesses") }, 
                onClick = { onShopSelected(null); showShopSelector = false }
            )
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
    changeAmount: Double
) {
    val currencyFormatter = remember {
        NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")).apply {
            maximumFractionDigits = 0
        }
    }
    
    Column {
        Text(
            currencyFormatter.format(amount).replace("₹", "₹ "),
            style = MaterialTheme.typography.displayMedium.copy(
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-1.5).sp
            ),
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            val isPositive = percentageChange >= 0
            val color = if (isPositive) MaterialTheme.colorScheme.primary else Color(0xFFEF4444)
            Text(
                "${if (isPositive) "+" else ""}${currencyFormatter.format(changeAmount).replace("₹", "₹ ")} (${String.format("%.1f", percentageChange)}%)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = color
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
