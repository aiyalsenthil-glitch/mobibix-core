package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.Gstr2ReportItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Gstr2ReportScreen(
    navController: NavController,
    viewModel: ReportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.startDate, uiState.endDate) {
        viewModel.loadGstr2Report()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("GSTR-2 Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Purchase tax credit report", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
        Column(modifier = Modifier.padding(padding)) {
            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (uiState.error != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error: ${uiState.error}", color = MaterialTheme.colorScheme.error)
                }
            } else if (uiState.gstr2Report.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No tax data available for this period")
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.gstr2Report) { item ->
                        Gstr2ReportCard(item)
                    }
                }
            }
        }
    }
}

@Composable
fun Gstr2ReportCard(item: Gstr2ReportItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(item.supplierName ?: "Unknown Supplier", fontWeight = FontWeight.Bold)
                Text("₹${item.invoiceValue}", fontWeight = FontWeight.Bold)
            }
            Text("GSTIN: ${item.supplierGstin ?: "N/A"}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Bill No: ${item.billNumber}", style = MaterialTheme.typography.bodySmall)
                Text("Date: ${item.billDate}", style = MaterialTheme.typography.bodySmall)
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Taxable: ₹${item.taxableValue}", style = MaterialTheme.typography.bodySmall)
                Text("Tax: ₹${item.totalTax}", style = MaterialTheme.typography.bodySmall)
            }
            Text("ITC Eligible: ${if (item.itcEligible) "Yes" else "No"}", style = MaterialTheme.typography.bodySmall, color = if (item.itcEligible) Color.Green else Color.Red)
        }
    }
}
