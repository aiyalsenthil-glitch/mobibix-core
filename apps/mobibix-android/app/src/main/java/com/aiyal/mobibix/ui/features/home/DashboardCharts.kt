package com.aiyal.mobibix.ui.features.home

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.axis.horizontal.rememberBottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.rememberStartAxis
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.compose.chart.column.columnChart
import com.patrykandpatrick.vico.compose.component.lineComponent
import com.patrykandpatrick.vico.core.entry.ChartEntryModelProducer
import com.patrykandpatrick.vico.core.entry.entryOf
import com.patrykandpatrick.vico.core.component.shape.Shapes

@Composable
fun DailyRevenueChart(data: List<DashboardTrendItem>) {
    val modelProducer = remember(data) {
        ChartEntryModelProducer(data.mapIndexed { index, item -> entryOf(index, item.sales) })
    }

    Chart(
        chart = columnChart(
            columns = listOf(
                lineComponent(
                    color = MaterialTheme.colorScheme.primary,
                    thickness = 8.dp,
                    shape = Shapes.roundedCornerShape(allPercent = 40)
                )
            )
        ),
        chartModelProducer = modelProducer,
        startAxis = rememberStartAxis(),
        bottomAxis = rememberBottomAxis(
            valueFormatter = { value, _ ->
                data.getOrNull(value.toInt())?.date ?: ""
            }
        ),
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
    )
}

@Composable
fun PaymentModeChart(data: List<DashboardChartItem>) {
    val modelProducer = remember(data) {
        ChartEntryModelProducer(data.mapIndexed { index, item -> entryOf(index, item.value) })
    }

    Chart(
        chart = columnChart(
            columns = listOf(
                lineComponent(
                    color = MaterialTheme.colorScheme.secondary,
                    thickness = 12.dp,
                    shape = Shapes.roundedCornerShape(allPercent = 40)
                )
            )
        ),
        chartModelProducer = modelProducer,
        startAxis = rememberStartAxis(),
        bottomAxis = rememberBottomAxis(
            valueFormatter = { value, _ ->
                data.getOrNull(value.toInt())?.name ?: ""
            }
        ),
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)
    )
}
