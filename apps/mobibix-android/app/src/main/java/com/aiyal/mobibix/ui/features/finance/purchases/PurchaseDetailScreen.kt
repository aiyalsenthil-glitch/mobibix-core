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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
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
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())
    var showPaymentDialog by remember { mutableStateOf(false) }

    LaunchedEffect(purchaseId) {
        viewModel.loadPurchaseDetail(purchaseId)
    }

    LaunchedEffect(uiState.actionSuccess) {
        if (uiState.actionSuccess) {
            viewModel.resetActionSuccess()
            showPaymentDialog = false
        }
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
        if (uiState.isLoading && purchase == null) {
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
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !uiState.isLoading
                    ) {
                        Text("Submit Purchase (Stock In)")
                    }
                } else if (purchase.outstandingAmount > 0) {
                    Button(
                        onClick = { showPaymentDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !uiState.isLoading
                    ) {
                        Text("Record Payment")
                    }
                }
            }
        }
    }

    if (showPaymentDialog) {
        val purchase = uiState.selectedPurchase
        if (purchase != null) {
            RecordPaymentDialog(
                outstanding = purchase.outstandingAmount,
                isSaving = uiState.isLoading,
                onDismiss = { showPaymentDialog = false },
                onConfirm = { amount, method, reference ->
                    viewModel.recordPayment(purchase.id, amount, method, reference, null)
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecordPaymentDialog(
    outstanding: Double,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, method: String, reference: String?) -> Unit
) {
    var amountText by remember { mutableStateOf(outstanding.toString()) }
    var selectedMethod by remember { mutableStateOf("CASH") }
    var reference by remember { mutableStateOf("") }
    var methodExpanded by remember { mutableStateOf(false) }
    val methods = listOf("CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Record Payment") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Outstanding: ₹${"%.2f".format(outstanding)}", style = MaterialTheme.typography.bodyMedium)

                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Amount (₹)") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )

                ExposedDropdownMenuBox(
                    expanded = methodExpanded,
                    onExpandedChange = { methodExpanded = it }
                ) {
                    OutlinedTextField(
                        value = selectedMethod,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Payment Method") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(methodExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(expanded = methodExpanded, onDismissRequest = { methodExpanded = false }) {
                        methods.forEach { m ->
                            DropdownMenuItem(text = { Text(m) }, onClick = { selectedMethod = m; methodExpanded = false })
                        }
                    }
                }

                OutlinedTextField(
                    value = reference,
                    onValueChange = { reference = it },
                    label = { Text("Reference / Transaction ID (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            val amount = amountText.toDoubleOrNull()
            Button(
                onClick = {
                    if (amount != null && amount > 0) {
                        onConfirm(amount, selectedMethod, reference.ifBlank { null })
                    }
                },
                enabled = !isSaving && (amountText.toDoubleOrNull() ?: 0.0) > 0
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Confirm")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
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
