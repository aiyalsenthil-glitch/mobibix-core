package com.aiyal.mobibix.ui.features.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.filled.*
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.*
import com.aiyal.mobibix.ui.components.AuroraBackground
import com.aiyal.mobibix.ui.components.GlassCard

// ── Color constants for premium design ──
private val BrandPrimary = Color(0xFF00C896)
private val AppBackground = Color(0xFFF8F9FA)
private val SurfaceWhite = Color(0xFFFFFFFF)
private val TextPrimary = Color(0xFF0F172A)
private val TextSecondary = Color(0xFF64748B)
private val SuccessColor = Color(0xFF10B981)
private val DangerColor = Color(0xFFEF4444)
private val WarningColor = Color(0xFFF59E0B)
private val InfoColor = Color(0xFF3B82F6)
private val MutedText = Color(0xFF9CA3AF)

@OptIn(ExperimentalMaterial3Api::class)
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
    if (state.loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AuroraBackground()
            CircularProgressIndicator(color = BrandPrimary)
        }
        return
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AuroraBackground()
        
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 100.dp)
        ) {
            // 1. Dashboard Header
            item {
                DashboardHeader(
                    state = state,
                    onShopSelected = onShopSelected,
                    onOpenDrawer = onOpenDrawer,
                    onNavigateToReports = onNavigateToReports
                )
            }

            // 2. Operational Alerts Section
            if (state.negativeStock > 0 || state.inProgress > 0) {
                item {
                    Spacer(Modifier.height(16.dp))
                    OperationalAlerts(
                        pendingJobs = state.inProgress,
                        negativeStock = state.negativeStock,
                        onJobsClick = onNavigateToJobs,
                        onStockClick = onNavigateToNegativeStock
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }

            // 3. Main KPI Card Design (2x2 Grid)
            item {
                BusinessPerformanceKpi(state = state)
            }

            item { Spacer(Modifier.height(20.dp)) }

            // 4. Today Revenue & Profit
            item {
                TodayFinancials(
                    todaySales = state.todaySales,
                    onNavigateToNewSale = onNavigateToNewSale
                )
            }

            item { Spacer(Modifier.height(20.dp)) }

            // 5. Revenue Trend Chart
            item {
                DailyRevenueChart(data = state.salesTrend)
            }

            item { Spacer(Modifier.height(20.dp)) }

            // 6. Payment Collection Chart
            if (state.paymentStats.isNotEmpty()) {
                item {
                    PaymentModeChart(data = state.paymentStats)
                }
            }

            item { Spacer(Modifier.height(20.dp)) }

            // 7. Operations Cards
            item {
                Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                    Text("QUICK OPERATIONS", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(Modifier.height(12.dp))
                    
                    PremiumOperationsCard(
                        title = "Inventory Management",
                        icon = Icons.Default.Inventory,
                        stats = listOf("Total Products: ${state.totalProducts}", "Dead Stock: ${state.deadStock}"),
                        accentColor = WarningColor,
                        onClick = onNavigateToInventory
                    )
                    
                    Spacer(Modifier.height(12.dp))
                    
                    PremiumOperationsCard(
                        title = "Service & Repairs",
                        icon = Icons.Default.Build,
                        stats = listOf("Waiting Parts: ${state.waitingParts}", "Ready: ${state.ready}"),
                        accentColor = InfoColor,
                        onClick = onNavigateToJobs
                    )
                }
            }
        }
    }
}

@Composable
fun DashboardHeader(
    state: OwnerDashboardState,
    onShopSelected: (String?) -> Unit,
    onOpenDrawer: () -> Unit,
    onNavigateToReports: () -> Unit
) {
    var showShopSelector by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 20.dp)
    ) {
        // Top row: Menu & Switcher
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onOpenDrawer, modifier = Modifier.offset(x = (-12).dp)) {
                Icon(Icons.Default.Menu, contentDescription = "Menu", tint = MaterialTheme.colorScheme.onSurface)
            }
            
            Box {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable { showShopSelector = true }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = state.shops.find { it.id == state.selectedShopId }?.name ?: "All Businesses",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    }
                }
                DropdownMenu(expanded = showShopSelector, onDismissRequest = { showShopSelector = false }) {
                    DropdownMenuItem(text = { Text("All Businesses") }, onClick = { onShopSelected(null); showShopSelector = false })
                    state.shops.forEach { shop ->
                        DropdownMenuItem(text = { Text(shop.name) }, onClick = { onShopSelected(shop.id); showShopSelector = false })
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Text(
            "Overview",
            style = MaterialTheme.typography.headlineMedium.copy(fontSize = 28.sp),
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            "Monitor your performance in real-time",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(Modifier.height(24.dp))

        var isPressed by remember { mutableStateOf(false) }
        val scale by animateFloatAsState(
            targetValue = if (isPressed) 0.95f else 1f,
            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
            label = "scale"
        )

        Button(
            onClick = onNavigateToReports,
            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary, contentColor = Color.White),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) {
                    isPressed = true
                    onNavigateToReports()
                },
            contentPadding = PaddingValues(0.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                Text("Detailed Reports", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
fun OperationalAlerts(pendingJobs: Int, negativeStock: Int, onJobsClick: () -> Unit, onStockClick: () -> Unit) {
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text("ACTION REQUIRED", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        var expanded by remember { mutableStateOf(true) }
        
        GlassCard(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = WarningColor)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${(if(pendingJobs>0) 1 else 0) + (if(negativeStock>0) 1 else 0)} Alerts found", 
                        fontWeight = FontWeight.Bold, 
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(Modifier.weight(1f))
                    Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                
                AnimatedVisibility(visible = expanded) {
                    Column(modifier = Modifier.padding(top = 16.dp)) {
                        if (negativeStock > 0) {
                            AlertItem(
                                icon = Icons.Default.Inventory,
                                text = "$negativeStock items have negative stock",
                                onClick = onStockClick,
                                color = DangerColor
                            )
                        }
                        if (pendingJobs > 0) {
                            if (negativeStock > 0) Spacer(Modifier.height(12.dp))
                            AlertItem(
                                icon = Icons.Default.Build,
                                text = "$pendingJobs jobs pending/delayed",
                                onClick = onJobsClick,
                                color = WarningColor
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
            .background(color.copy(alpha = 0.05f))
            .padding(12.dp)
    ) {
        Surface(shape = CircleShape, color = color.copy(alpha=0.15f), modifier = Modifier.size(32.dp)) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.padding(6.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
    }
}

@Composable
fun BusinessPerformanceKpi(state: OwnerDashboardState) {
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())
    
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Business Performance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.weight(1f))
                Surface(color = BrandPrimary.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                    Text("This Month", style = MaterialTheme.typography.labelSmall, color = BrandPrimary, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontWeight = FontWeight.Bold)
                }
            }
            
            Spacer(Modifier.height(24.dp))
            
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Revenue", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        currencyFormatter.format(state.monthSales),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                
                Column(modifier = Modifier.weight(1f)) {
                    Text("Growth", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(Modifier.height(4.dp))
                    val isPositive = state.percentageChange >= 0
                    val growthColor = if (isPositive) SuccessColor else DangerColor
                    val growthIcon = if (isPositive) Icons.AutoMirrored.Filled.TrendingUp else Icons.AutoMirrored.Filled.TrendingDown
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = CircleShape, color = growthColor.copy(alpha=0.1f), modifier = Modifier.size(24.dp)) {
                            Icon(growthIcon, contentDescription = null, tint = growthColor, modifier = Modifier.padding(4.dp))
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "${String.format("%.1f", state.percentageChange)}%",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = growthColor
                        )
                    }
                }
            }
            
            Spacer(Modifier.height(24.dp))
            HorizontalDivider(color = AppBackground, thickness = 2.dp)
            Spacer(Modifier.height(24.dp))
            
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Collection Rate", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(4.dp))
                    Text("100%", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Spacer(Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { 1f },
                        modifier = Modifier
                            .height(4.dp)
                            .width(60.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = SuccessColor,
                        trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
                    )
                }
                
                Column(modifier = Modifier.weight(1f)) {
                    Text("Active Jobs", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${state.inProgress}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        if (state.inProgress > 0) {
                            Spacer(Modifier.width(8.dp))
                            Surface(color = WarningColor, shape = CircleShape) {
                                Text(
                                    "Pending", 
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp), 
                                    color = Color.White, 
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), 
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
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())
    val profit = todaySales * 0.3

    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text("TODAY'S SNAPSHOT", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(12.dp))
        
        if (todaySales <= 0.0) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(32.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Surface(shape = CircleShape, color = BrandPrimary.copy(alpha = 0.1f), modifier = Modifier.size(64.dp)) {
                        Icon(Icons.Default.AddShoppingCart, contentDescription = null, tint = BrandPrimary, modifier = Modifier.padding(16.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("No sales yet today", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text("Start by creating your first sale.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(20.dp))
                    Button(onClick = onNavigateToNewSale, colors = ButtonDefaults.buttonColors(containerColor = TextPrimary), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text("Create Sale")
                    }
                }
            }
        } else {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                GlassCard(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Surface(shape = CircleShape, color = BrandPrimary.copy(alpha=0.15f), modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.AttachMoney, contentDescription = null, tint = BrandPrimary, modifier = Modifier.padding(8.dp))
                        }
                        Spacer(Modifier.height(12.dp))
                        Text("Revenue", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(currencyFormatter.format(todaySales), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
                GlassCard(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Surface(shape = CircleShape, color = InfoColor.copy(alpha=0.15f), modifier = Modifier.size(40.dp)) {
                            Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, tint = InfoColor, modifier = Modifier.padding(8.dp))
                        }
                        Spacer(Modifier.height(12.dp))
                        Text("Profit (Est)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(currencyFormatter.format(profit), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumOperationsCard(title: String, icon: ImageVector, stats: List<String>, accentColor: Color, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable { onClick() }) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = accentColor.copy(alpha = 0.12f), shape = RoundedCornerShape(14.dp), modifier = Modifier.size(48.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(4.dp))
                Text(stats.joinToString(" • "), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(24.dp))
        }
    }
}
