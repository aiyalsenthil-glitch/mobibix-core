package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import com.aiyal.mobibix.ui.components.DateRangeFilterRow
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfitLossScreen(
    navController: NavController,
    viewModel: ReportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())

    LaunchedEffect(Unit) {
        viewModel.loadProfitSummary()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profit & Loss") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            DateRangeFilterRow(
                startDate = uiState.startDate,
                endDate = uiState.endDate,
                onRangeSelected = { start, end ->
                    viewModel.updateDateRange(start, end)
                    viewModel.loadProfitSummary()
                }
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error
                )
            }

            uiState.profitMetrics?.let { metrics ->
                SummaryCard("Overall Summary", metrics.totalRevenue, metrics.totalCost, metrics.grossProfit, metrics.margin, currencyFormatter)
                
                HorizontalDivider()
                Text(text = "Breakdown", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                
                SummaryCard("Sales", metrics.salesRevenue, metrics.salesCost, metrics.salesProfit, null, currencyFormatter)
                SummaryCard("Repairs", metrics.repairRevenue, metrics.repairCost, metrics.repairProfit, null, currencyFormatter)
            }
            } // end inner Column
        }
    }
}

@Composable
fun SummaryCard(
    title: String,
    revenue: Double,
    cost: Double,
    profit: Double,
    margin: Double?,
    formatter: NumberFormat
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))
            
            MetricRow("Total Revenue", formatter.format(revenue))
            MetricRow("Total Cost", formatter.format(cost))
            MetricRow(
                "Gross Profit", 
                formatter.format(profit),
                color = if (profit >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            )
            if (margin != null) {
                MetricRow("Net Margin", String.format("%.2f%%", margin))
            }
        }
    }
}

@Composable
fun MetricRow(label: String, value: String, color: Color = Color.Unspecified) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = color)
    }
}
