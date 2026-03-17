package com.aiyal.mobibix.ui.features.operations

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonthlyReportScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: OperationsViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val state by viewModel.monthlyReportState.collectAsState()

    LaunchedEffect(activeShopId) { activeShopId?.let { viewModel.loadMonthlyReport(it) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Monthly Report", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            state.error != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
            else -> LazyColumn(
                modifier = Modifier.padding(padding).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                // Current month summary
                state.report?.let { report ->
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("This Month: ${report.month}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                HorizontalDivider()
                                MonthlyRow("Revenue", "₹${String.format("%.2f", report.totalRevenue)}", Color(0xFF00C896))
                                MonthlyRow("Expenses", "₹${String.format("%.2f", report.totalExpenses)}", MaterialTheme.colorScheme.error)
                                MonthlyRow("Net Profit", "₹${String.format("%.2f", report.netProfit)}", if (report.netProfit >= 0) Color(0xFF00C896) else MaterialTheme.colorScheme.error, bold = true)
                                Spacer(Modifier.height(4.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    Chip("${report.salesCount} Sales")
                                    Chip("${report.repairCount} Repairs")
                                }
                            }
                        }
                    }
                }

                // Trend
                if (state.trend.isNotEmpty()) {
                    item { Text("6-Month Trend", fontWeight = FontWeight.Bold, fontSize = 15.sp) }
                    items(state.trend) { m ->
                        Card(
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(m.month, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                    Text("₹${String.format("%.2f", m.profit)}", fontWeight = FontWeight.Bold, fontSize = 13.sp,
                                        color = if (m.profit >= 0) Color(0xFF00C896) else MaterialTheme.colorScheme.error)
                                }
                                Spacer(Modifier.height(4.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Rev: ₹${String.format("%.2f", m.revenue)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("Exp: ₹${String.format("%.2f", m.expenses)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MonthlyRow(label: String, value: String, color: Color, bold: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 13.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.SemiBold, color = color)
    }
}

@Composable
private fun Chip(text: String) {
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
        Text(text, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
