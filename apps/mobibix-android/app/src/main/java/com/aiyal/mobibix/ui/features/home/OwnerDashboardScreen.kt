package com.aiyal.mobibix.ui.features.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.ui.theme.MobiBixTheme
import java.text.NumberFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OwnerDashboardScreen(
    state: OwnerDashboardState,
    onShopSelected: (String?) -> Unit,
    onNavigateToJobs: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToNewSale: () -> Unit,
    onNavigateToNewPurchase: () -> Unit
) {
    var showShopSelector by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Owner Dashboard", fontWeight = FontWeight.Bold) },
                actions = {
                    Box {
                        IconButton(onClick = { showShopSelector = true }) {
                            Icon(Icons.Default.Store, contentDescription = "Select Shop")
                        }
                        DropdownMenu(
                            expanded = showShopSelector,
                            onDismissRequest = { showShopSelector = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("All Shops") },
                                onClick = {
                                    onShopSelected(null)
                                    showShopSelector = false
                                }
                            )
                            state.shops.forEach { shop ->
                                DropdownMenuItem(
                                    text = { Text(shop.name) },
                                    onClick = {
                                        onShopSelected(shop.id)
                                        showShopSelector = false
                                    }
                                )
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.surface),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                item {
                    TodayFocusStrip(
                        message = when {
                            state.negativeStock > 0 -> "⚠️ Negative stock detected."
                            state.inProgress > 0 -> "🔧 ${state.inProgress} jobs are pending."
                            else -> "🟡 No sales yet today."
                        },
                        buttonText = when {
                            state.negativeStock > 0 -> "Add Purchase"
                            state.inProgress > 0 -> "View Jobs"
                            else -> "Create Sale"
                        },
                        onButtonClick = when {
                            state.negativeStock > 0 -> onNavigateToNewPurchase
                            state.inProgress > 0 -> onNavigateToJobs
                            else -> onNavigateToNewSale
                        }
                    )
                }

                item {
                    val activeShopName = state.shops.find { it.id == state.selectedShopId }?.name ?: "All Shops"
                    Text(
                        text = "Viewing: $activeShopName",
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                item {
                    HeroSalesCard(
                        todaySales = state.todaySales,
                        percentageChange = state.percentageChange
                    )
                }

                item {
                    SecondaryKpiRow(
                        monthSales = state.monthSales,
                        jobsPending = state.inProgress,
                        negativeStock = state.negativeStock
                    )
                }

                item {
                    AlertCardsSection(
                        pendingJobs = state.inProgress,
                        negativeStock = state.negativeStock,
                        onJobsClick = onNavigateToJobs,
                        onStockClick = onNavigateToInventory
                    )
                }

                item { Spacer(Modifier.height(16.dp)) }

                item {
                    SalesTrendInsightCard(trend = state.salesTrend)
                }

                if (state.paymentStats.isNotEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                Text("Payment Collection", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(16.dp))
                                PaymentModeChart(state.paymentStats)
                            }
                        }
                    }
                }

                item {
                    OperationsSummaryCard(
                        title = "Inventory",
                        icon = Icons.Default.Inventory,
                        stats = listOf("Total" to state.totalProducts.toString(), "Dead" to state.deadStock.toString()),
                        onClick = onNavigateToInventory
                    )
                }
                item {
                    OperationsSummaryCard(
                        title = "Repairs",
                        icon = Icons.Default.Build,
                        stats = listOf("Waiting" to state.waitingParts.toString(), "Ready" to state.ready.toString()),
                        onClick = onNavigateToJobs
                    )
                }
            }
        }
    }
}

@Composable
fun TodayFocusStrip(message: String, buttonText: String, onButtonClick: () -> Unit) {
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(message, style = MaterialTheme.typography.bodyMedium)
            Text(
                buttonText,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { onButtonClick() },
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun HeroSalesCard(todaySales: Double, percentageChange: Double) {
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = MaterialTheme.shapes.extraLarge,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)
    ) {
        Column(modifier = Modifier.padding(32.dp)) {
            Text("Today's Revenue", color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f))
            Spacer(Modifier.height(8.dp))
            Text(
                currencyFormatter.format(todaySales),
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onPrimary,
                fontWeight = FontWeight.ExtraBold
            )
            Spacer(Modifier.height(16.dp))
            Surface(
                color = if (percentageChange >= 0) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                shape = CircleShape
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        if (percentageChange >= 0) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = if (percentageChange >= 0) Color(0xFF2E7D32) else Color(0xFFC62828)
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        "${String.format("%.1f", Math.abs(percentageChange))}% vs yesterday",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (percentageChange >= 0) Color(0xFF2E7D32) else Color(0xFFC62828),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun SecondaryKpiRow(monthSales: Double, jobsPending: Int, negativeStock: Int) {
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        KpiChip(
            label = "Month Sales",
            value = currencyFormatter.format(monthSales),
            containerColor = Color(0xFFFFF3E0),
            contentColor = Color(0xFFE65100),
            modifier = Modifier.weight(1.5f)
        )
        KpiChip(
            label = "Jobs",
            value = jobsPending.toString(),
            containerColor = Color(0xFFE3F2FD),
            contentColor = Color(0xFF0D47A1),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun KpiChip(label: String, value: String, containerColor: Color, contentColor: Color, modifier: Modifier = Modifier) {
    Surface(
        color = containerColor,
        shape = MaterialTheme.shapes.large,
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = contentColor.copy(alpha = 0.7f))
            Text(value, style = MaterialTheme.typography.titleMedium, color = contentColor, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun AlertCardsSection(pendingJobs: Int, negativeStock: Int, onJobsClick: () -> Unit, onStockClick: () -> Unit) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (negativeStock > 0) {
            AlertCard(
                title = "Negative Stock Items",
                subtitle = "$negativeStock products have negative balance.",
                icon = Icons.Default.Warning,
                color = Color(0xFFFFF3E0),
                contentColor = Color(0xFFE65100),
                onClick = onStockClick
            )
        }
        if (pendingJobs > 0) {
            AlertCard(
                title = "Wait for Parts",
                subtitle = "$pendingJobs jobs are waiting for parts.",
                icon = Icons.Default.Info,
                color = Color(0xFFE3F2FD),
                contentColor = Color(0xFF0D47A1),
                onClick = onJobsClick
            )
        }
    }
}

@Composable
fun AlertCard(title: String, subtitle: String, icon: ImageVector, color: Color, contentColor: Color, onClick: () -> Unit) {
    Surface(
        color = color,
        shape = MaterialTheme.shapes.large,
        modifier = Modifier.fillMaxWidth().clickable { onClick() }
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = contentColor)
            Spacer(Modifier.width(16.dp))
            Column {
                Text(title, style = MaterialTheme.typography.labelLarge, color = contentColor, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = contentColor.copy(alpha = 0.7f))
            }
        }
    }
}

@Composable
fun SalesTrendInsightCard(trend: List<DashboardTrendItem>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text("Revenue Trend (Last 7 Days)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(24.dp))
            if (trend.isEmpty()) {
                Box(Modifier.height(150.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text("No trend data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                DailyRevenueChart(trend)
            }
        }
    }
}

@Composable
fun OperationsSummaryCard(title: String, icon: ImageVector, stats: List<Pair<String, String>>, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable { onClick() },
        shape = MaterialTheme.shapes.large
    ) {
        Row(modifier = Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                color = MaterialTheme.colorScheme.secondaryContainer,
                shape = CircleShape,
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
                }
            }
            Spacer(Modifier.width(24.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    stats.forEach { (label, value) ->
                        Text("$label: $value", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
        }
    }
}
