package com.aiyal.mobibix.ui.features.finance.ewaybill

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Description
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
import com.aiyal.mobibix.data.network.EWayBill
import com.aiyal.mobibix.data.network.EWayBillStatus
import java.text.NumberFormat
import java.util.Locale

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EWayBillScreen(
    navController: NavController,
    viewModel: EWayBillViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(
        Locale.Builder().setLanguage("en").setRegion("IN").build()
    )
    var showGenerateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadBills() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("E-Way Bills", fontWeight = FontWeight.Bold)
                        Text("GST compliance for interstate shipments", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showGenerateDialog = true },
                containerColor = TealAccent,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Generate E-Way Bill")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = TealAccent)
            }

            if (uiState.bills.isEmpty() && !uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Description, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                        Spacer(Modifier.height(12.dp))
                        Text("No E-Way Bills yet", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Tap + to generate one for interstate shipments", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                    }
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(uiState.bills) { bill ->
                        EWayBillItem(bill = bill, formatter = currencyFormatter, onCancel = { viewModel.cancelBill(bill.id) })
                    }
                }
            }
        }
    }

    if (showGenerateDialog) {
        GenerateEWayBillDialog(
            isSaving = uiState.isSaving,
            onDismiss = { showGenerateDialog = false },
            onGenerate = { gstin, value, vehicle, distance ->
                viewModel.generateBill(gstin, value, vehicle, distance, null)
                showGenerateDialog = false
            }
        )
    }
}

@Composable
private fun EWayBillItem(
    bill: EWayBill,
    formatter: NumberFormat,
    onCancel: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(bill.ewbNumber, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                EWayBillStatusChip(bill.status)
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Valid From", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(bill.validFrom.take(10), style = MaterialTheme.typography.bodySmall)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("Valid Until", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(bill.validUntil.take(10), style = MaterialTheme.typography.bodySmall)
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(formatter.format(bill.totalValue), fontWeight = FontWeight.SemiBold, color = TealAccent)
                if (bill.status == EWayBillStatus.ACTIVE) {
                    TextButton(onClick = onCancel, colors = ButtonColors(
                        containerColor = Color.Transparent,
                        contentColor = Color(0xFFEF4444),
                        disabledContainerColor = Color.Transparent,
                        disabledContentColor = Color.Gray
                    )) {
                        Text("Cancel", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun EWayBillStatusChip(status: EWayBillStatus) {
    val (bg, fg) = when (status) {
        EWayBillStatus.ACTIVE    -> Pair(Color(0xFF00C896).copy(alpha = 0.12f), Color(0xFF00C896))
        EWayBillStatus.CANCELLED -> Pair(Color(0xFFEF4444).copy(alpha = 0.12f), Color(0xFFEF4444))
        EWayBillStatus.EXPIRED   -> Pair(Color(0xFF9CA3AF).copy(alpha = 0.12f), Color(0xFF9CA3AF))
    }
    Surface(color = bg, shape = RoundedCornerShape(6.dp)) {
        Text(status.name, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), style = MaterialTheme.typography.labelSmall, color = fg, fontWeight = FontWeight.SemiBold)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GenerateEWayBillDialog(
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onGenerate: (gstin: String, value: Double, vehicle: String?, distance: Int?) -> Unit
) {
    var recipientGstin by remember { mutableStateOf("") }
    var totalValue by remember { mutableStateOf("") }
    var vehicleNumber by remember { mutableStateOf("") }
    var distanceKm by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Generate E-Way Bill") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = recipientGstin, onValueChange = { recipientGstin = it },
                    label = { Text("Recipient GSTIN *") }, modifier = Modifier.fillMaxWidth(), singleLine = true
                )
                OutlinedTextField(
                    value = totalValue, onValueChange = { totalValue = it },
                    label = { Text("Total Value (₹) *") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
                OutlinedTextField(
                    value = vehicleNumber, onValueChange = { vehicleNumber = it },
                    label = { Text("Vehicle Number") }, modifier = Modifier.fillMaxWidth(), singleLine = true
                )
                OutlinedTextField(
                    value = distanceKm, onValueChange = { distanceKm = it },
                    label = { Text("Distance (km)") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val value = totalValue.toDoubleOrNull() ?: return@Button
                    val distance = distanceKm.toIntOrNull()
                    onGenerate(recipientGstin, value, vehicleNumber.ifBlank { null }, distance)
                },
                enabled = !isSaving && recipientGstin.isNotBlank() && totalValue.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = TealAccent)
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                else Text("Generate")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
