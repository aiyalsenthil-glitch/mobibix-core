package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.PurchaseStatus
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseDetailScreen(
    purchaseId: String,
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))

    LaunchedEffect(purchaseId) {
        viewModel.loadPurchaseDetail(purchaseId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Purchase Details") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val purchase = uiState.selectedPurchase
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (purchase != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = purchase.invoiceNumber, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text(text = "Date: ${purchase.invoiceDate.substring(0, 10)}", style = MaterialTheme.typography.bodyMedium)
                    }
                    PremiumPurchaseStatusChip(purchase.status)
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = "Supplier: ${purchase.supplierName}", style = MaterialTheme.typography.titleMedium)
                if (purchase.supplierGstin != null) {
                    Text(text = "GSTIN: ${purchase.supplierGstin}", style = MaterialTheme.typography.bodySmall)
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = "Items", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(purchase.items) { item ->
                        ListItem(
                            headlineContent = { Text(item.description) },
                            supportingContent = { Text("${item.quantity} x ${currencyFormatter.format(item.purchasePrice)}") },
                            trailingContent = { Text(currencyFormatter.format(item.total)) }
                        )
                    }
                }
                
                HorizontalDivider()
                Spacer(modifier = Modifier.height(16.dp))
                
                MetricRow("Sub Total", currencyFormatter.format(purchase.subTotal))
                MetricRow("GST Total", currencyFormatter.format(purchase.totalGst))
                MetricRow("Grand Total", currencyFormatter.format(purchase.grandTotal), FontWeight.Bold)
                MetricRow("Paid Amount", currencyFormatter.format(purchase.paidAmount))
                MetricRow("Outstanding", currencyFormatter.format(purchase.outstandingAmount), color = MaterialTheme.colorScheme.error)
                
                Spacer(modifier = Modifier.height(24.dp))
                
                if (purchase.status == PurchaseStatus.DRAFT) {
                    Button(
                        onClick = { viewModel.submitPurchase(purchase.id) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Submit Purchase (Stock In)")
                    }
                } else if (purchase.outstandingAmount > 0) {
                    Button(
                        onClick = { /* TODO: Open Payment Dialog */ },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Record Payment")
                    }
                }
            }
        }
    }
}

@Composable
fun MetricRow(label: String, value: String, weight: FontWeight = FontWeight.Normal, color: androidx.compose.ui.graphics.Color = androidx.compose.ui.graphics.Color.Unspecified) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyLarge)
        Text(text = value, style = MaterialTheme.typography.bodyLarge, fontWeight = weight, color = color)
    }
}
