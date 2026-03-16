package com.aiyal.mobibix.ui.features.operations

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.DailyClosing
import com.aiyal.mobibix.data.network.DailyClosingManualEntries
import com.aiyal.mobibix.data.network.DailySummary
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyClosingScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: OperationsViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val state by viewModel.dailyClosingState.collectAsState()
    val today = LocalDate.now().toString()
    var showSubmitDialog by remember { mutableStateOf(false) }

    LaunchedEffect(activeShopId) {
        activeShopId?.let {
            viewModel.loadDailyHistory(it)
            viewModel.loadDailySummary(it, today)
        }
    }

    if (showSubmitDialog) {
        DailyCloseDialog(
            summary = state.summary,
            submitting = state.submitting,
            error = state.error,
            onDismiss = { showSubmitDialog = false },
            onSubmit = { reportedCash, mode, manualEntries, varianceReason, varianceNote ->
                val shopId = activeShopId ?: return@DailyCloseDialog
                viewModel.submitDailyClosing(
                    shopId = shopId,
                    date = today,
                    mode = mode,
                    reportedCash = reportedCash,
                    manualEntries = manualEntries,
                    varianceReason = varianceReason,
                    varianceNote = varianceNote
                ) {
                    showSubmitDialog = false
                    activeShopId?.let {
                        viewModel.loadDailyHistory(it)
                        viewModel.loadDailySummary(it, today)
                    }
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Daily Closing", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Button(
                        onClick = { showSubmitDialog = true },
                        modifier = Modifier.padding(end = 8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Close Today", fontSize = 13.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Today's Summary Card
            item {
                val summary = state.summary
                when {
                    state.summaryLoading -> Box(Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                    summary != null -> TodaySummaryCard(summary)
                }
            }

            // Closing History
            item { Text("Closing History", fontWeight = FontWeight.SemiBold, fontSize = 14.sp) }

            when {
                state.loading -> item {
                    Box(Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                state.history.isEmpty() -> item {
                    Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Lock, null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                            Text("No closing history", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                else -> items(state.history) { ClosingHistoryCard(it) }
            }
        }
    }
}

@Composable
private fun TodaySummaryCard(summary: DailySummary) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Today's Summary", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (summary.status == "CLOSED") Color(0xFF00C896).copy(alpha = 0.15f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                ) {
                    Text(
                        summary.status,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontSize = 10.sp,
                        color = if (summary.status == "CLOSED") Color(0xFF00C896) else MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            HorizontalDivider()
            SummaryRow("Opening Cash", summary.openingCash)
            SummaryRow("Cash Sales", summary.salesCash, color = Color(0xFF00C896))
            SummaryRow("UPI Sales", summary.salesUpi, color = Color(0xFF00C896))
            SummaryRow("Card Sales", summary.salesCard, color = Color(0xFF00C896))
            SummaryRow("Bank Sales", summary.salesBank, color = Color(0xFF00C896))
            if (summary.supplierPaymentsCash != 0.0) SummaryRow("Supplier Payments", summary.supplierPaymentsCash, negative = true)
            if (summary.expenseCash != 0.0) SummaryRow("Cash Expenses", summary.expenseCash, negative = true)
            HorizontalDivider()
            SummaryRow("Expected Closing", summary.expectedClosingCash, bold = true, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: Double, negative: Boolean = false, bold: Boolean = false, color: Color = Color.Unspecified) {
    if (value == 0.0 && !bold) return
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal)
        val display = if (negative) "-₹${String.format("%.2f", value)}" else "₹${String.format("%.2f", value)}"
        Text(
            display,
            fontSize = 12.sp,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = when {
                color != Color.Unspecified -> color
                negative -> MaterialTheme.colorScheme.error
                else -> MaterialTheme.colorScheme.onSurface
            }
        )
    }
}

@Composable
private fun ClosingHistoryCard(closing: DailyClosing) {
    val statusColor = when (closing.status) {
        "CLOSED" -> Color(0xFF00C896)
        "REOPENED" -> Color(0xFFF59E0B)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(closing.date.take(10), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                    Text(closing.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 10.sp, color = statusColor, fontWeight = FontWeight.SemiBold)
                }
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Opening", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("₹${String.format("%.2f", closing.openingCash)}", fontSize = 11.sp)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Expected", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("₹${String.format("%.2f", closing.expectedClosingCash)}", fontSize = 11.sp)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Reported", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("₹${String.format("%.2f", closing.reportedClosingCash)}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
            val diff = closing.cashDifference
            if (diff != 0.0) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Variance", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "₹${String.format("%.2f", diff)}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (diff < 0) MaterialTheme.colorScheme.error else Color(0xFF00C896)
                    )
                }
            }
            if (closing.varianceReason != null) {
                Text("Reason: ${closing.varianceReason}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DailyCloseDialog(
    summary: DailySummary?,
    submitting: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSubmit: (Double, String, DailyClosingManualEntries?, String?, String?) -> Unit
) {
    var reportedCash by remember { mutableStateOf(summary?.expectedClosingCash?.toInt()?.toString() ?: "") }
    var mode by remember { mutableStateOf("SYSTEM") }
    var varianceReason by remember { mutableStateOf("") }
    var varianceNote by remember { mutableStateOf("") }
    var manualSalesCash by remember { mutableStateOf("") }
    var manualSalesUpi by remember { mutableStateOf("") }
    var manualSalesCard by remember { mutableStateOf("") }
    var manualExpenses by remember { mutableStateOf("") }
    var manualSupplierPayments by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Close Today", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Mode selector
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("SYSTEM", "MANUAL").forEach { m ->
                        FilterChip(
                            selected = mode == m,
                            onClick = { mode = m },
                            label = { Text(m, fontSize = 12.sp) }
                        )
                    }
                }

                // SYSTEM: show calculated summary
                if (mode == "SYSTEM" && summary != null) {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text("System Summary", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                            SummaryRow("Opening Cash", summary.openingCash)
                            SummaryRow("Cash Sales", summary.salesCash, color = Color(0xFF00C896))
                            if (summary.expenseCash != 0.0) SummaryRow("Expenses", summary.expenseCash, negative = true)
                            if (summary.supplierPaymentsCash != 0.0) SummaryRow("Supplier Pmts", summary.supplierPaymentsCash, negative = true)
                            HorizontalDivider()
                            SummaryRow("Expected", summary.expectedClosingCash, bold = true, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }

                // MANUAL: show editable fields
                if (mode == "MANUAL") {
                    Text("Enter actual cash figures:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    ManualField("Cash Sales (₹)", manualSalesCash) { manualSalesCash = it }
                    ManualField("UPI Sales (₹)", manualSalesUpi) { manualSalesUpi = it }
                    ManualField("Card Sales (₹)", manualSalesCard) { manualSalesCard = it }
                    ManualField("Cash Expenses (₹)", manualExpenses) { manualExpenses = it }
                    ManualField("Supplier Payments (₹)", manualSupplierPayments) { manualSupplierPayments = it }
                }

                OutlinedTextField(
                    value = reportedCash,
                    onValueChange = { reportedCash = it },
                    label = { Text("Physical Cash Count (₹)") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )

                // Variance display
                val expected = summary?.expectedClosingCash ?: 0.0
                val reported = reportedCash.toDoubleOrNull() ?: 0.0
                val diff = reported - expected
                if (kotlin.math.abs(diff) > 0.5 && reportedCash.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (diff < 0) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f) else Color(0xFF00C896).copy(alpha = 0.1f)
                    ) {
                        Text(
                            if (diff < 0) "Shortage: ₹${String.format("%.2f", kotlin.math.abs(diff))}"
                            else "Excess: ₹${String.format("%.2f", diff)}",
                            modifier = Modifier.padding(8.dp),
                            fontSize = 12.sp,
                            color = if (diff < 0) MaterialTheme.colorScheme.error else Color(0xFF00C896),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    OutlinedTextField(
                        value = varianceReason,
                        onValueChange = { varianceReason = it },
                        label = { Text("Variance Reason") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = varianceNote,
                        onValueChange = { varianceNote = it },
                        label = { Text("Note (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                }

                if (error != null) {
                    Text(error, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val cash = reportedCash.toDoubleOrNull() ?: return@Button
                    val manualEntries = if (mode == "MANUAL") DailyClosingManualEntries(
                        salesCash = manualSalesCash.toDoubleOrNull(),
                        salesUpi = manualSalesUpi.toDoubleOrNull(),
                        salesCard = manualSalesCard.toDoubleOrNull(),
                        expenseCash = manualExpenses.toDoubleOrNull(),
                        supplierPaymentsCash = manualSupplierPayments.toDoubleOrNull()
                    ) else null
                    onSubmit(cash, mode, manualEntries, varianceReason.takeIf { it.isNotBlank() }, varianceNote.takeIf { it.isNotBlank() })
                },
                enabled = reportedCash.isNotBlank() && !submitting
            ) {
                if (submitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Submit")
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun ManualField(label: String, value: String, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, fontSize = 12.sp) },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        singleLine = true
    )
}
