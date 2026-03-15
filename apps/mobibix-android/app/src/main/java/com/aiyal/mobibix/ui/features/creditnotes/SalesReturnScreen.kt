package com.aiyal.mobibix.ui.features.creditnotes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
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
import com.aiyal.mobibix.data.network.CreateCreditNoteItemDto

/**
 * Sales Return Screen — Creates a CUSTOMER credit note with SALES_RETURN reason.
 * This is a dedicated, streamlined flow for handling customer returns.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesReturnScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: CreditNoteViewModel = hiltViewModel()
) {
    val state by viewModel.createState.collectAsState()
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState(initial = null)

    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var originalInvoiceNo by remember { mutableStateOf("") }
    var returnReason by remember { mutableStateOf("") }
    var items by remember { mutableStateOf(listOf(ReturnItemRow())) }

    LaunchedEffect(state.success) {
        if (state.success) {
            viewModel.clearCreateState()
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Sales Return", fontWeight = FontWeight.Bold)
                        Text("Create customer credit note", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Info banner
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF00C896).copy(alpha = 0.08f))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF00C896).copy(alpha = 0.2f)) {
                        Text(
                            "RETURN",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF00C896)
                        )
                    }
                    Text(
                        "Credit note will be issued to the customer for returned goods.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Customer Info
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Customer Details", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    OutlinedTextField(
                        value = customerName,
                        onValueChange = { customerName = it },
                        label = { Text("Customer Name *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = customerPhone,
                            onValueChange = { customerPhone = it },
                            label = { Text("Phone") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            shape = RoundedCornerShape(10.dp)
                        )
                        OutlinedTextField(
                            value = originalInvoiceNo,
                            onValueChange = { originalInvoiceNo = it },
                            label = { Text("Original Invoice #") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }
            }

            // Return Items
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Return Items", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        IconButton(
                            onClick = { items = items + ReturnItemRow() },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add item", tint = Color(0xFF00C896))
                        }
                    }

                    items.forEachIndexed { idx, row ->
                        ReturnItemEntry(
                            row = row,
                            onUpdate = { updated ->
                                items = items.toMutableList().also { it[idx] = updated }
                            },
                            onRemove = if (items.size > 1) ({
                                items = items.toMutableList().also { it.removeAt(idx) }
                            }) else null
                        )
                    }

                    val subtotal = items.sumOf { (it.qty.toDoubleOrNull() ?: 0.0) * (it.unitPrice.toDoubleOrNull() ?: 0.0) }
                    if (subtotal > 0) {
                        HorizontalDivider()
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subtotal", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Text("₹${String.format("%.2f", subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF00C896))
                        }
                    }
                }
            }

            // Reason
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Return Reason", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    OutlinedTextField(
                        value = returnReason,
                        onValueChange = { returnReason = it },
                        label = { Text("Describe reason for return") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4,
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            }

            if (state.error != null) {
                Card(
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Text(state.error!!, modifier = Modifier.padding(12.dp), color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                }
            }

            // Submit
            Button(
                onClick = {
                    val shopId = activeShopId ?: return@Button
                    val creditItems = items.mapNotNull { row ->
                        val qty = row.qty.toIntOrNull() ?: return@mapNotNull null
                        val price = row.unitPrice.toDoubleOrNull() ?: return@mapNotNull null
                        if (row.description.isBlank()) return@mapNotNull null
                        val gst = row.gstRate.toDoubleOrNull() ?: 0.0
                        CreateCreditNoteItemDto(
                            description = row.description,
                            quantity = qty,
                            rate = price,
                            gstRate = gst,
                            gstAmount = price * qty * gst / 100.0,
                            lineTotal = price * qty * (1 + gst / 100.0)
                        )
                    }
                    viewModel.createSalesReturn(
                        shopId = shopId,
                        customerName = customerName,
                        customerPhone = customerPhone.takeIf { it.isNotBlank() },
                        originalInvoiceNo = originalInvoiceNo.takeIf { it.isNotBlank() },
                        notes = returnReason.takeIf { it.isNotBlank() },
                        items = creditItems
                    )
                },
                enabled = customerName.isNotBlank() && items.any { it.description.isNotBlank() } && !state.loading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C896))
            ) {
                if (state.loading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text("Create Sales Return", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ReturnItemEntry(
    row: ReturnItemRow,
    onUpdate: (ReturnItemRow) -> Unit,
    onRemove: (() -> Unit)?
) {
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = row.description,
                    onValueChange = { onUpdate(row.copy(description = it)) },
                    label = { Text("Item Description") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp)
                )
                if (onRemove != null) {
                    IconButton(onClick = onRemove, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = row.qty,
                    onValueChange = { onUpdate(row.copy(qty = it)) },
                    label = { Text("Qty") },
                    modifier = Modifier.weight(0.8f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = row.unitPrice,
                    onValueChange = { onUpdate(row.copy(unitPrice = it)) },
                    label = { Text("Unit Price") },
                    modifier = Modifier.weight(1.2f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = row.gstRate,
                    onValueChange = { onUpdate(row.copy(gstRate = it)) },
                    label = { Text("GST%") },
                    modifier = Modifier.weight(0.8f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        }
    }
}

data class ReturnItemRow(
    val description: String = "",
    val qty: String = "1",
    val unitPrice: String = "",
    val gstRate: String = "0"
)
