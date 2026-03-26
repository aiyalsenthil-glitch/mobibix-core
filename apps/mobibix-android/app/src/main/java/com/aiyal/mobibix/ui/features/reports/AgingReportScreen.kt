package com.aiyal.mobibix.ui.features.reports

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
import com.aiyal.mobibix.data.network.OutstandingItem
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgingReportScreen(
    navController: NavController,
    viewModel: ReportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val currencyFormatter = NumberFormat.getCurrencyInstance(
        Locale.Builder().setLanguage("en").setRegion("IN").build()
    )

    LaunchedEffect(Unit) {
        viewModel.loadReceivables()
        viewModel.loadPayables()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Aging Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Outstanding receivables & payables", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0; viewModel.loadReceivables() },
                    text = { Text("Receivables (${uiState.receivables.size})") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1; viewModel.loadPayables() },
                    text = { Text("Payables (${uiState.payables.size})") }
                )
            }

            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp)
                )
            }

            val currentList = if (selectedTab == 0) uiState.receivables else uiState.payables
            val totalPending = currentList.sumOf { it.pendingAmount }

            if (currentList.isNotEmpty()) {
                // Summary banner
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (selectedTab == 0)
                            Color(0xFF3B82F6).copy(alpha = 0.1f)
                        else
                            Color(0xFFF59E0B).copy(alpha = 0.1f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                if (selectedTab == 0) "Total Receivable" else "Total Payable",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                currencyFormatter.format(totalPending),
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = if (selectedTab == 0) Color(0xFF3B82F6) else Color(0xFFF59E0B)
                            )
                        }
                        Text(
                            "${currentList.size} entries",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            if (currentList.isEmpty() && !uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        if (selectedTab == 0) "No outstanding receivables" else "No outstanding payables",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(currentList) { item ->
                        AgingItemCard(item, currencyFormatter, isReceivable = selectedTab == 0)
                    }
                }
            }
        }
    }
}

@Composable
private fun AgingItemCard(item: OutstandingItem, formatter: NumberFormat, isReceivable: Boolean) {
    val amountColor = if (isReceivable) Color(0xFF3B82F6) else Color(0xFFF59E0B)
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.entityName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                if (item.lastTransactionDate != null) {
                    Text(
                        "Last: ${item.lastTransactionDate.take(10)}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Text(
                formatter.format(item.pendingAmount),
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = amountColor
            )
        }
    }
}
