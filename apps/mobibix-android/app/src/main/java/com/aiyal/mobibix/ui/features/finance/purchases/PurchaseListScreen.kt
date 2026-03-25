package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.Purchase
import com.aiyal.mobibix.data.network.PurchaseStatus
import java.text.NumberFormat
import java.util.Locale

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseListScreen(
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())

    var payingPurchase by remember { mutableStateOf<Purchase?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadPurchases()
    }

    // Quick pay dialog
    payingPurchase?.let { purchase ->
        QuickPayDialog(
            purchase = purchase,
            formatter = currencyFormatter,
            onDismiss = { payingPurchase = null },
            onConfirm = { amount, method ->
                viewModel.quickPayFromList(purchase.id, amount, method)
                payingPurchase = null
            }
        )
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate("create_purchase") },
                containerColor = TealAccent,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Purchase")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // ── Premium Header ──
            Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text("Purchases", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Track stock purchases and suppliers", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = TealAccent)
            }

            if (uiState.error != null) {
                Text(text = uiState.error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
            }

            if (uiState.purchases.isEmpty() && !uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No purchases yet", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(8.dp))
                        Text("Tap + to create a purchase", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(uiState.purchases) { purchase ->
                        PremiumPurchaseCard(
                            purchase = purchase,
                            formatter = currencyFormatter,
                            onClick = { navController.navigate("purchase_detail/${purchase.id}") },
                            onQuickPay = if (purchase.outstandingAmount > 0) {
                                { payingPurchase = purchase }
                            } else null
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumPurchaseCard(
    purchase: Purchase,
    formatter: NumberFormat,
    onClick: () -> Unit,
    onQuickPay: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = purchase.invoiceNumber,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )
                PremiumPurchaseStatusChip(purchase.status)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = purchase.supplierName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(text = "Amount", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(text = formatter.format(purchase.grandTotal), fontWeight = FontWeight.SemiBold)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Date", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(text = purchase.invoiceDate.substring(0, 10))
                }
            }
            if (purchase.outstandingAmount > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.error.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "Due: ${formatter.format(purchase.outstandingAmount)}",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                    if (onQuickPay != null) {
                        Spacer(Modifier.width(8.dp))
                        OutlinedButton(
                            onClick = onQuickPay,
                            modifier = Modifier.height(32.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp)
                        ) {
                            Text("Pay", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumPurchaseStatusChip(status: PurchaseStatus) {
    val (bgColor, textColor) = when (status) {
        PurchaseStatus.DRAFT -> Color.Gray.copy(alpha = 0.12f) to Color.Gray
        PurchaseStatus.SUBMITTED -> TealAccent.copy(alpha = 0.12f) to TealAccent
        PurchaseStatus.PAID -> Color(0xFF3B82F6).copy(alpha = 0.12f) to Color(0xFF3B82F6)
        PurchaseStatus.PARTIALLY_PAID -> Color(0xFFF59E0B).copy(alpha = 0.12f) to Color(0xFFF59E0B)
        PurchaseStatus.CANCELLED -> Color(0xFFEF4444).copy(alpha = 0.12f) to Color(0xFFEF4444)
    }
    Surface(color = bgColor, shape = RoundedCornerShape(8.dp)) {
        Text(
            text = status.name.replace("_", " "),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = textColor
        )
    }
}

private val QUICK_PAY_METHODS = listOf("CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QuickPayDialog(
    purchase: Purchase,
    formatter: NumberFormat,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, method: String) -> Unit
) {
    var amountText by remember { mutableStateOf(purchase.outstandingAmount.toString()) }
    var method by remember { mutableStateOf("CASH") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Record Payment") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Invoice: ${purchase.invoiceNumber}  •  Due: ${formatter.format(purchase.outstandingAmount)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Amount (₹)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
                Text("Payment Method", style = MaterialTheme.typography.labelMedium)
                QUICK_PAY_METHODS.forEach { m ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = method == m, onClick = { method = m })
                        Text(m.replace("_", " "), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amount = amountText.toDoubleOrNull() ?: 0.0
                    if (amount > 0) onConfirm(amount, method)
                },
                enabled = amountText.toDoubleOrNull()?.let { it > 0 } == true
            ) {
                Text("Confirm Payment")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
