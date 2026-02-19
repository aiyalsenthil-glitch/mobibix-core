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
import androidx.compose.material.icons.filled.*
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

// ── Color constants for premium design ──
private val TealAccent = Color(0xFF00C896)
private val TealDark = Color(0xFF00A67E)
private val CardDark = Color(0xFF2A2634)
private val MutedText = Color(0xFF9CA3AF)
private val ChartLine = Color(0xFF00C896)
private val ChartFill = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OwnerDashboardScreen(
    state: OwnerDashboardState,
    onShopSelected: (String?) -> Unit,
    onNavigateToJobs: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToNewSale: () -> Unit,
    onNavigateToNewPurchase: () -> Unit,
    onNavigateToReports: () -> Unit = {},
    onOpenDrawer: () -> Unit = {}
) {
    var showShopSelector by remember { mutableStateOf(false) }
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))

    if (state.loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = TealAccent)
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        // ── Branded Header ──
        item {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = onOpenDrawer) {
                                Icon(
                                    Icons.Default.Menu,
                                    contentDescription = "Menu",
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                            Column {
                                Text(
                                    "BUSINESS",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TealAccent,
                                    letterSpacing = 1.5.sp
                                )
                                val activeShopName = state.shops.find { it.id == state.selectedShopId }?.name ?: "All Shops"
                                Text(
                                    activeShopName,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    // Dashboard title
                    Text(
                        "Dashboard Overview",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Monitor your business performance in real-time.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(Modifier.height(16.dp))

                    // Shop selector chip
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box {
                            AssistChip(
                                onClick = { showShopSelector = true },
                                label = {
                                    Text(
                                        state.shops.find { it.id == state.selectedShopId }?.name ?: "All Shops",
                                        fontWeight = FontWeight.SemiBold
                                    )
                                },
                                colors = AssistChipDefaults.assistChipColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            )
                            DropdownMenu(
                                expanded = showShopSelector,
                                onDismissRequest = { showShopSelector = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("All Shops") },
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
                        IconButton(onClick = { showShopSelector = true }) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings", modifier = Modifier.size(20.dp))
                        }
                    }

                    Spacer(Modifier.height(12.dp))

                    // Detailed Reports CTA
                    Button(
                        onClick = onNavigateToReports,
                        colors = ButtonDefaults.buttonColors(containerColor = TealAccent),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Text("Detailed Reports", fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        item { Spacer(Modifier.height(16.dp)) }

        // ── Business Performance This Month Card ──
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.TrendingUp,
                                contentDescription = null,
                                tint = TealAccent,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "Business Performance\nThis Month",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                lineHeight = 22.sp
                            )
                        }
                        Surface(
                            color = TealAccent.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                "ROI\nTRACKER",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                color = TealAccent,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                lineHeight = 14.sp
                            )
                        }
                    }

                    Spacer(Modifier.height(24.dp))

                    // KPI Grid
                    Row(modifier = Modifier.fillMaxWidth()) {
                        // Monthly Revenue
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("₹", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.width(4.dp))
                                Text("Monthly Revenue", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                currencyFormatter.format(state.monthSales),
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.ExtraBold
                            )
                            if (state.percentageChange != 0.0) {
                                Text(
                                    "vs last mo (${if (state.percentageChange >= 0) "+" else ""}${String.format("%.0f", state.percentageChange)}%)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        // Collection Rate
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.width(4.dp))
                                Text("Collection Rate", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                "100%",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.ExtraBold
                            )
                            Text(
                                "ROI on automated followups",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    Row(modifier = Modifier.fillMaxWidth()) {
                        // Jobs count
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Build, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.width(4.dp))
                                Text("Active Jobs", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                state.inProgress.toString(),
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.ExtraBold
                            )
                            Text(
                                "${state.waitingParts} waiting parts",
                                style = MaterialTheme.typography.labelSmall,
                                color = TealAccent
                            )
                        }
                        // Avg Turnaround
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.width(4.dp))
                                Text("Avg Turnaround", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    if (state.deliveredToday > 0) "${String.format("%.1f", state.todaySales / state.deliveredToday)}" else "—",
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.ExtraBold
                                )
                                Spacer(Modifier.width(4.dp))
                                Text(
                                    "days",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(bottom = 4.dp)
                                )
                            }
                            Text(
                                "Repairs completed avg time",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(16.dp)) }

        // ── Today Revenue Card ──
        item {
            PremiumMetricCard(
                title = "TODAY REVENUE",
                value = currencyFormatter.format(state.todaySales),
                subtitle = "Net sales today",
                icon = Icons.Default.AttachMoney,
                iconBgColor = TealAccent,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        item { Spacer(Modifier.height(12.dp)) }

        // ── Today Profit Card ──
        item {
            PremiumMetricCard(
                title = "TODAY PROFIT",
                value = currencyFormatter.format(state.todaySales * 0.3), // Approximate
                subtitle = "Revenue minus cost",
                icon = Icons.Default.TrendingUp,
                iconBgColor = Color(0xFF3B82F6),
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        item { Spacer(Modifier.height(16.dp)) }

        // ── Premium Revenue Trend Chart ──
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Revenue Trend",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Last 7 Days",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(Modifier.height(20.dp))
                    if (state.salesTrend.isEmpty()) {
                        Box(
                            Modifier
                                .height(160.dp)
                                .fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No trend data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        PremiumLineChart(
                            data = state.salesTrend,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(180.dp)
                        )
                    }
                }
            }
        }

        item { Spacer(Modifier.height(16.dp)) }

        // ── Payment Collection Chart ──
        if (state.paymentStats.isNotEmpty()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text(
                            "Payment Collection",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(Modifier.height(16.dp))
                        PremiumDonutChart(
                            data = state.paymentStats,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp)
                        )
                    }
                }
            }
        }

        item { Spacer(Modifier.height(16.dp)) }

        // ── Operations Cards ──
        item {
            PremiumOperationsCard(
                title = "Inventory",
                icon = Icons.Default.Inventory,
                stats = listOf("Total Products" to state.totalProducts.toString(), "Dead Stock" to state.deadStock.toString()),
                accentColor = Color(0xFFF59E0B),
                onClick = onNavigateToInventory,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        item { Spacer(Modifier.height(12.dp)) }

        item {
            PremiumOperationsCard(
                title = "Repairs",
                icon = Icons.Default.Build,
                stats = listOf("Waiting Parts" to state.waitingParts.toString(), "Ready" to state.ready.toString()),
                accentColor = Color(0xFF3B82F6),
                onClick = onNavigateToJobs,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        // ── Alert Cards ──
        if (state.negativeStock > 0 || state.inProgress > 0) {
            item { Spacer(Modifier.height(16.dp)) }
            item {
                AlertCardsSection(
                    pendingJobs = state.inProgress,
                    negativeStock = state.negativeStock,
                    onJobsClick = onNavigateToJobs,
                    onStockClick = onNavigateToInventory
                )
            }
        }
    }
}

// ── Premium Metric Card ──
@Composable
fun PremiumMetricCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    iconBgColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    letterSpacing = 1.sp
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    value,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold
                )
                Text(
                    "• $subtitle",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Surface(
                color = iconBgColor.copy(alpha = 0.15f),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = iconBgColor, modifier = Modifier.size(28.dp))
                }
            }
        }
    }
}

// ── Premium Line Chart ──
@Composable
fun PremiumLineChart(
    data: List<DashboardTrendItem>,
    modifier: Modifier = Modifier
) {
    val lineColor = ChartLine
    val fillColor = ChartFill.copy(alpha = 0.15f)
    val gridColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
    val textColor = MaterialTheme.colorScheme.onSurfaceVariant
    val maxValue = data.maxOfOrNull { it.sales } ?: 1.0
    val minValue = data.minOfOrNull { it.sales } ?: 0.0
    val range = if (maxValue == minValue) 1.0 else maxValue - minValue

    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val padBottom = 30f
        val padTop = 10f
        val chartH = h - padBottom - padTop
        val stepX = if (data.size > 1) w / (data.size - 1) else w

        // Grid lines
        for (i in 0..3) {
            val y = padTop + chartH * (1 - i / 3f)
            drawLine(gridColor, Offset(0f, y), Offset(w, y), strokeWidth = 1f)
        }

        if (data.size < 2) return@Canvas

        val points = data.mapIndexed { idx, item ->
            val x = idx * stepX
            val y = padTop + chartH * (1 - ((item.sales - minValue) / range).toFloat())
            Offset(x, y)
        }

        // Fill area under curve
        val fillPath = Path().apply {
            moveTo(points.first().x, padTop + chartH)
            points.forEach { lineTo(it.x, it.y) }
            lineTo(points.last().x, padTop + chartH)
            close()
        }
        drawPath(fillPath, Brush.verticalGradient(listOf(fillColor, Color.Transparent)))

        // Line
        val linePath = Path().apply {
            moveTo(points.first().x, points.first().y)
            for (i in 1 until points.size) {
                val cp1x = (points[i - 1].x + points[i].x) / 2
                cubicTo(cp1x, points[i - 1].y, cp1x, points[i].y, points[i].x, points[i].y)
            }
        }
        drawPath(linePath, lineColor, style = Stroke(width = 3f, cap = StrokeCap.Round))

        // Dots
        points.forEach { pt ->
            drawCircle(Color.White, radius = 5f, center = pt)
            drawCircle(lineColor, radius = 3.5f, center = pt)
        }
    }

    // Date labels
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        data.forEach { item ->
            val label = item.date.takeLast(5) // "MM-DD"
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 9.sp
            )
        }
    }
}

// ── Premium Donut Chart ──
@Composable
fun PremiumDonutChart(
    data: List<DashboardChartItem>,
    modifier: Modifier = Modifier
) {
    val chartColors = listOf(
        Color(0xFF00C896),
        Color(0xFF3B82F6),
        Color(0xFFF59E0B),
        Color(0xFFEF4444),
        Color(0xFF8B5CF6),
        Color(0xFFEC4899)
    )
    val total = data.sumOf { it.value }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Donut
        Box(
            modifier = Modifier
                .size(140.dp)
                .weight(1f),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.size(120.dp)) {
                var startAngle = -90f
                data.forEachIndexed { idx, item ->
                    val sweep = if (total > 0) (item.value / total * 360).toFloat() else 0f
                    drawArc(
                        color = chartColors[idx % chartColors.size],
                        startAngle = startAngle,
                        sweepAngle = sweep,
                        useCenter = false,
                        style = Stroke(width = 28f, cap = StrokeCap.Butt)
                    )
                    startAngle += sweep
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "₹${String.format("%,.0f", total)}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text("Total", style = MaterialTheme.typography.labelSmall, color = MutedText)
            }
        }

        // Legend
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            data.forEachIndexed { idx, item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(chartColors[idx % chartColors.size])
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        item.name,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%,.0f", item.value)}",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

// ── Premium Operations Card ──
@Composable
fun PremiumOperationsCard(
    title: String,
    icon: ImageVector,
    stats: List<Pair<String, String>>,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = accentColor.copy(alpha = 0.12f),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    stats.forEach { (label, value) ->
                        Text(
                            "$label: $value",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

// ── Alert Cards Section ──
@Composable
fun AlertCardsSection(pendingJobs: Int, negativeStock: Int, onJobsClick: () -> Unit, onStockClick: () -> Unit) {
    Column(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
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
        shape = RoundedCornerShape(16.dp),
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
