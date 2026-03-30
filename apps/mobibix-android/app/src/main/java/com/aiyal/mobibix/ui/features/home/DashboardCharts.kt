package com.aiyal.mobibix.ui.features.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumBarChart(
    data: List<DashboardTrendItem>,
    modifier: Modifier = Modifier
) {
    val colorScheme = MaterialTheme.colorScheme
    Surface(
        color = colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, colorScheme.outline.copy(alpha = 0.1f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(20.dp)) {
            Text(
                "REVENUE TREND",
                style = MaterialTheme.typography.labelSmall,
                color = colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 1.2.sp
            )
            Spacer(Modifier.height(24.dp))
            
            Canvas(modifier = Modifier
                .fillMaxWidth()
                .height(160.dp)) {
                
                if (data.isEmpty()) return@Canvas
                
                val maxValue = (data.maxOf { it.sales }.coerceAtLeast(1.0)).toFloat()
                val barSpacing = size.width / data.size
                val barWidth = barSpacing * 0.45f
                val accentColor = colorScheme.primary
                
                data.forEachIndexed { index, item ->
                    val barHeight = (item.sales.toFloat() / maxValue) * size.height
                    val x = (index * barSpacing) + (barSpacing - barWidth) / 2
                    val y = size.height - barHeight
                    
                    // Main Bar with Gradient
                    drawRoundRect(
                        brush = Brush.verticalGradient(
                            listOf(accentColor, accentColor.copy(alpha = 0.3f))
                        ),
                        topLeft = Offset(x, y),
                        size = Size(barWidth, barHeight),
                        cornerRadius = CornerRadius(12f, 12f)
                    )
                }
            }
            
            Spacer(Modifier.height(16.dp))
            
            // Minimal X-Axis Labels
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                val labels = listOf("JAN", "MAR", "JUN", "SEP", "DEC")
                labels.forEach { label ->
                    Text(label, color = colorScheme.onSurfaceVariant.copy(alpha = 0.7f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun PremiumLineChart(
    data: List<DashboardTrendItem>,
    modifier: Modifier = Modifier
) {
    val accentColor = MaterialTheme.colorScheme.primary
    Canvas(modifier = modifier.fillMaxWidth()) {
        if (data.isEmpty()) return@Canvas
        
        val maxValue = (data.maxOf { it.sales }.coerceAtLeast(1.0)).toFloat()
        val stepX = size.width / (data.size - 1).coerceAtLeast(1)
        
        val path = Path()
        val fillPath = Path()
        
        data.forEachIndexed { index, item ->
            val x = index * stepX
            val y = size.height - (item.sales.toFloat() / maxValue) * size.height
            
            if (index == 0) {
                path.moveTo(x, y)
                fillPath.moveTo(x, size.height)
                fillPath.lineTo(x, y)
            } else {
                path.lineTo(x, y)
                fillPath.lineTo(x, y)
            }
            
            if (index == data.size - 1) {
                fillPath.lineTo(x, size.height)
                fillPath.close()
            }
        }
        
        // Draw Area Fill
        drawPath(
            path = fillPath,
            brush = Brush.verticalGradient(
                listOf(accentColor.copy(alpha = 0.2f), Color.Transparent)
            )
        )
        
        // Draw Line
        drawPath(
            path = path,
            color = accentColor,
            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
        )
    }
}

@Composable
fun PremiumDonutChart(
    data: List<DashboardChartItem>,
    modifier: Modifier = Modifier
) {
    val colorScheme = MaterialTheme.colorScheme
    val chartColors = listOf(
        colorScheme.primary,
        colorScheme.secondary,
        colorScheme.tertiary,
        colorScheme.error,
        colorScheme.primaryContainer
    )
    val total = data.sumOf { it.value }

    Surface(
        color = colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, colorScheme.outline.copy(alpha = 0.1f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(110.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    var startAngle = -90f
                    data.forEachIndexed { idx, item ->
                        val sweep = if (total > 0) (item.value.toFloat() / total.toFloat() * 360f) else 0f
                        drawArc(
                            color = chartColors[idx % chartColors.size],
                            startAngle = startAngle,
                            sweepAngle = sweep,
                            useCenter = false,
                            style = Stroke(width = 12.dp.toPx(), cap = StrokeCap.Round)
                        )
                        startAngle += sweep
                    }
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "${(total / 1000).toInt()}K",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = colorScheme.onSurface
                    )
                    Text("TOTAL", style = MaterialTheme.typography.labelSmall, color = colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.width(24.dp))

            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                data.take(4).forEachIndexed { idx, item ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(chartColors[idx % chartColors.size]))
                        Spacer(Modifier.width(8.dp))
                        Text(item.name, style = MaterialTheme.typography.labelSmall, color = colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}
