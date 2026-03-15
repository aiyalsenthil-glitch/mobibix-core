package com.aiyal.mobibix.ui.features.quotations

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuotationDetailScreen(
    shopId: String,
    quotationId: String,
    navController: NavController,
    viewModel: QuotationViewModel = hiltViewModel()
) {
    val state by viewModel.detailState.collectAsState()
    var menuExpanded by remember { mutableStateOf(false) }
    var showConvertDialog by remember { mutableStateOf(false) }

    LaunchedEffect(quotationId) { viewModel.loadQuotation(shopId, quotationId) }

    // Navigate after conversion
    LaunchedEffect(state.convertedInvoiceId) {
        state.convertedInvoiceId?.let { id ->
            navController.navigate("invoice_details/$shopId/$id")
        }
    }

    if (showConvertDialog) {
        AlertDialog(
            onDismissRequest = { showConvertDialog = false },
            title = { Text("Convert Quotation") },
            text = { Text("Convert this quotation to an invoice? This will mark the quotation as CONVERTED.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.convertToInvoice(shopId, quotationId)
                        showConvertDialog = false
                    },
                    enabled = !state.converting
                ) {
                    if (state.converting) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    else Text("Convert to Invoice")
                }
            },
            dismissButton = { OutlinedButton(onClick = { showConvertDialog = false }) { Text("Cancel") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.quotation?.quotationNumber ?: "Quotation", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    state.quotation?.let { q ->
                        if (q.status == "DRAFT" || q.status == "SENT") {
                            Box {
                                IconButton(onClick = { menuExpanded = true }) {
                                    Icon(Icons.Default.MoreVert, contentDescription = "Actions")
                                }
                                DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                                    if (q.status == "DRAFT") {
                                        DropdownMenuItem(text = { Text("Mark as Sent") }, onClick = {
                                            menuExpanded = false
                                            viewModel.updateStatus(shopId, quotationId, "SENT")
                                        })
                                    }
                                    DropdownMenuItem(text = { Text("Accept") }, onClick = {
                                        menuExpanded = false
                                        viewModel.updateStatus(shopId, quotationId, "ACCEPTED")
                                    })
                                    DropdownMenuItem(text = { Text("Convert to Invoice") }, onClick = {
                                        menuExpanded = false
                                        showConvertDialog = true
                                    })
                                    DropdownMenuItem(text = { Text("Reject", color = MaterialTheme.colorScheme.error) }, onClick = {
                                        menuExpanded = false
                                        viewModel.updateStatus(shopId, quotationId, "REJECTED")
                                    })
                                    DropdownMenuItem(text = { Text("Delete", color = MaterialTheme.colorScheme.error) }, onClick = {
                                        menuExpanded = false
                                        viewModel.delete(shopId, quotationId) { navController.popBackStack() }
                                    })
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            state.error != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
            state.quotation != null -> {
                val q = state.quotation!!
                val statusColor = when (q.status) {
                    "DRAFT" -> Color(0xFFF59E0B)
                    "SENT" -> Color(0xFF3B82F6)
                    "ACCEPTED" -> Color(0xFF00C896)
                    "REJECTED" -> MaterialTheme.colorScheme.error
                    "EXPIRED" -> Color(0xFF6B7280)
                    "CONVERTED" -> Color(0xFF8B5CF6)
                    else -> MaterialTheme.colorScheme.primary
                }
                LazyColumn(
                    modifier = Modifier.padding(padding).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text(q.quotationNumber, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                                        Text(q.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 11.sp, color = statusColor, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                                HorizontalDivider()
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Customer", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(q.customerName, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                }
                                if (q.customerPhone != null) Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Phone", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(q.customerPhone, fontSize = 13.sp)
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Date", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(q.quotationDate.take(10), fontSize = 13.sp)
                                }
                                if (q.expiryDate != null) Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Valid Until", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(q.expiryDate.take(10), fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    // Items
                    q.items?.let { itemList ->
                        item { Text("Items", fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                        items(itemList) { item ->
                            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
                                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.description, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                        Text("${item.quantity} × ₹${String.format("%.2f", item.price)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text("₹${String.format("%.2f", item.totalAmount)}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    // Totals
                    item {
                        Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Subtotal", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("₹${String.format("%.2f", q.subTotal)}", fontSize = 13.sp)
                                }
                                if (q.gstAmount > 0) Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("GST", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("₹${String.format("%.2f", q.gstAmount)}", fontSize = 13.sp)
                                }
                                HorizontalDivider()
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Total", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    Text("₹${String.format("%.2f", q.totalAmount)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }

                    if (q.notes != null) {
                        item {
                            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Notes", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.height(4.dp))
                                    Text(q.notes, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    // Convert button for ACCEPTED quotations
                    if (q.status == "ACCEPTED") {
                        item {
                            Button(
                                onClick = { showConvertDialog = true },
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) { Text("Convert to Invoice", fontWeight = FontWeight.SemiBold) }
                        }
                    }
                }
            }
        }
    }
}
