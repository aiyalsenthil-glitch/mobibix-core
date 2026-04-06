package com.aiyal.mobibix.ui.features.creditnotes

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
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
 * - Supports customer search autocomplete
 * - Entering an invoice number auto-populates return items from that invoice
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesReturnScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: CreditNoteViewModel = hiltViewModel()
) {
    val state by viewModel.createState.collectAsState()
    val customerSearch by viewModel.customerSearch.collectAsState()
    val invoiceLookup by viewModel.invoiceLookup.collectAsState()
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState(initial = null)

    var customerId by remember { mutableStateOf<String?>(null) }
    var customerQuery by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var invoiceNumberInput by remember { mutableStateOf("") }
    var linkedInvoiceId by remember { mutableStateOf<String?>(null) }
    var returnReason by remember { mutableStateOf("") }
    var items by remember { mutableStateOf(listOf(ReturnItemRow())) }

    // When invoice lookup succeeds, pre-fill items
    LaunchedEffect(invoiceLookup.invoice) {
        val inv = invoiceLookup.invoice ?: return@LaunchedEffect
        linkedInvoiceId = inv.id
        val populated = inv.items.map { item ->
            ReturnItemRow(
                description = item.productName ?: item.shopProductId,
                shopProductId = item.shopProductId,
                qty = item.quantity.toString(),
                unitPrice = item.rate.toString(),
                gstRate = (item.gstRate ?: 0.0).toString()
            )
        }
        if (populated.isNotEmpty()) items = populated
        // Pre-fill customer name if not already set
        if (customerQuery.isBlank() && inv.customerName != null) {
            customerQuery = inv.customerName
        }
    }

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
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
                            fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF00C896)
                        )
                    }
                    Text(
                        "Enter invoice number to auto-fill items. Credit note will be issued to the customer.",
                        fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Invoice Number (lookup first)
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Original Invoice", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    OutlinedTextField(
                        value = invoiceNumberInput,
                        onValueChange = { input ->
                            invoiceNumberInput = input
                            linkedInvoiceId = null
                            viewModel.lookupInvoice(activeShopId ?: "", input)
                        },
                        label = { Text("Invoice Number") },
                        placeholder = { Text("e.g. MB-S-25-001") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        trailingIcon = {
                            if (invoiceLookup.loading) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            } else if (linkedInvoiceId != null) {
                                Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF00C896))
                            }
                        }
                    )
                    when {
                        invoiceLookup.error != null -> Text(
                            invoiceLookup.error!!, fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.error
                        )
                        linkedInvoiceId != null -> Text(
                            "✓ Invoice found — items pre-filled below", fontSize = 11.sp,
                            color = Color(0xFF00C896)
                        )
                    }
                }
            }

            // Customer Info
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Customer Details", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)

                    // Customer search
                    Box {
                        OutlinedTextField(
                            value = customerQuery,
                            onValueChange = { q ->
                                customerQuery = q
                                customerId = null
                                viewModel.searchCustomers(q)
                            },
                            label = { Text("Customer Name *") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                            trailingIcon = {
                                if (customerSearch.loading) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                } else if (customerId != null) {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF00C896))
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )
                        if (customerSearch.results.isNotEmpty()) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 58.dp),
                                shape = RoundedCornerShape(10.dp),
                                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                            ) {
                                Column {
                                    customerSearch.results.forEach { c ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    customerId = c.id
                                                    customerQuery = c.name
                                                    customerPhone = c.phone ?: ""
                                                    viewModel.clearCustomerSearch()
                                                }
                                                .padding(horizontal = 12.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Icon(Icons.Default.Person, contentDescription = null,
                                                modifier = Modifier.size(16.dp),
                                                tint = MaterialTheme.colorScheme.primary)
                                            Column {
                                                Text(c.name, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                                if (!c.phone.isNullOrBlank()) {
                                                    Text(c.phone, fontSize = 11.sp,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                            }
                                        }
                                        HorizontalDivider()
                                    }
                                }
                            }
                        }
                    }

                    OutlinedTextField(
                        value = customerPhone,
                        onValueChange = { customerPhone = it },
                        label = { Text("Phone (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        shape = RoundedCornerShape(10.dp)
                    )
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
                        minLines = 2, maxLines = 4,
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            }

            if (state.error != null) {
                Card(
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Text(state.error!!, modifier = Modifier.padding(12.dp),
                        color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
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
                            shopProductId = row.shopProductId,
                            description = row.description,
                            quantity = qty,
                            rate = price,
                            gstRate = gst,
                            gstAmount = price * qty * gst / 100.0,
                            lineTotal = price * qty * (1 + gst / 100.0),
                            restockItem = true
                        )
                    }
                    viewModel.createSalesReturn(
                        shopId = shopId,
                        customerId = customerId,
                        customerName = customerQuery,
                        customerPhone = customerPhone.takeIf { it.isNotBlank() },
                        linkedInvoiceId = linkedInvoiceId,
                        notes = returnReason.takeIf { it.isNotBlank() },
                        items = creditItems
                    )
                },
                enabled = customerQuery.isNotBlank() && items.any { it.description.isNotBlank() } && !state.loading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C896))
            ) {
                if (state.loading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
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
                        Icon(Icons.Default.Close, contentDescription = "Remove",
                            tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
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
    val shopProductId: String? = null,
    val qty: String = "1",
    val unitPrice: String = "",
    val gstRate: String = "0"
)
