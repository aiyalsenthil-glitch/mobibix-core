package com.aiyal.mobibix.ui.features.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.ui.components.GlassCard

@Composable
fun DailyRevenueChart(data: List<DashboardTrendItem>) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                "Revenue Trend",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(Modifier.height(16.dp))
            PremiumLineChart(
                data = data,
                modifier = Modifier.fillMaxWidth().height(180.dp)
            )
        }
    }
}

@Composable
fun PaymentModeChart(data: List<DashboardChartItem>) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                "Payment Collection",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(Modifier.height(16.dp))
            PremiumDonutChart(
                data = data,
                modifier = Modifier.fillMaxWidth().height(200.dp)
            )
        }
    }
}

// Re-using the premium components here for consistency across the app
@Composable
fun PremiumLineChart(
    data: List<DashboardTrendItem>,
    modifier: Modifier = Modifier
) {
    val BrandPrimary = Color(0xFF00C896)
    val TextSecondary = Color(0xFF64748B)
    
    val lineColor = BrandPrimary
    val fillColor = BrandPrimary.copy(alpha = 0.15f)
    val gridColor = TextSecondary.copy(alpha = 0.1f)
    val maxValue = data.maxOfOrNull { it.sales } ?: 1.0
    val minValue = data.minOfOrNull { it.sales } ?: 0.0
    val range = if (maxValue == minValue) 1.0 else maxValue - minValue

    Column(modifier = modifier) {
        Canvas(modifier = Modifier.weight(1f).fillMaxWidth()) {
            val w = size.width
            val h = size.height
            val padTop = 10f
            val chartH = h - padTop
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

            // Fill
            val fillPath = Path().apply {
                moveTo(points.first().x, h)
                points.forEach { lineTo(it.x, it.y) }
                lineTo(points.last().x, h)
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
            drawPath(linePath, lineColor, style = Stroke(width = 3.5f, cap = StrokeCap.Round))

            // Points
            points.forEach { pt ->
                drawCircle(Color.White, radius = 5f, center = pt)
                drawCircle(lineColor, radius = 3f, center = pt)
            }
        }

        // Labels
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            data.forEach { item ->
                Text(
                    item.date.takeLast(5),
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    fontSize = 9.sp
                )
            }
        }
    }
}

@Composable
fun PremiumDonutChart(
    data: List<DashboardChartItem>,
    modifier: Modifier = Modifier
) {
    val TextPrimary = Color(0xFF0F172A)
    val TextSecondary = Color(0xFF64748B)
    val MutedText = Color(0xFF9CA3AF)
    
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
        Box(
            modifier = Modifier.size(150.dp).weight(1.1f),
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
                        style = Stroke(width = 30f, cap = StrokeCap.Butt)
                    )
                    startAngle += sweep
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "₹${String.format("%,.0f", total)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text("Total", style = MaterialTheme.typography.labelSmall, color = MutedText)
            }
        }

        Spacer(Modifier.width(16.dp))

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            data.forEachIndexed { idx, item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(chartColors[idx % chartColors.size]))
                    Spacer(Modifier.width(8.dp))
                    Text(item.name, style = MaterialTheme.typography.labelSmall, color = TextSecondary, modifier = Modifier.weight(1f))
                    Text("${(if(total>0) (item.value/total*100).toInt() else 0)}%", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
        }
    }
}
