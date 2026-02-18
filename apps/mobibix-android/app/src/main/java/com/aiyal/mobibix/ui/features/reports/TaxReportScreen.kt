package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.TaxReportItem
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaxReportScreen(
    navController: NavController,
    viewModel: ReportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))

    LaunchedEffect(Unit) {
        viewModel.loadTaxReport()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tax Report") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
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
            // Date Filter Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.DateRange, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "${uiState.startDate} to ${uiState.endDate}",
                    style = MaterialTheme.typography.bodyMedium
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

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.taxReport) { item ->
                    TaxReportItemRow(item, currencyFormatter)
                }
            }
        }
    }
}

@Composable
fun TaxReportItemRow(item: TaxReportItem, formatter: NumberFormat) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = item.invoiceNo, fontWeight = FontWeight.Bold)
                Text(text = item.date)
            }
            if (!item.gstNo.isNullOrEmpty()) {
                Text(text = "GST: ${item.gstNo}", style = MaterialTheme.typography.labelSmall)
            }
            
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(text = "Taxable", style = MaterialTheme.typography.labelSmall)
                    Text(text = formatter.format(item.taxableAmount))
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Tax", style = MaterialTheme.typography.labelSmall)
                    Text(text = formatter.format(item.totalTax))
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Total", style = MaterialTheme.typography.labelSmall)
                    Text(text = formatter.format(item.totalAmount), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
